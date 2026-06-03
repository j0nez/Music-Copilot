from pydantic import BaseModel


class PluginResult(BaseModel):
    success: bool
    data: dict
    error: str | None = None


class LLMResponse(BaseModel):
    content: str
    model: str
    tokens_used: int = 0


class ErrorDetail(BaseModel):
    code: str
    message: str


class ApiResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: ErrorDetail | None = None
