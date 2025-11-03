from pydantic import BaseModel, Field
from typing import TypedDict, Annotated, List, Literal, Optional
from langchain_core.messages import BaseMessage, AIMessage, AnyMessage
from langgraph.graph.message import add_messages
from langgraph.graph import MessagesState

# =====================================
# STRUCTURED OUTPUT
# =====================================
class Planner(BaseModel):
    title: str = Field(
        description=(
            "A concise, engaging, and descriptive title that captures the essence of the document. "
            "It should reflect the main idea and attract the intended audience."
        )
    )
    doc_type: str = Field(
        description=(
            "The type or format of the document to be created, such as blog, report, article, paper, proposal, guide, or ebook. "
            "This determines the tone, depth, and structure of the output."
        )
    )
    outline: str = Field(
        description=(
            "A structured outline of the document. "
            "Include major sections, subsections, and the logical flow from introduction to conclusion. "
            "This helps guide the writer agent to maintain coherence and depth."
        )
    )
    section: str = Field(
        description=(
            "The estimated number of sections or pages to be generated. "
            "Can be a numeric value or descriptive range (e.g., '5–10 pages', 'short summary', 'detailed guide'). "
            "This guides document length and granularity."
        )
    )
    context: str = Field(
        description=(
            "Background or situational information that informs the document. "
            "Include relevant context, user details, or current trends that help the LLM produce targeted and realistic content."
        )
    )

# =====================================
# STATE DEFINITION
# =====================================
from pydantic import BaseModel, Field

class Pembahasan(BaseModel):
    agenda: str = Field(...,
        description="Agenda spesifik yang dibicarakan"
    )
    pembahasan: str = Field(...,
        description="Topik atau isu utama yang dibicarakan"
    )
    inti_pembahasan: str = Field(...,
        description="Ringkasan hasil diskusi terkait topik ini"
    )
    hasil_rapat: str = Field(...,
        description="Keputusan atau outcome dari agenda ini"
    )

class Output(BaseModel):
    peserta: str                # peserta rapat
    agenda_umum: str            # agenda utama rapat secara keseluruhan
    hasil_umum: str             # ringkasan hasil keseluruhan rapat
    pembahasan: List[Pembahasan]# pembahasan per rapat