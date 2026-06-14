FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./
COPY data ./data

EXPOSE 5004

ENV PORT=5004
ENV HOST=0.0.0.0

CMD ["python", "main.py"]
