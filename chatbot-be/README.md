# start chromaDB
docker run -d --rm --name chromadb -p 8000:8000 \
  -v "$(pwd)/chroma-data":/chroma/chroma \
  -e IS_PERSISTENT=TRUE \
  -e ANONYMIZED_TELEMETRY=TRUE \
  chromadb/chroma:latest

# start app
uvicorn main:app --reload --port 8001