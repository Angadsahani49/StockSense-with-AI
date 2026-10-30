# StockSense AI - Containerized Deployment
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source and build web assets
COPY . .
RUN npm run build

# Production image
FROM node:20-slim

WORKDIR /app

# Install Python and scientific packages for optional ML execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-pandas \
    python3-numpy \
    python3-sklearn \
    python3-joblib \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/models ./models
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/*.py ./
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npx", "tsx", "server.ts"]
