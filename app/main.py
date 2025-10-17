import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer  # security scheme
# from fastapi_mcp import FastApiMCP
from .routers import retrieval, summaries
from .logger import logger
from .middleware import Middleware
from scalar_fastapi import get_scalar_api_reference, Layout, Theme

load_dotenv()

security = HTTPBearer()

app = FastAPI(
    title="FastAPI AI Service",
    description="Simple FastAPI boilerplate for your AI/ML projects.",
    version="1.0.0",
)

# app.include_router(retrieval.router)  # retrieval
# app.include_router(summaries.router)  # summaries

app.add_middleware(Middleware)

@app.get("/", tags=["Root"])
async def root():
    logger.info('Request to index page')
    return {"message": "Hello World!", "description": app.description}

@app.get("/scalar", tags=["Scalar API Reference"])
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
        layout=Layout.MODERN,
        theme=Theme.KEPLER
    )