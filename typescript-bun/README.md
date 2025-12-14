## TODO

```bash
bun install
bun run dev
```

```bash
open http://localhost:3000
open http://localhost:3000/reference # Scalar API Reference
```

## Deploy dengan Docker

1. Pastikan env tersedia (bisa lewat `--env-file .env`):
   - `MODEL` (contoh: `llama-3.1-8b-instruct`)
   - `RUNPOD_BASE_URL`
   - `RUNPOD_API_KEY`
   - `GROQ_API_KEY`

2. Build image:

```bash
docker build -t notuly-api .
```

1. Jalankan container:

```bash
docker run -p 3000:3000 --env-file .env notuly-api
```

## Sprint 1

Endpoint

- REST API summarizer
- REST API RAG

Note

- Dockerfile for deploy in VPS

## REST API SUMMARIZER

- Nrima input hasil transcript panjang
- jika tokennya melebihi batas, maka dilakukan chunk, jika pas maka sekali transcript, dipecah pecah
- Melakukan mekanisme chunk
- Mengirim output summarize

input transcript->

## REST API RAG

- Nrima input text
- Melakukan mekanisme RAG
- Mengirim hasil response berupa jawaban dan dalam bentuk streaming (transcript, embedding dan meeting id)