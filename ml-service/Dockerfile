FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080 \
    MODEL_DIRECTORY=/tmp/artiva-models

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app --no-create-home app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir --requirement requirements.txt

COPY --chown=app:app app.py ./

USER app

EXPOSE 8080

CMD ["gunicorn", "--bind=0.0.0.0:8080", "--workers=1", "--threads=4", "--timeout=60", "--access-logfile=-", "--error-logfile=-", "app:app"]
