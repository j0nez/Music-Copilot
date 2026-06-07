# AI Provider Layer

Music Copilot never calls AI models directly. All AI interactions go through the Provider Layer, which provides a uniform interface and configurable backend switching.

## Core Interface

```python
# providers/interface.py
from abc import ABC, abstractmethod
from pydantic import BaseModel

class LLMResponse(BaseModel):
    content: str
    model: str
    tokens_used: int

class Provider(ABC):
    name: str
    model: str

    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        ...
```

## Usage Pattern

Every service or plugin that needs AI calls a single function:

```python
from providers import llm

response = await llm.generate("Analyze this chord progression: Fm - Db - Ab - Eb")
# response.content → "The progression uses a VI - VII - III - VII pattern..."
```

The `llm.generate()` function routes through the currently active provider.

## Registry & Switching

```python
# providers/__init__.py
from .interface import Provider
from .openai_provider import OpenAIProvider
from .groq_provider import GroqProvider
from .glm_provider import GLMProvider
from .openrouter_provider import OpenRouterProvider

_registry: dict[str, type[Provider]] = {
    "openai": OpenAIProvider,
    "groq": GroqProvider,
    "glm": GLMProvider,
    "openrouter": OpenRouterProvider,
}

_active_provider: Provider | None = None

def configure(provider_name: str, api_key: str, **config):
    """Set the active provider. Called at startup from main.py."""
    cls = _registry.get(provider_name)
    if cls is None:
        raise ValueError(f"Unknown provider: {provider_name}")
    _active_provider = cls(api_key=api_key, **config)

async def generate(prompt: str, **kwargs) -> LLMResponse:
    if _active_provider is None:
        raise RuntimeError("No AI provider configured. Call configure() first.")
    return await _active_provider.generate(prompt, **kwargs)
```

## Configuration

Provider selection and API keys are injected at application startup in main.py using explicit arguments, not imported directly:

```python
# backend/app/main.py (lifespan)
from providers import configure as configure_provider

configure_provider(settings.ai_provider, settings.ai_api_key, model=settings.ai_model)
```

The provider module has no hard dependency on the backend config — configure() receives provider_name and api_key explicitly, avoiding circular imports and allowing the providers folder to be used as a standalone module.

## Provider Implementations

Each provider wraps a specific API while conforming to the `Provider` interface:

| Provider | API | Default Model |
|----------|-----|---------------|
| OpenAI | OpenAI Chat Completions | gpt-4o |
| Groq | Groq API | mixtral-8x7b-32768 |
| GLM | GLM API | glm-4-flash |
| OpenRouter | OpenRouter API | varies |

## Benefits

- **Switch providers instantly** — change one config value
- **Use free APIs** — swap between paid and free providers
- **Test models easily** — compare outputs across models with no code changes
- **Future-proof** — add new providers without touching feature code
