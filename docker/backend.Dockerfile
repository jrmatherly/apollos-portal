# --- Stage 1: Build ---
FROM python:3.12-slim@sha256:2f17fc044b579bab302c2e8054d3a686e2cb9a83de48e70534b94cd8ebbe06a9 AS builder

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.12.17@sha256:10787c682e4184e4f290de1171fd4703dc63de99221f10fe1c99002ce7fa9acc /uv /usr/local/bin/uv

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

# Copy workspace root files for dependency resolution
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml backend/pyproject.toml

# Install dependencies (cached layer)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-workspace --package apollos-portal-backend

# Copy backend source
COPY backend/ backend/

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --package apollos-portal-backend

# --- Stage 2: Runtime ---
FROM python:3.12-slim@sha256:2f17fc044b579bab302c2e8054d3a686e2cb9a83de48e70534b94cd8ebbe06a9

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# uv is needed for dev mode (docker-compose command override uses `uv run`)
COPY --from=ghcr.io/astral-sh/uv:0.12.17@sha256:10787c682e4184e4f290de1171fd4703dc63de99221f10fe1c99002ce7fa9acc /uv /usr/local/bin/uv

# Copy workspace root files (needed for uv workspace resolution)
COPY pyproject.toml uv.lock ./

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy backend source
COPY backend/ backend/

ENV PATH="/app/.venv/bin:$PATH"

RUN useradd --create-home --shell /bin/bash appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "backend"]
