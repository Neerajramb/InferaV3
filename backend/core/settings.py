from __future__ import annotations

import os
import sys
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in env(name, default).split(",") if item.strip()]


TESTING = "test" in sys.argv

SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-secure-rag-workspace-dev-key")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "rest_framework",
    "accounts",
    "workspace.apps.WorkspaceConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
        "OPTIONS": {"timeout": 20},
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Uploaded files are never served publicly; they are streamed through an
# authenticated endpoint (see DocumentDownloadView).
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.PresenceJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": env("LOGIN_THROTTLE_RATE", "10/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(env("JWT_ACCESS_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Only the dev frontend may call the API unless configured otherwise.
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", False)

MAX_UPLOAD_MB = int(env("MAX_UPLOAD_MB", "25"))
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_MB * 1024 * 1024

# --- Retrieval-augmented generation -------------------------------------------------

RAG_STORAGE_ROOT = BASE_DIR / ("rag_storage_test" if TESTING else "rag_storage")
RAG_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

# Indexing runs on a background thread so uploads return immediately.
RAG_ASYNC_INDEXING = env_bool("RAG_ASYNC_INDEXING", not TESTING)
RAG_TOP_K = int(env("RAG_TOP_K", "6"))

# "auto" uses sentence-transformers when available, otherwise a hashed
# bag-of-words embedding that still gives lexical similarity offline.
EMBEDDING_BACKEND = env("EMBEDDING_BACKEND", "hash" if TESTING else "auto")
EMBEDDING_MODEL_NAME = env("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")

# "auto" tries the local Ollama server and falls back to an extractive answer.
# "gemini" is opt-in only, because it sends retrieved text to Google.
LLM_PROVIDER = env("LLM_PROVIDER", "extractive" if TESTING else "auto").lower()
OLLAMA_URL = env("OLLAMA_URL", "http://127.0.0.1:11434").split("/api/")[0].rstrip("/")
OLLAMA_MODEL = env("OLLAMA_MODEL", "mistral")
LLM_TIMEOUT_SECONDS = int(env("LLM_TIMEOUT_SECONDS", "300"))
GEMINI_API_KEY = env("GEMINI_API_KEY", "")
GEMINI_MODEL = env("GEMINI_MODEL", "gemini-2.5-flash")

# Developer convenience: lets a signed-in user switch their own role to try
# each permission level. Never enable this in production.
ALLOW_ROLE_SWITCH = env_bool("ALLOW_ROLE_SWITCH", DEBUG)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "[{levelname}] {name}: {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "simple"}},
    "loggers": {
        "infera": {"handlers": ["console"], "level": env("INFERA_LOG_LEVEL", "INFO"), "propagate": False},
    },
}

if TESTING:
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
