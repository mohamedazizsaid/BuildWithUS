from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai_service import AiService

router = APIRouter()
ai_service = AiService()

# NOTE: Email chat/generation moved to the Next.js route /api/ai/chat
# (tool-based block generation against the in-house vLLM server). This service
# now only handles the non-conversational AI helpers below: palette suggestion
# and variable / invoice-field mapping.


class SuggestPalettesRequest(BaseModel):
    email_type: str
    vibe: str | None = None

@router.post("/suggest-palettes")
async def suggest_palettes(request: SuggestPalettesRequest):
    try:
        palettes = await ai_service.suggest_palettes(
            email_type=request.email_type,
            vibe=request.vibe,
        )
        return {"palettes": palettes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


class MapVariablesRequest(BaseModel):
    template_vars: list[str]
    file_columns: list[str]
    sample_row: dict | None = None

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
        raise HTTPException(status_code=500, detail=str(e)) from e


class InvoiceTargetSpec(BaseModel):
    path: str
    label: str
    type: str
    hint: str | None = ''

class AlreadyMatchedSpec(BaseModel):
    target: str
    column: str

class MapInvoiceFieldsRequest(BaseModel):
    targets: list[InvoiceTargetSpec]
    file_columns: list[str]
    already_matched: list[AlreadyMatchedSpec] | None = None
    sample_row: dict | None = None

@router.post("/map-invoice-fields")
async def map_invoice_fields(request: MapInvoiceFieldsRequest):
    try:
        mapping = await ai_service.map_invoice_fields(
            targets=[t.model_dump() for t in request.targets],
            file_columns=request.file_columns,
            already_matched=[m.model_dump() for m in (request.already_matched or [])],
            sample_row=request.sample_row,
        )
        return {"mapping": mapping}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
