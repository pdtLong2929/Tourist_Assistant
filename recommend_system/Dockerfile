FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for geo-libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    libgdal-dev \
    gdal-bin \
    libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Serialize raw CSV graphs into compressed binary files (.pkl.gz) at build time,
# then clean up heavy raw CSVs to keep the production image highly compact.
RUN python data/serialize_graphs.py && \
    rm -f data/NodesnEdges/Nodes/*.csv data/NodesnEdges/Edges/*.csv

# Expose the API port
EXPOSE 8000

# Run uvicorn, dynamically binding to the PORT environment variable for Cloud Run compatibility
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
