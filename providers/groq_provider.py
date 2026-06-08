import logging

import httpx

from providers.interface import LLMResponse, Provider, ProviderError, RateLimitError

logger = logging.getLogger("music_copilot.providers.groq")

BASE_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqProvider(Provider):
    name: str = "groq"
    model: str = "llama-3.3-70b-versatile"
    available_models: list[str] = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
        "deepseek-r1-distill-llama-70b",
    ]

    def __init__(self, api_key: str, model: str | None = None, **kwargs) -> None:
        self.api_key = api_key
        if model:
            self.model = model

    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        is_probe = kwargs.pop("_probe", False)

        messages = self._build_messages(prompt, kwargs)
        payload = {
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2048),
        }
        tools = kwargs.get("tools")
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code == 429:
            body = resp.text[:500]
            logger.error("Groq 429 response body: %s", body)
            raise RateLimitError(f"Groq API rate limited: {body[:200]}")
        if resp.status_code != 200:
            detail = resp.text[:200]
            raise ProviderError(f"Groq API error {resp.status_code}: {detail}")

        data = resp.json()
        choice = data["choices"][0]
        usage = data.get("usage", {})

        if is_probe:
            return LLMResponse(content="ok", model=self.model, tokens_used=0)

        message = choice["message"]
        content = message.get("content") or ""
        tool_calls = message.get("tool_calls", [])

        return LLMResponse(
            content=content,
            model=data.get("model", self.model),
            tokens_used=usage.get("total_tokens", 0),
            tool_calls=tool_calls,
        )

    def _build_messages(self, prompt: str, kwargs: dict) -> list[dict]:
        messages: list[dict] = []

        system_prompt = kwargs.get("system_prompt")
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        history = kwargs.get("messages")
        if history:
            messages.extend(history)

        if prompt.strip():
            messages.append({"role": "user", "content": prompt})
        return messages


from providers import register_provider
register_provider("groq", GroqProvider)
