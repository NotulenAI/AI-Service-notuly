from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timezone

"""
Satu message session memiliki tepat satu kb session, satu document, dan beberapa chat message.
Satu kb collection memiliki beberapa kb session.
"""

class ChatMessage(BaseModel):
    content: str
    role: Literal["human", "assistant"] = "human"
    created_at: datetime = datetime.now(timezone.utc)

class KnowledgeBaseCollection(BaseModel):
    id: str
    name: str
    cmetadata: str

class KnowledgeBaseSession(BaseModel):
    id: str
    collection_id: List[KnowledgeBaseCollection] = []  # one-to-many
    embedding: List[float]
    document: str
    cmetadata: str
    created_at: datetime = datetime.now(timezone.utc)

class MessageSession(BaseModel):
    id: str
    title: str
    files: Optional[List[str]] = None
    document: Optional[str] = None
    created_at: datetime = datetime.now(timezone.utc)
    chat_message: List[ChatMessage] = []
    knowledge_base: Optional[KnowledgeBaseSession] = None  # one-to-one (optional)

# Panggil model_rebuild() jika diperlukan untuk referensi maju (opsional di Pydantic v2)
KnowledgeBaseCollection.model_rebuild()
KnowledgeBaseSession.model_rebuild()
MessageSession.model_rebuild()

# Contoh pembuatan instance dengan waktu timezone-aware
msg1 = ChatMessage(content="Tell me a joke", role="human", created_at=datetime.now(timezone.utc))
msg2 = ChatMessage(content="Why don’t programmers like nature? Because it has too many bugs", role="assistant", created_at=datetime.now(timezone.utc))
msg3 = ChatMessage(content="Another message", role="human", created_at=datetime.now(timezone.utc))
msg4 = ChatMessage(content="Yet another message", role="assistant", created_at=datetime.now(timezone.utc))
msg5 = ChatMessage(content="testing", role="human", created_at=datetime.now(timezone.utc))  # IGNORE
msg6 = ChatMessage(content="testing 2", role="assistant", created_at=datetime.now(timezone.utc))  # IGNORE

# Buat KnowledgeBaseSession
kb_session1 = KnowledgeBaseSession(
    id="kb_sess_1",
    name_document="Doc1",
    embedding=[0.1, 0.2, 0.3],
    text_document="Isi dokumen 1",
    created_at=datetime.now(timezone.utc)  # Waktu dengan timezone
)

# Buat MessageSession (knowledge_base wajib diisi)
msg_session1 = MessageSession(
    id="msg_sess_1",
    title="Session 1",
    created_at=datetime.now(timezone.utc),  # Waktu dengan timezone
    chat_message=[msg1, msg2, msg3, msg4],
    knowledge_base=kb_session1,
    document="Isi dokumen 1"  # Diisi sesuai dengan konten (jika dianggap wajib, hapus Optional di field document)
)

msg_session2 = MessageSession(
    id="msg_sess_2",
    title="Session 2",
    created_at=datetime.now(timezone.utc),
    chat_message=[msg5, msg6],
    knowledge_base=None,
    document=None
)

# Buat KnowledgeBaseCollection
kb_collection1 = KnowledgeBaseCollection(
    id="kb_coll_1",
    name="KB Coll 1",
    collection_name="Coll1",
    knowledge="Pengetahuan",
    file_type="pdf",
    sessions=[kb_session1]
)
