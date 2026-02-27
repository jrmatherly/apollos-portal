# --- Stage 1: Build ---
FROM python:3.12-slim AS builder

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.10.6 /uv /usr/local/bin/uv

ENV UV_LINK_MODE=copy

# Copy workspace root files for dependency resolution
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml backend/pyproject.toml

# Install dependencies (cached layer)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project --package apollos-portal-backend

# Copy backend source
COPY backend/ backend/

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --package apollos-portal-backend

# --- Stage 2: Runtime ---
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy backend source
COPY backend/ backend/

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "backend"]
