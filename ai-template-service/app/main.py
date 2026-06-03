from dotenv import load_dotenv

load_dotenv()

import os  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.routes import ai  # noqa: E402

app = FastAPI()

# Browser origins allowed to call this service.
# Dev: defaults to the local frontend. Prod: set FRONTEND_ORIGIN in the
# environment (comma-separated if you need more than one).
_allowed_origins = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3001,http://127.0.0.1:3001",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)
