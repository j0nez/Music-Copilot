from providers.interface import LLMResponse, Provider


class OpenAIProvider(Provider):
    name: str = "openai"
    model: str = "gpt-4o"

    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        raise NotImplementedError("OpenAI provider not yet implemented")


# Auto-register
from providers import register_provider
register_provider("openai", OpenAIProvider)
