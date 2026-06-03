from providers.interface import LLMResponse, Provider


class OpenRouterProvider(Provider):
    name: str = "openrouter"
    model: str = "qwen-qwq-32b"

    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        raise NotImplementedError("OpenRouter provider not yet implemented")


# Auto-register
from providers import register_provider
register_provider("openrouter", OpenRouterProvider)
