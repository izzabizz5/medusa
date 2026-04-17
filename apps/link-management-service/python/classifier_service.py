"""
Medusa URL Classifier Sidecar
Scores URLs as good (likely contains relevant photos to scan) or bad.

Cold start: rule-based scoring using domain/path heuristics.
After >= MIN_TRAIN_EXAMPLES labeled URLs exist: switches to a trained
scikit-learn LogisticRegression model.

Endpoints:
  GET  /health
  POST /classify   { urls: [string] }  -> [{ url, score, is_good }]
  POST /train      { examples: [{url, is_good}] }  -> { ok, model_type, n_examples }
"""

import os
import re
import math
import logging
import pickle
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MODEL_PATH = Path(os.getenv("CLASSIFIER_MODEL_PATH", "./models/url_classifier.pkl"))
MIN_TRAIN_EXAMPLES = int(os.getenv("CLASSIFIER_MIN_TRAIN", "10"))
GOOD_THRESHOLD = float(os.getenv("CLASSIFIER_GOOD_THRESHOLD", "0.60"))
PORT = int(os.getenv("CLASSIFIER_PORT", "8090"))

MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Domain knowledge: known platforms & patterns
# ---------------------------------------------------------------------------
KNOWN_POSITIVE_DOMAINS = {
    "reddit.com", "www.reddit.com",
    "pinterest.com", "www.pinterest.com", "in.pinterest.com",
    "instagram.com", "www.instagram.com",
    "imgur.com", "i.imgur.com",
    "flickr.com", "www.flickr.com",
    "tumblr.com",
    "onlyfans.com",
    "fapello.com", "thothub.to", "erome.com",
    "xhamster.com", "xvideos.com", "redtube.com",
    "bunkr.si", "bunkr.su", "cyberdrop.me",
    "coomer.party", "kemono.party", "x.com"
}

KNOWN_NEGATIVE_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "twitter.com",
    "linkedin.com", "wikipedia.org", "amazon.com",
    "github.com", "stackoverflow.com", "medium.com",
    "cnn.com", "bbc.com", "nytimes.com", "theguardian.com",
    "forbes.com", "techcrunch.com", "wired.com",
    "gov", "edu",
}

PHOTO_PATH_KEYWORDS = {
    "photo", "photos", "pic", "pics", "picture", "pictures",
    "gallery", "galleries", "album", "albums",
    "image", "images", "img", "media",
    "nude", "naked", "nsfw", "explicit", "leaked",
    "onlyfans", "fansly", "patreon",
    "model", "models",
}

NEGATIVE_PATH_KEYWORDS = {
    "login", "signin", "signup", "register", "account",
    "privacy", "terms", "about", "contact", "help",
    "sitemap", "robots", "ads", "advertis",
    "news", "article", "blog", "tag", "category",
}

# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def extract_features(url: str) -> dict:
    """Extract numeric and categorical features from a URL string."""
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
    except Exception:
        return _empty_features()

    domain = (parsed.netloc or "").lower().lstrip("www.")
    path = (parsed.path or "").lower()
    path_segments = [s for s in path.split("/") if s]

    # Domain checks
    is_known_positive = domain in KNOWN_POSITIVE_DOMAINS
    is_known_negative = any(neg in domain for neg in KNOWN_NEGATIVE_DOMAINS)

    # Path keyword checks
    path_text = " ".join(path_segments)
    has_photo_kw = any(kw in path_text for kw in PHOTO_PATH_KEYWORDS)
    has_negative_kw = any(kw in path_text for kw in NEGATIVE_PATH_KEYWORDS)

    # Domain parts
    domain_parts = domain.split(".")
    tld = domain_parts[-1] if domain_parts else ""
    sld = domain_parts[-2] if len(domain_parts) >= 2 else ""

    # Structural features
    path_depth = len(path_segments)
    has_number_segment = any(re.fullmatch(r"\d+", s) for s in path_segments)
    url_length = len(url)

    # SLD contains photo/model keywords
    sld_is_photo_related = any(kw in sld for kw in PHOTO_PATH_KEYWORDS)

    return {
        "is_known_positive": is_known_positive,
        "is_known_negative": is_known_negative,
        "has_photo_kw": has_photo_kw,
        "has_negative_kw": has_negative_kw,
        "path_depth": min(path_depth, 10),
        "has_number_segment": has_number_segment,
        "url_length": min(url_length, 300),
        "sld_is_photo_related": sld_is_photo_related,
        "tld_common": tld in ("com", "net", "org", "io"),
        # Full URL text (used by TF-IDF in ML model)
        "_url_text": re.sub(r"https?://", "", url).lower(),
    }

def _empty_features() -> dict:
    return {
        "is_known_positive": False, "is_known_negative": False,
        "has_photo_kw": False, "has_negative_kw": False,
        "path_depth": 0, "has_number_segment": False,
        "url_length": 0, "sld_is_photo_related": False,
        "tld_common": False, "_url_text": "",
    }

# ---------------------------------------------------------------------------
# Rule-based scorer (cold start)
# ---------------------------------------------------------------------------

def rule_based_score(features: dict) -> float:
    if features["is_known_negative"]:
        return 0.05
    if features["is_known_positive"]:
        return 0.90
    score = 0.30  # baseline for unknown domain
    if features["sld_is_photo_related"]:
        score += 0.25
    if features["has_photo_kw"]:
        score += 0.20
    if features["has_negative_kw"]:
        score -= 0.15
    if features["has_number_segment"]:
        score += 0.05  # IDs in path → actual content pages
    return max(0.0, min(1.0, score))

# ---------------------------------------------------------------------------
# ML model (trained when enough data)
# ---------------------------------------------------------------------------

_model = None  # holds (pipeline, model_type) tuple

def _load_model():
    global _model
    if MODEL_PATH.exists():
        try:
            with open(MODEL_PATH, "rb") as f:
                _model = pickle.load(f)
            logger.info(f"Loaded classifier model from {MODEL_PATH}")
        except Exception as e:
            logger.warning(f"Failed to load model: {e}")
            _model = None

def _save_model(model):
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    logger.info(f"Classifier model saved to {MODEL_PATH}")

def _train_ml_model(examples: list[dict]) -> object:
    """Train a scikit-learn pipeline on labeled URL examples."""
    from sklearn.pipeline import Pipeline, FeatureUnion
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    from sklearn.base import BaseEstimator, TransformerMixin
    import numpy as np

    class NumericFeatureExtractor(BaseEstimator, TransformerMixin):
        NUMERIC_KEYS = [
            "is_known_positive", "is_known_negative", "has_photo_kw",
            "has_negative_kw", "path_depth", "has_number_segment",
            "url_length", "sld_is_photo_related", "tld_common",
        ]
        def fit(self, X, y=None): return self
        def transform(self, X):
            return np.array([[float(row.get(k, 0)) for k in self.NUMERIC_KEYS] for row in X])

    class TextExtractor(BaseEstimator, TransformerMixin):
        def fit(self, X, y=None): return self
        def transform(self, X): return [row.get("_url_text", "") for row in X]

    features = [extract_features(ex["url"]) for ex in examples]
    labels = [1 if ex["is_good"] else 0 for ex in examples]

    pipeline = Pipeline([
        ("features", FeatureUnion([
            ("tfidf", Pipeline([
                ("text", TextExtractor()),
                ("vec", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=2000)),
            ])),
            ("numeric", NumericFeatureExtractor()),
        ])),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=500, C=1.0)),
    ])

    pipeline.fit(features, labels)
    logger.info(f"Trained ML classifier on {len(examples)} examples")
    return pipeline

def ml_score(features: dict, model) -> float:
    try:
        proba = model.predict_proba([features])[0]
        return float(proba[1])  # probability of class=1 (good)
    except Exception as e:
        logger.warning(f"ML score failed, falling back to rules: {e}")
        return rule_based_score(features)

def score_url(url: str) -> float:
    features = extract_features(url)
    if _model is not None:
        return ml_score(features, _model)
    return rule_based_score(features)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Medusa URL Classifier")

class ClassifyRequest(BaseModel):
    urls: list[str]

class ClassifyResult(BaseModel):
    url: str
    score: float
    is_good: bool

class TrainRequest(BaseModel):
    examples: list[dict]  # [{url: str, is_good: bool}]

class TrainResponse(BaseModel):
    ok: bool
    model_type: str
    n_examples: int
    message: str

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_type": "ml" if _model is not None else "rule_based",
        "model_path": str(MODEL_PATH),
    }

@app.post("/classify", response_model=list[ClassifyResult])
def classify(req: ClassifyRequest) -> list[ClassifyResult]:
    results = []
    for url in req.urls:
        s = score_url(url)
        results.append(ClassifyResult(url=url, score=round(s, 4), is_good=s >= GOOD_THRESHOLD))
    return results

@app.post("/train", response_model=TrainResponse)
def train(req: TrainRequest) -> TrainResponse:
    global _model
    examples = req.examples
    n = len(examples)

    if n < MIN_TRAIN_EXAMPLES:
        return TrainResponse(
            ok=False,
            model_type="rule_based",
            n_examples=n,
            message=f"Need at least {MIN_TRAIN_EXAMPLES} examples, got {n}. Still using rule-based scorer.",
        )

    # Augment with rule-based labels for unknown URLs to bootstrap training
    try:
        model = _train_ml_model(examples)
        _model = model
        _save_model(model)
        return TrainResponse(ok=True, model_type="ml", n_examples=n, message="Model trained and saved.")
    except Exception as e:
        logger.error(f"Training failed: {e}")
        return TrainResponse(ok=False, model_type="rule_based", n_examples=n, message=str(e))


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
_load_model()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
