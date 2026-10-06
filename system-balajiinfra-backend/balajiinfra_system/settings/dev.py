from .base import *
import os

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

# Parse CSRF_TRUSTED_ORIGINS properly from env
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

# Fallback cache for local development if Redis is not configured
if not os.getenv("REDIS_URL"):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "dev-cache",
        }
    }