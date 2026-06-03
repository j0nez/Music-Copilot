class MusicCopilotError(Exception):
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"
    status_code: int = 500
    severity: str = "ERROR"

    def __init__(self, message: str | None = None):
        if message:
            self.message = message
        super().__init__(self.message)


class InputValidationError(MusicCopilotError):
    code = "INVALID_INPUT"
    message = "Invalid input provided"
    status_code = 422
    severity = "WARNING"


class FileValidationError(MusicCopilotError):
    code = "INVALID_FILE"
    message = "File validation failed"
    status_code = 422
    severity = "WARNING"


class PluginNotFoundError(MusicCopilotError):
    code = "PLUGIN_NOT_FOUND"
    message = "Plugin not found"
    status_code = 404
    severity = "WARNING"


class PluginExecutionError(MusicCopilotError):
    code = "PLUGIN_ERROR"
    message = "Plugin execution failed"
    status_code = 500
    severity = "ERROR"


class AIProviderError(MusicCopilotError):
    code = "AI_ERROR"
    message = "AI provider returned an error"
    status_code = 502
    severity = "ERROR"


class DatabaseError(MusicCopilotError):
    code = "DATABASE_ERROR"
    message = "Database operation failed"
    status_code = 500
    severity = "ERROR"
