FROM python:3.11-slim

# graphviz provides the `dot` binary used to draw the slide-20 priority flowchart.
# libreoffice-impress provides the `soffice` binary used to convert the
# generated .pptx to .pdf for the "Export as PDF" option (headless, no GUI).
RUN apt-get update && apt-get install -y --no-install-recommends graphviz libreoffice-impress \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV UPLOAD_DIR=/app/uploads
RUN mkdir -p /app/uploads

EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
