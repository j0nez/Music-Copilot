from providers.interface import LLMResponse, Provider


class GroqProvider(Provider):
    name: str = "groq"
    model: str = "mixtral-8x7b-32768"

    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        raise NotImplementedError("Groq provider not yet implemented")


# Auto-register
from providers import register_provider
register_provider("groq", GroqProvider)
