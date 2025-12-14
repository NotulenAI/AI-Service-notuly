# API Endpoints Documentation

Server Hono dengan 3 router utama untuk AI services.

## 1. Summaries Endpoint

**POST** `/summaries`

Membuat ringkasan dari file teks yang diupload.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (txt file)

**Response:**
```json
{
  "success": true,
  "summary": "Generated summary text...",
  "originalLength": 346,
  "summaryLength": 120
}
```

**Contoh penggunaan dengan curl:**
```bash
curl -X POST -F "file=@your_file.txt" http://localhost:3000/summaries
```

## 2. Summaries Chunk Endpoint  

**POST** `/summaries-chunk`

Membuat ringkasan dengan memecah file menjadi chunk-chunk kecil, meringkas setiap chunk secara paralel, lalu menggabungkan semua ringkasan.

**Request:**
- Method: POST
- Content-Type: multipart/form-data  
- Body: file (txt file)

**Response:**
```json
{
  "success": true,
  "totalChunks": 3,
  "individualSummaries": [
    "Summary of chunk 1...",
    "Summary of chunk 2...",
    "Summary of chunk 3..."
  ],
  "finalSummary": "Combined final summary...",
  "originalLength": 346
}
```

**Contoh penggunaan dengan curl:**
```bash
curl -X POST -F "file=@your_file.txt" http://localhost:3000/summaries-chunk
```

## 3. RAG Endpoint

**POST** `/rag`

Retrieval-Augmented Generation endpoint untuk menjawab pertanyaan berdasarkan knowledge base yang tersimpan di vector database.

**Request:**
- Method: POST
- Content-Type: application/json
- Body: 
```json
{
  "message": "Pertanyaan anda disini"
}
```

**Response:**
```json
{
  "success": true,
  "query": "Pertanyaan anda disini",
  "answer": "Generated answer based on RAG..."
}
```

**Contoh penggunaan dengan curl:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Siapa host podcast tersebut?"}' \
  http://localhost:3000/rag
```

## Menjalankan Server

```bash
cd typescript-bun
bun run src/index.ts
```

Server akan berjalan di `http://localhost:3000`

## Endpoint Lainnya

- `GET /` - Hello world
- `GET /openapi.json` - OpenAPI spec
- `GET /reference` - API reference UI