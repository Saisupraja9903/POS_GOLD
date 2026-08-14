FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY shared_domain /shared_domain
RUN pip install --no-cache-dir -e /shared_domain
COPY POS/POS-Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY POS/POS-Backend /app
EXPOSE 8100
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8100"]
