from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List
import os
from langchain_community.vectorstores.pgvector import PGVector
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

# Konfigurasi koneksi Postgres dari environment variable
PG_CONN_STRING = os.getenv("PG_CONN_STRING", "postgresql://user:password@localhost:5432/dbname")
COLLECTION_NAME = os.getenv("PG_COLLECTION", "langchain_docs")

# Inisialisasi embeddings dan vectorstore
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vectorstore = PGVector(
    connection_string=PG_CONN_STRING,
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
)

router = APIRouter(prefix="/retrieval", tags=["retrieval"])

"""
API Endpoint: POST /retrieval/
Request Body: {"query": str, "k": int (default=3)}
Response: {"results": List[str]}
Deskripsi: Melakukan semantic search/retrieval ke vectorstore Postgres menggunakan LangChain.
"""

class RetrievalRequest(BaseModel):
    query: str
    k: int = 3

class RetrievalResponse(BaseModel):
    results: List[str]

@router.post("/", response_model=RetrievalResponse)
def retrieve(request: RetrievalRequest):
    """
    POST /retrieval/
    Request: {"query": str, "k": int}
    Response: {"results": List[str]}
    Melakukan semantic search ke vectorstore Postgres.
    """
    try:
        docs: List[Document] = vectorstore.similarity_search(request.query, k=request.k)
        results = [doc.page_content for doc in docs]
        return RetrievalResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))