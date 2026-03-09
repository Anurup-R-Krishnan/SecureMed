FROM python:3.12-slim

WORKDIR /app

ENV PIP_DEFAULT_TIMEOUT=180 \
    PIP_RETRIES=10

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libjpeg62-turbo-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN groupadd -g 1000 app && useradd -m -u 1000 -g 1000 app \
    && mkdir -p /app/media /app/staticfiles \
    && chmod +x /app/scripts/start_backend.sh \
    && chown -R app:app /app

EXPOSE 8000

CMD ["/app/scripts/start_backend.sh"]
