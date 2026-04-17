from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import AiService

router = APIRouter()
ai_service = AiService()

class GenerateRequest(BaseModel):
    prompt: str
    tenant_id: str
    user_id: str
    examples: list = []

@router.post("/generate")
async def generate(request: GenerateRequest):
    try:
        result = await ai_service.generate_template(prompt=request.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))