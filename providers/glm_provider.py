from providers.interface import LLMResponse, Provider


class GLMProvider(Provider):
    name: str = "glm"
    model: str = "glm-4-flash"
    available_models: list[str] = ["glm-4-flash", "glm-4-plus"]

    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        raise NotImplementedError("GLM provider not yet implemented")


# Auto-register
from providers import register_provider
register_provider("glm", GLMProvider)
