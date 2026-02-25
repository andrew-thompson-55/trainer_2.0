# --- Builder stage: install Python dependencies with layer caching ---
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies for packages with C extensions (cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy ONLY requirements first — this layer is cached until requirements.txt changes
COPY chimera_api/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Runtime stage: slim image with only what's needed ---
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy trainer packages (referenced by package_loader.py via ../packages/default)
COPY packages/ ./packages/

# Copy application code last (busts cache on every code change, but deps stay cached)
COPY chimera_api/ ./chimera_api/

WORKDIR /app/chimera_api

# Render injects PORT at runtime; default to 8000 for local testing
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
