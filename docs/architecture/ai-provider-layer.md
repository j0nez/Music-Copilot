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

def configure(provider_name: str, **config):
    """Set the active provider from config."""
    cls = _registry[provider_name]
    _active_provider = cls(**config)

async def generate(prompt: str, **kwargs) -> LLMResponse:
    if _active_provider is None:
        raise RuntimeError("No AI provider configured")
    return await _active_provider.generate(prompt, **kwargs)
```

## Configuration

Provider selection and API keys are stored in the backend config (environment variables or config file):

```python
# backend/app/core/config.py
AI_PROVIDER = "groq"              # Switch here
AI_MODEL = "mixtral-8x7b-32768"  # Per-provider model selection
AI_API_KEY = env("AI_API_KEY")   # From .env
```

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
