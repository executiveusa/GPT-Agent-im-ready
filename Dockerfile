# GPT-Agent-im-ready (Pauli's Place)
FROM python:3.11-slim AS server

WORKDIR /app/server

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ .

EXPOSE 5000

# --- Client build stage ---
FROM node:20-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ .
RUN npm run build

# --- Final stage ---
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends nginx && rm -rf /var/lib/apt/lists/*

# Copy server
COPY --from=server /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY server/ ./server/

# Copy client build
COPY --from=client-builder /app/client/build /usr/share/nginx/html

EXPOSE 5000 80

CMD ["python", "server/paulis_place.py"]
