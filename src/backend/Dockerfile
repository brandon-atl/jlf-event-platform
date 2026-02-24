FROM python:3.13-slim

WORKDIR /app

# Install system deps for psycopg2/asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run migrations then start server
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
