"""
Medusa Scanning Service - Python FastAPI Sidecar
Wraps InsightFace ArcFace (buffalo_l model) for face embedding extraction.
Called by the NestJS scanning-service via localhost HTTP.
"""

import os
import io
import logging
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

# --- InsightFace setup ---
try:
    import insightface
    from insightface.app import FaceAnalysis

    INSIGHTFACE_MODEL = os.getenv("INSIGHTFACE_MODEL", "buffalo_l")
    face_app = FaceAnalysis(
        name=INSIGHTFACE_MODEL,
        providers=["CPUExecutionProvider"],
    )
    face_app.prepare(ctx_id=-1, det_size=(640, 640))
    logger.info(f"InsightFace model '{INSIGHTFACE_MODEL}' loaded successfully")
    INSIGHTFACE_AVAILABLE = True
except Exception as e:
    logger.warning(f"InsightFace not available: {e}. Falling back to DeepFace.")
    INSIGHTFACE_AVAILABLE = False

# --- S3 / Object Storage client ---
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
    error: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "insightface": INSIGHTFACE_AVAILABLE}


@app.post("/embed", response_model=EmbedResponse)
async def embed_image(req: EmbedRequest) -> EmbedResponse:
    """
    Extract face embedding from an image.
    Accepts either a storage_key (S3 object) or an image_url (direct URL).
    Returns the 512-dimensional ArcFace embedding vector of the primary face.
    """
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
    """Batch embedding for multiple images."""
    results = []
    for req in requests:
        result = await embed_image(req)
        results.append(result)
    return results


def embed_with_insightface(img_array: np.ndarray) -> EmbedResponse:
    faces = face_app.get(img_array)
    if not faces:
        return EmbedResponse(has_face=False, face_count=0, model_name=f"insightface-{INSIGHTFACE_MODEL}")

    # Use the largest face (most likely the subject)
    primary = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    vector = primary.embedding.tolist()

    return EmbedResponse(
        has_face=True,
        face_count=len(faces),
        vector=vector,
        model_name=f"insightface-{INSIGHTFACE_MODEL}",
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
            return EmbedResponse(
                has_face=True,
                face_count=len(result),
                vector=result[0]["embedding"],
                model_name="deepface-arcface",
            )
    except Exception as e:
        logger.warning(f"DeepFace failed: {e}")

    return EmbedResponse(has_face=False, face_count=0, model_name="deepface-arcface")


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
