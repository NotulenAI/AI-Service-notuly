from fastapi import FastAPI
from pydantic import BaseModel
from vllm import LLM, SamplingParams

app = FastAPI()

# Initialize the vLLM runtime with the Phi-2 model
llm = LLM(model="microsoft/phi-2")

class GenerationRequest(BaseModel):
   prompt: str
   max_tokens: int = 100

@app.post("/generate")
def generate_text(request: GenerationRequest):
   # Use vLLM to generate text
   outputs = llm.generate([request.prompt],
                           sampling_params=SamplingParams(max_tokens=request.max_tokens))
   # llm.generate returns a list of outputs (one per prompt)
   result = outputs[0].outputs[0].text  # get the text of the first (and only) prompt
   return {"completion": result}