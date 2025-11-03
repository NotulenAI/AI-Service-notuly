## dev
pastikan install terlebih dahulu uv

lalu masuk env

```
source .venv/bin/activate
```
uv sync / uv pip install -r requirements.txt

## notebook
pilih kernel venv, dan kalo mau install library tambahan uv pip install aja di terminal, make uv add kalau library nya core aja

hasil research bisa dimasukkan folder notebook, bikin notebook sendiri sendiri yah

## fastapi

uvicorn app/main.py:app --reload