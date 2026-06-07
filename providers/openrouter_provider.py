import httpx

from providers.interface import LLMResponse, Provider, ProviderError, RateLimitError

BASE_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterProvider(Provider):
    name: str = "openrouter"
    model: str = "auto"
    available_models: list[str] = [
        "auto",
        "google/gemini-2.0-flash-lite-preview",
        "meta-llama/llama-3.1-8b-instruct",
        "mistralai/mistral-7b-instruct",
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
            raise RateLimitError("OpenRouter API rate limited")
        if resp.status_code != 200:
            detail = resp.text[:200]
            raise ProviderError(f"OpenRouter API error {resp.status_code}: {detail}")

        data = resp.json()
        choice = data["choices"][0]
        usage = data.get("usage", {})

        if is_probe:
            return LLMResponse(content="ok", model=self.model, tokens_used=0)

        return LLMResponse(
            content=choice["message"]["content"],
            model=data.get("model", self.model),
            tokens_used=usage.get("total_tokens", 0),
        )

    def _build_messages(self, prompt: str, kwargs: dict) -> list[dict]:
        messages: list[dict] = []

        system_prompt = kwargs.get("system_prompt")
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        history = kwargs.get("messages")
        if history:
            messages.extend(history)

        messages.append({"role": "user", "content": prompt})
        return messages


from providers import register_provider
register_provider("openrouter", OpenRouterProvider)
