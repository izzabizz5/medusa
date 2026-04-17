"""
Medusa Scanning Service - Python FastAPI Sidecar

Face embedding pipeline:
  1. Face Detection   — RetinaFace (via InsightFace det model)
  2. Face Alignment   — 5-point landmark affine warp → 112x112 normalized crop
  3. Face Embedding   — ArcFace (w600k_r50) → 512-dim L2-normalized vector

Called by the NestJS scanning-service via localhost HTTP.
"""

import os
import io
import logging
import time
from typing import Optional
import numpy as np
import cv2
from PIL import Image
import httpx
import boto3
from botocore.config import Config
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────
MIN_FACE_SIZE = int(os.getenv("MIN_FACE_SIZE", "40"))        # px — skip tiny faces
MIN_DET_SCORE = float(os.getenv("MIN_DET_SCORE", "0.5"))     # detection confidence
MAX_IMAGE_DIM = int(os.getenv("MAX_IMAGE_DIM", "1280"))       # downscale limit
DET_SIZE_STR  = os.getenv("DET_SIZE", "640,640")               # detection input size

# ── InsightFace setup ──────────────────────────────────────────
try:
    import insightface
    from insightface.app import FaceAnalysis
    from insightface.utils.face_align import norm_crop

    INSIGHTFACE_MODEL = os.getenv("INSIGHTFACE_MODEL", "buffalo_l")
    face_app = FaceAnalysis(
        name=INSIGHTFACE_MODEL,
        providers=["CPUExecutionProvider"],
    )
    DET_SIZE = tuple(int(x) for x in DET_SIZE_STR.split(","))
    face_app.prepare(ctx_id=-1, det_size=DET_SIZE)
    logger.info(
        f"InsightFace '{INSIGHTFACE_MODEL}' loaded — det_size={DET_SIZE}, "
        f"min_face={MIN_FACE_SIZE}px, min_score={MIN_DET_SCORE}"
    )
    INSIGHTFACE_AVAILABLE = True
except Exception as e:
    logger.warning(f"InsightFace not available: {e}. Falling back to DeepFace.")
    INSIGHTFACE_AVAILABLE = False

# ── S3 / Object Storage client ─────────────────────────────────
s3_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("OBJECT_STORAGE_ENDPOINT"),
    aws_access_key_id=os.getenv("OBJECT_STORAGE_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("OBJECT_STORAGE_SECRET_KEY"),
    region_name=os.getenv("OBJECT_STORAGE_REGION", "us-ashburn-1"),
    config=Config(signature_version="s3v4"),
)
BUCKET = os.getenv("OBJECT_STORAGE_BUCKET", "medusa-files")

app = FastAPI(title="Medusa Face Embedding Sidecar")


class EmbedRequest(BaseModel):
    storage_key: Optional[str] = None
    image_url: Optional[str] = None


class EmbedResponse(BaseModel):
    has_face: bool
    face_count: int
    vector: Optional[list[float]] = None
    model_name: str
    det_score: Optional[float] = None
    face_size: Optional[int] = None
    error: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "insightface": INSIGHTFACE_AVAILABLE, "model": os.getenv("INSIGHTFACE_MODEL", "buffalo_l")}


@app.post("/embed", response_model=EmbedResponse)
async def embed_image(req: EmbedRequest) -> EmbedResponse:
    try:
        img_bytes = await load_image_bytes(req.storage_key, req.image_url)
        if not img_bytes:
            raise HTTPException(status_code=400, detail="No image source provided")

        img_array = bytes_to_cv2(img_bytes)
        if img_array is None:
            return EmbedResponse(has_face=False, face_count=0, model_name="none", error="Could not decode image")

        if INSIGHTFACE_AVAILABLE:
            return embed_with_insightface(img_array)
        else:
            return embed_with_deepface(img_bytes)

    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return EmbedResponse(has_face=False, face_count=0, model_name="none", error=str(e))


@app.post("/embed-batch")
async def embed_batch(requests: list[EmbedRequest]) -> list[EmbedResponse]:
    results = []
    for req in requests:
        result = await embed_image(req)
        results.append(result)
    return results


# ── Core pipeline ──────────────────────────────────────────────

def _downscale(img: np.ndarray) -> np.ndarray:
    """Downscale oversized images to MAX_IMAGE_DIM while preserving aspect ratio."""
    h, w = img.shape[:2]
    if max(h, w) <= MAX_IMAGE_DIM:
        return img
    scale = MAX_IMAGE_DIM / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _face_area(face) -> int:
    """Bounding box area in pixels."""
    bbox = face.bbox
    return int((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))


def _face_dim(face) -> int:
    """Longest side of the bounding box."""
    bbox = face.bbox
    return int(max(bbox[2] - bbox[0], bbox[3] - bbox[1]))


def _l2_normalize(vec: np.ndarray) -> np.ndarray:
    """L2-normalize embedding vector — required for cosine similarity comparisons."""
    norm = np.linalg.norm(vec)
    if norm < 1e-10:
        return vec
    return vec / norm


def embed_with_insightface(img_array: np.ndarray) -> EmbedResponse:
    t0 = time.time()
    model_name = f"insightface-{INSIGHTFACE_MODEL}"

    # ── Step 0: Downscale oversized images ──
    img_array = _downscale(img_array)

    # ── Step 1: Face Detection (RetinaFace) ──
    # face_app.get() internally runs:
    #   - RetinaFace detector → bounding boxes + 5-point landmarks + confidence scores
    #   - For each detected face:
    #     ── Step 2: Face Alignment ──
    #     - 5-point landmark affine transform → 112×112 normalized crop
    #     ── Step 3: Face Embedding (ArcFace w600k_r50) ──
    #     - Forward pass through recognition network → 512-dim vector
    faces = face_app.get(img_array)

    if not faces:
        logger.debug(f"No faces detected ({time.time()-t0:.2f}s)")
        return EmbedResponse(has_face=False, face_count=0, model_name=model_name)

    # ── Filter: minimum face size + detection confidence ──
    qualified = [
        f for f in faces
        if _face_dim(f) >= MIN_FACE_SIZE and f.det_score >= MIN_DET_SCORE
    ]

    if not qualified:
        logger.debug(
            f"{len(faces)} face(s) detected but none met quality threshold "
            f"(min {MIN_FACE_SIZE}px, min score {MIN_DET_SCORE})"
        )
        return EmbedResponse(has_face=False, face_count=len(faces), model_name=model_name)

    # Pick the largest qualified face (most likely the subject)
    primary = max(qualified, key=_face_area)

    # ── Step 4: L2 normalize the embedding ──
    raw_embedding = primary.embedding
    normalized = _l2_normalize(raw_embedding)
    vector = normalized.tolist()

    elapsed = time.time() - t0
    face_px = _face_dim(primary)
    logger.debug(
        f"Embedded: {len(qualified)}/{len(faces)} faces qualified, "
        f"primary={face_px}px, score={primary.det_score:.3f}, "
        f"{elapsed:.2f}s"
    )

    return EmbedResponse(
        has_face=True,
        face_count=len(qualified),
        vector=vector,
        model_name=model_name,
        det_score=round(float(primary.det_score), 4),
        face_size=face_px,
    )


def embed_with_deepface(img_bytes: bytes) -> EmbedResponse:
    """Fallback: DeepFace ArcFace backend."""
    try:
        from deepface import DeepFace
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name

        result = DeepFace.represent(
            img_path=tmp_path,
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=True,
        )
        os.unlink(tmp_path)

        if result:
            # L2-normalize DeepFace embedding too
            vec = np.array(result[0]["embedding"], dtype=np.float32)
            vec = _l2_normalize(vec).tolist()

            return EmbedResponse(
                has_face=True,
                face_count=len(result),
                vector=vec,
                model_name="deepface-arcface",
            )
    except Exception as e:
        logger.warning(f"DeepFace failed: {e}")

    return EmbedResponse(has_face=False, face_count=0, model_name="deepface-arcface")


# ── Image loading ──────────────────────────────────────────────

async def load_image_bytes(storage_key: Optional[str], image_url: Optional[str]) -> Optional[bytes]:
    if storage_key:
        try:
            response = s3_client.get_object(Bucket=BUCKET, Key=storage_key)
            return response["Body"].read()
        except Exception as e:
            logger.warning(f"S3 fetch failed for {storage_key}: {e}")

    if image_url:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(image_url, headers={"User-Agent": "MedusaBot/1.0"})
                r.raise_for_status()
                return r.content
        except Exception as e:
            logger.warning(f"URL fetch failed for {image_url}: {e}")

    return None


def bytes_to_cv2(img_bytes: bytes) -> Optional[np.ndarray]:
    try:
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Image decode failed: {e}")
        return None


if __name__ == "__main__":
    port = int(os.getenv("PYTHON_BRIDGE_PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
