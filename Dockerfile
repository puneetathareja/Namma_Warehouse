# Multi-stage build for Namma Warehouse (Turnkey Production Deployment)

# Stage 1: Build React/Vite frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python FastAPI Application
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, geospatial datasets, and compiled frontend bundle
COPY backend/ ./backend/
COPY ["City data", "./City data/"]
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set production environment defaults
ENV PORT=8000
ENV HOST=0.0.0.0
ENV ENVIRONMENT=production

EXPOSE 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Run FastAPI backend (automatically serves the compiled React SPA at /)
CMD ["python", "backend/app.py"]
