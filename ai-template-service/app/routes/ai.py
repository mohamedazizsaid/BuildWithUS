from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
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


class MapVariablesRequest(BaseModel):
    template_vars: list[str]
    file_columns: list[str]
    sample_row: Optional[dict] = None

@router.post("/map-variables")
async def map_variables(request: MapVariablesRequest):
    try:
        mapping = await ai_service.map_variables(
            template_vars=request.template_vars,
            file_columns=request.file_columns,
            sample_row=request.sample_row,
        )
        return {"mapping": mapping}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))