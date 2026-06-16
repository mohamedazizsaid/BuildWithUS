import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.ai_service import AiService

router = APIRouter()
ai_service = AiService()

class GenerateRequest(BaseModel):
    prompt: str = ""
    tenant_id: str
    user_id: str
    examples: list = []
    brief: dict | None = None

@router.post("/generate")
async def generate(request: GenerateRequest):
    try:
        result = await ai_service.generate_template(prompt=request.prompt, brief=request.brief)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


class ChatMessage(BaseModel):
    role: str          # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    current_mjml: str | None = None
    tenant_id: str
    user_id: str

@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        result = await ai_service.chat_template(
            messages=[m.model_dump() for m in request.messages],
            current_mjml=request.current_mjml,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming variant of /chat. Emits newline-delimited JSON (NDJSON) events:
    {"type":"delta","text":...}, {"type":"status",...}, {"type":"done",...},
    {"type":"error",...}. The short chat sentence streams live; the full MJML
    arrives in the final "done" event once generated and post-processed.
    """
    async def event_stream():
        try:
            async for event in ai_service.chat_template_stream(
                messages=[m.model_dump() for m in request.messages],
                current_mjml=request.current_mjml,
            ):
                yield json.dumps(event) + "\n"
        except Exception as e:  # noqa: BLE001 — surface as a stream error event
            yield json.dumps({"type": "error", "error": str(e)}) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
