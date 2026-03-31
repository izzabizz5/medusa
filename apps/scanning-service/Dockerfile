# Multi-stage: Node.js + Python (GPU image)
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04 AS base

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

# Install Python + pip
RUN apt-get install -y python3 python3-pip python3-dev \
    libgl1-mesa-glx libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY apps/scanning-service/python/requirements.txt ./python/requirements.txt
RUN pip3 install --no-cache-dir -r python/requirements.txt

# Node deps
COPY package*.json ./
COPY apps/scanning-service/package*.json ./apps/scanning-service/
COPY libs/shared/package*.json ./libs/shared/
RUN npm install --workspace=apps/scanning-service --workspace=libs/shared

# Copy source
COPY . .
RUN npm run build --workspace=apps/scanning-service

ENV NODE_ENV=production
ENV AUTO_START_PYTHON=true

EXPOSE 4004 8080
CMD ["node", "dist/apps/scanning-service/main"]
