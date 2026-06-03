from providers.interface import LLMResponse, Provider


class GLMProvider(Provider):
    name: str = "glm"
    model: str = "glm-4-flash"

    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        raise NotImplementedError("GLM provider not yet implemented")


# Auto-register
from providers import register_provider
register_provider("glm", GLMProvider)
