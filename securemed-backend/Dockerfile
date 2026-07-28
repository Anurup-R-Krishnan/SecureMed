FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PIP_DEFAULT_TIMEOUT=180 \
    PIP_RETRIES=10

# We skip apt-get installs because of network restrictions in this build environment.
# Assuming requirements.txt uses binary packages.
RUN echo "Skipping apt updates due to environment constraints"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN groupadd -g 1000 app && useradd -m -u 1000 -g 1000 app \
    && mkdir -p /app/media /app/staticfiles \
    && chmod +x /app/scripts/start_backend.sh \
    && chown -R app:app /app

USER app
EXPOSE 8000

CMD ["/app/scripts/start_backend.sh"]
