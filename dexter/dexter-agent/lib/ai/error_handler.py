"""
Error Handling für OpenAI API Calls

Implementiert Retry-Logik, Rate-Limiting Handling und spezifische
Error-Behandlung für verschiedene OpenAI API Fehler.
"""

import asyncio
import time
from typing import TypeVar, Callable, Any, Optional
from functools import wraps
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class OpenAIError(Exception):
    """Basis-Klasse für OpenAI-spezifische Fehler"""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        retryable: bool = False,
        retry_after: Optional[int] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        self.retry_after = retry_after


class RateLimitError(OpenAIError):
    """Rate Limit überschritten"""

    def __init__(self, message: str, retry_after: int = 60):
        super().__init__(
            message,
            status_code=429,
            retryable=True,
            retry_after=retry_after
        )


class AuthenticationError(OpenAIError):
    """Authentifizierungs-Fehler (ungültiger API Key)"""

    def __init__(self, message: str = "Ungültiger API Key"):
        super().__init__(message, status_code=401, retryable=False)


class InvalidRequestError(OpenAIError):
    """Ungültige Anfrage (fehlerhafte Parameter)"""

    def __init__(self, message: str):
        super().__init__(message, status_code=400, retryable=False)


class ServiceUnavailableError(OpenAIError):
    """OpenAI Service vorübergehend nicht verfügbar"""

    def __init__(self, message: str = "OpenAI Service nicht verfügbar"):
        super().__init__(message, status_code=503, retryable=True, retry_after=30)


class ContextLengthExceededError(OpenAIError):
    """Context-Fenster überschritten"""

    def __init__(self, message: str):
        super().__init__(message, status_code=400, retryable=False)


def classify_error(error: Exception) -> OpenAIError:
    """
    Klassifiziert generische Exception zu spezifischem OpenAI Error

    Args:
        error: Original Exception

    Returns:
        Klassifizierter OpenAI Error
    """
    error_str = str(error).lower()

    # Rate Limiting
    if "rate limit" in error_str or "429" in error_str:
        return RateLimitError(str(error))

    # Authentication
    if "authentication" in error_str or "401" in error_str or "api key" in error_str:
        return AuthenticationError(str(error))

    # Invalid Request
    if "400" in error_str or "invalid" in error_str:
        return InvalidRequestError(str(error))

    # Service Unavailable
    if "503" in error_str or "unavailable" in error_str or "timeout" in error_str:
        return ServiceUnavailableError(str(error))

    # Context Length
    if "context length" in error_str or "token limit" in error_str:
        return ContextLengthExceededError(str(error))

    # Unbekannter Fehler - als retryable markieren
    return OpenAIError(str(error), retryable=True)


async def with_retry(
    func: Callable[..., T],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 1.0,
    exponential_backoff: bool = True,
    **kwargs: Any
) -> T:
    """
    Führt Funktion mit Retry-Logik aus

    Args:
        func: Auszuführende Funktion
        *args: Positionsargumente für func
        max_retries: Maximale Anzahl Wiederholungen
        base_delay: Basis-Wartezeit zwischen Retries (in Sekunden)
        exponential_backoff: Verwende exponentielles Backoff
        **kwargs: Keyword-Argumente für func

    Returns:
        Rückgabewert von func

    Raises:
        OpenAIError: Nach erschöpften Retries
    """
    last_error: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            # Versuche Funktion auszuführen
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return await asyncio.to_thread(func, *args, **kwargs)

        except Exception as e:
            last_error = e
            classified_error = classify_error(e)

            # Nicht-retryable Fehler → sofort werfen
            if not classified_error.retryable:
                logger.error(f"Non-retryable error: {classified_error}")
                raise classified_error

            # Letzter Versuch erreicht?
            if attempt >= max_retries:
                logger.error(f"Max retries ({max_retries}) exceeded")
                raise classified_error

            # Berechne Wartezeit
            if classified_error.retry_after:
                delay = classified_error.retry_after
            elif exponential_backoff:
                delay = base_delay * (2 ** attempt)
            else:
                delay = base_delay

            logger.warning(
                f"Attempt {attempt + 1}/{max_retries + 1} failed: {classified_error}. "
                f"Retrying in {delay}s..."
            )

            await asyncio.sleep(delay)

    # Sollte nie erreicht werden, aber für Type Safety
    if last_error:
        raise classify_error(last_error)
    raise OpenAIError("Unexpected error in retry logic")


def retry_on_error(
    max_retries: int = 3,
    base_delay: float = 1.0,
    exponential_backoff: bool = True
):
    """
    Decorator für automatisches Retry bei Fehlern

    Args:
        max_retries: Maximale Wiederholungen
        base_delay: Basis-Wartezeit
        exponential_backoff: Exponentielles Backoff aktivieren

    Example:
        @retry_on_error(max_retries=3)
        async def my_api_call():
            return await client.chat.completions.create(...)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            return await with_retry(
                func,
                *args,
                max_retries=max_retries,
                base_delay=base_delay,
                exponential_backoff=exponential_backoff,
                **kwargs
            )
        return wrapper
    return decorator


class RateLimiter:
    """
    Simple Rate Limiter für API Calls

    Limitiert Anzahl Requests pro Zeitfenster.
    """

    def __init__(self, max_requests: int = 60, time_window: float = 60.0):
        """
        Initialisiert Rate Limiter

        Args:
            max_requests: Maximale Requests pro time_window
            time_window: Zeitfenster in Sekunden
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests: list[float] = []

    async def acquire(self):
        """
        Warte bis Request erlaubt ist (Rate Limit beachten)
        """
        now = time.time()

        # Entferne alte Requests außerhalb des Zeitfensters
        cutoff = now - self.time_window
        self.requests = [ts for ts in self.requests if ts > cutoff]

        # Warte wenn Limit erreicht
        if len(self.requests) >= self.max_requests:
            oldest = self.requests[0]
            wait_time = self.time_window - (now - oldest)
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                # Rekursiver Call nach Wartezeit
                return await self.acquire()

        # Registriere neuen Request
        self.requests.append(now)


# Globaler Rate Limiter (60 Requests pro Minute)
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter(
    max_requests: int = 60,
    time_window: float = 60.0
) -> RateLimiter:
    """
    Hole Singleton Rate Limiter Instanz

    Args:
        max_requests: Max Requests (nur beim ersten Call verwendet)
        time_window: Zeitfenster in Sekunden

    Returns:
        RateLimiter Instanz
    """
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter(max_requests, time_window)
    return _rate_limiter


if __name__ == "__main__":
    # Test Error Handling
    import asyncio

    async def test_error_handling():
        """Test-Funktion für Error Handling"""
        print("🧪 Teste Error Handling...")

        # Test 1: Error Classification
        print("\n1️⃣ Error Classification:")
        test_errors = [
            Exception("Error 429: Rate limit exceeded"),
            Exception("Authentication failed - invalid API key"),
            Exception("Error 400: Invalid request"),
            Exception("Service temporarily unavailable (503)"),
            Exception("Context length exceeded - maximum 4096 tokens"),
        ]

        for error in test_errors:
            classified = classify_error(error)
            print(f"  {error} → {type(classified).__name__} (retryable: {classified.retryable})")

        # Test 2: Retry Logic
        print("\n2️⃣ Retry Logic:")
        call_count = 0

        @retry_on_error(max_retries=2, base_delay=0.1)
        async def flaky_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Service temporarily unavailable")
            return "Success!"

        try:
            result = await flaky_function()
            print(f"  ✓ Retry successful after {call_count} attempts: {result}")
        except Exception as e:
            print(f"  ✗ Failed: {e}")

        # Test 3: Rate Limiter
        print("\n3️⃣ Rate Limiter:")
        limiter = RateLimiter(max_requests=3, time_window=1.0)

        start = time.time()
        for i in range(5):
            await limiter.acquire()
            print(f"  Request {i + 1} at {time.time() - start:.2f}s")

        print("\n✅ Error Handling Tests abgeschlossen!")

    asyncio.run(test_error_handling())
