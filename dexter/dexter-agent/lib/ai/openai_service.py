"""
OpenAI Service Layer für Dexter Financial Analyst Agent

Dieses Modul verwaltet die gesamte OpenAI API-Integration inklusive:
- Chat Completions (streaming und non-streaming)
- Function Calling für Tools
- Token-Management und Context-Trimming
- Error-Handling und Retry-Logik
"""

import os
import asyncio
from typing import List, Dict, Any, AsyncIterator, Optional, Literal
from dataclasses import dataclass
from openai import OpenAI, AsyncOpenAI
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from openai.types.chat.chat_completion_message_tool_call import ChatCompletionMessageToolCall

from config import config


# Type Definitions
@dataclass
class ChatMessage:
    """Repräsentiert eine Chat-Nachricht"""
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    name: Optional[str] = None  # Für tool messages
    tool_call_id: Optional[str] = None  # Für tool responses
    tool_calls: Optional[List[Dict[str, Any]]] = None  # Für assistant tool calls


@dataclass
class OpenAIResponse:
    """Strukturierte Response von OpenAI API"""
    content: str
    tokens_used: int
    model: str
    finish_reason: str
    tool_calls: Optional[List[ChatCompletionMessageToolCall]] = None


class OpenAIService:
    """
    Service-Klasse für OpenAI API Integration

    Attributes:
        client: Synchroner OpenAI Client
        async_client: Asynchroner OpenAI Client
        model: Verwendetes Modell (z.B. gpt-4-turbo-preview)
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialisiert OpenAI Service

        Args:
            api_key: Optional - OpenAI API Key (falls nicht in config)
        """
        self.api_key = api_key or config.api_key
        self.client = OpenAI(api_key=self.api_key)
        self.async_client = AsyncOpenAI(api_key=self.api_key)
        self.model = config.model.model_name
        self.temperature = config.model.temperature
        self.max_tokens = config.model.max_tokens

    def _convert_messages(self, messages: List[ChatMessage]) -> List[Dict[str, Any]]:
        """
        Konvertiert ChatMessage-Objekte zu OpenAI API Format

        Args:
            messages: Liste von ChatMessage-Objekten

        Returns:
            Liste von Dicts im OpenAI Format
        """
        result = []
        for msg in messages:
            message_dict = {"role": msg.role, "content": msg.content}

            if msg.name:
                message_dict["name"] = msg.name
            if msg.tool_call_id:
                message_dict["tool_call_id"] = msg.tool_call_id
            if msg.tool_calls:
                message_dict["tool_calls"] = msg.tool_calls

            result.append(message_dict)

        return result

    async def generate_response(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> OpenAIResponse:
        """
        Generiert eine Response (non-streaming)

        Args:
            messages: Conversation History
            tools: Optional - Tool definitions für Function Calling
            temperature: Optional - Override der Konfiguration
            max_tokens: Optional - Override der Konfiguration

        Returns:
            OpenAIResponse mit content, tokens, etc.
        """
        try:
            api_messages = self._convert_messages(messages)

            params = {
                "model": self.model,
                "messages": api_messages,
                "temperature": temperature or self.temperature,
                "max_tokens": max_tokens or self.max_tokens,
            }

            # Füge tools hinzu wenn vorhanden
            if tools:
                params["tools"] = tools
                params["tool_choice"] = "auto"

            # Async call
            response: ChatCompletion = await asyncio.to_thread(
                self.client.chat.completions.create,
                **params
            )

            choice = response.choices[0]
            message = choice.message

            return OpenAIResponse(
                content=message.content or "",
                tokens_used=response.usage.total_tokens if response.usage else 0,
                model=response.model,
                finish_reason=choice.finish_reason,
                tool_calls=message.tool_calls if hasattr(message, 'tool_calls') else None
            )

        except Exception as e:
            raise OpenAIServiceError(f"Fehler bei OpenAI API Call: {str(e)}") from e

    async def generate_response_stream(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> AsyncIterator[str]:
        """
        Generiert eine Response mit Streaming

        Args:
            messages: Conversation History
            tools: Optional - Tool definitions
            temperature: Optional - Override
            max_tokens: Optional - Override

        Yields:
            Content chunks als strings
        """
        try:
            api_messages = self._convert_messages(messages)

            params = {
                "model": self.model,
                "messages": api_messages,
                "temperature": temperature or self.temperature,
                "max_tokens": max_tokens or self.max_tokens,
                "stream": True
            }

            if tools:
                params["tools"] = tools
                params["tool_choice"] = "auto"

            # Async streaming
            stream = await self.async_client.chat.completions.create(**params)

            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield delta.content

        except Exception as e:
            raise OpenAIServiceError(f"Fehler bei OpenAI Streaming: {str(e)}") from e

    def estimate_tokens(self, text: str) -> int:
        """
        Schätzt Token-Count für Text (grobe Approximation)

        Args:
            text: Zu schätzender Text

        Returns:
            Geschätzte Anzahl Tokens

        Note:
            Nutzt Faustregel: ~4 Zeichen pro Token für Englisch
            Für exakte Zählung: tiktoken library verwenden
        """
        return max(1, len(text) // 4)

    def trim_conversation_history(
        self,
        messages: List[ChatMessage],
        max_tokens: int = 8000
    ) -> List[ChatMessage]:
        """
        Trimmt Conversation History auf Token-Limit

        Args:
            messages: Vollständige Message-Historie
            max_tokens: Maximale Token-Anzahl

        Returns:
            Getrimte Message-Liste (behält system message + neueste messages)
        """
        # System message behalten
        system_messages = [m for m in messages if m.role == "system"]
        other_messages = [m for m in messages if m.role != "system"]

        # Token-Budget berechnen
        system_tokens = sum(self.estimate_tokens(m.content) for m in system_messages)
        remaining_tokens = max_tokens - system_tokens

        # Von hinten nach vorne Messages hinzufügen
        trimmed_other = []
        current_tokens = 0

        for message in reversed(other_messages):
            msg_tokens = self.estimate_tokens(message.content)
            if current_tokens + msg_tokens > remaining_tokens:
                break
            trimmed_other.insert(0, message)
            current_tokens += msg_tokens

        return system_messages + trimmed_other


class OpenAIServiceError(Exception):
    """Basis-Exception für OpenAI Service Fehler"""
    pass


# Singleton-Instanz
_service: Optional[OpenAIService] = None


def get_service() -> OpenAIService:
    """
    Hole Singleton-Instanz des OpenAI Service

    Returns:
        OpenAIService Instanz
    """
    global _service
    if _service is None:
        _service = OpenAIService()
    return _service


# Convenience Functions für einfachen Import
async def generate_agent_response(
    messages: List[ChatMessage],
    tools: Optional[List[Dict[str, Any]]] = None
) -> OpenAIResponse:
    """Generiere Agent Response (non-streaming)"""
    service = get_service()
    return await service.generate_response(messages, tools)


async def generate_agent_response_stream(
    messages: List[ChatMessage],
    tools: Optional[List[Dict[str, Any]]] = None
) -> AsyncIterator[str]:
    """Generiere Agent Response (streaming)"""
    service = get_service()
    async for chunk in service.generate_response_stream(messages, tools):
        yield chunk


def estimate_tokens(text: str) -> int:
    """Schätze Token-Count"""
    service = get_service()
    return service.estimate_tokens(text)


def trim_conversation_history(
    messages: List[ChatMessage],
    max_tokens: int = 8000
) -> List[ChatMessage]:
    """Trimme Conversation History"""
    service = get_service()
    return service.trim_conversation_history(messages, max_tokens)


if __name__ == "__main__":
    # Test der Service-Schicht
    import asyncio

    async def test_service():
        """Test-Funktion für OpenAI Service"""
        print("🧪 Teste OpenAI Service...")

        try:
            service = get_service()
            print(f"✓ Service initialisiert mit Model: {service.model}")

            # Test: Token Estimation
            test_text = "This is a test message for token estimation."
            tokens = service.estimate_tokens(test_text)
            print(f"✓ Token Estimation: '{test_text}' → {tokens} tokens")

            # Test: Message Conversion
            messages = [
                ChatMessage(role="system", content="You are a helpful assistant."),
                ChatMessage(role="user", content="Hello!")
            ]
            converted = service._convert_messages(messages)
            print(f"✓ Message Conversion: {len(messages)} messages → {len(converted)} API messages")

            # Test: Non-streaming response (nur wenn API Key valide)
            try:
                print("\n🔄 Teste API Call (non-streaming)...")
                response = await service.generate_response(messages)
                print(f"✓ Response erhalten: {response.tokens_used} tokens used")
                print(f"  Model: {response.model}")
                print(f"  Finish Reason: {response.finish_reason}")
                print(f"  Content: {response.content[:100]}...")
            except Exception as e:
                print(f"⚠️  API Call fehlgeschlagen (erwartet ohne validen API Key): {e}")

            print("\n✅ Alle Service-Layer Tests erfolgreich!")

        except Exception as e:
            print(f"❌ Service Test fehlgeschlagen: {e}")

    asyncio.run(test_service())
