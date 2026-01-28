"""
Test Script für OpenAI Integration

Testet die vollständige OpenAI-Integration ohne den vollen Agent zu starten.
"""

import asyncio
import sys
import os
from pathlib import Path

# Fix Windows encoding for emojis
if sys.platform == "win32":
    import codecs
    sys.stdout.reconfigure(encoding='utf-8')

# Farben für Terminal Output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_test(name: str):
    """Druckt Test-Header"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}🧪 TEST: {name}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")


def print_success(msg: str):
    """Druckt Erfolgs-Message"""
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")


def print_error(msg: str):
    """Druckt Fehler-Message"""
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")


def print_warning(msg: str):
    """Druckt Warn-Message"""
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")


async def test_imports():
    """Test 1: Alle Imports funktionieren"""
    print_test("Imports")

    try:
        from config import get_config
        print_success("Config import OK")

        from lib.ai.openai_service import OpenAIService, ChatMessage
        print_success("OpenAI Service import OK")

        from lib.ai.error_handler import retry_on_error, OpenAIError
        print_success("Error Handler import OK")

        from lib.ai.tool_converter import register_dexter_tools
        print_success("Tool Converter import OK")

        from tools.roi_calculator import calculate_roi
        print_success("Tools import OK")

        return True

    except ImportError as e:
        print_error(f"Import failed: {e}")
        return False


async def test_config():
    """Test 2: Konfiguration laden"""
    print_test("Configuration")

    try:
        from config import get_config

        config = get_config()
        print_success(f"Config loaded: {config.agent_name}")
        print_success(f"Model: {config.model.model_name}")
        print_success(f"API Key: {'*' * 20}{config.api_key[-4:]}")

        # Validate
        config.validate()
        print_success("Config validation passed")

        return True

    except Exception as e:
        print_error(f"Config error: {e}")
        print_warning("Stelle sicher, dass .env Datei mit OPENAI_API_KEY existiert")
        return False


async def test_service_layer():
    """Test 3: OpenAI Service Layer"""
    print_test("OpenAI Service Layer")

    try:
        from lib.ai.openai_service import OpenAIService, ChatMessage

        service = OpenAIService()
        print_success(f"Service initialized with model: {service.model}")

        # Test Token Estimation
        text = "This is a test message for token estimation."
        tokens = service.estimate_tokens(text)
        print_success(f"Token estimation works: '{text[:30]}...' → {tokens} tokens")

        # Test Message Conversion
        messages = [
            ChatMessage(role="system", content="You are a helpful assistant."),
            ChatMessage(role="user", content="Hello!")
        ]
        converted = service._convert_messages(messages)
        print_success(f"Message conversion works: {len(messages)} messages → {len(converted)} API messages")

        # Test Conversation Trimming
        trimmed = service.trim_conversation_history(messages, max_tokens=1000)
        print_success(f"Conversation trimming works: {len(messages)} → {len(trimmed)} messages")

        return True

    except Exception as e:
        print_error(f"Service layer error: {e}")
        return False


async def test_tool_converter():
    """Test 4: Tool Definitions"""
    print_test("Tool Converter")

    try:
        from lib.ai.tool_converter import register_dexter_tools

        tools = register_dexter_tools()
        print_success(f"Registered {len(tools)} tools in OpenAI format")

        # Verify structure
        for tool in tools:
            assert tool["type"] == "function", f"Invalid tool type: {tool}"
            assert "function" in tool, f"Missing function key: {tool}"
            assert "name" in tool["function"], f"Missing name: {tool}"
            assert "parameters" in tool["function"], f"Missing parameters: {tool}"

        print_success("All tool definitions valid")

        # Print tool names
        tool_names = [t["function"]["name"] for t in tools]
        print_success(f"Tools: {', '.join(tool_names)}")

        return True

    except Exception as e:
        print_error(f"Tool converter error: {e}")
        return False


async def test_error_handler():
    """Test 5: Error Handling"""
    print_test("Error Handler")

    try:
        from lib.ai.error_handler import classify_error, RateLimiter, OpenAIError

        # Test Error Classification
        test_errors = [
            (Exception("Error 429: Rate limit"), "RateLimitError"),
            (Exception("Authentication failed"), "AuthenticationError"),
            (Exception("Error 400: Invalid request"), "InvalidRequestError"),
        ]

        for error, expected_type in test_errors:
            classified = classify_error(error)
            assert expected_type in type(classified).__name__
            print_success(f"Classified {expected_type} correctly")

        # Test Rate Limiter
        limiter = RateLimiter(max_requests=3, time_window=1.0)
        for i in range(3):
            await limiter.acquire()
        print_success("Rate limiter works")

        return True

    except Exception as e:
        print_error(f"Error handler test failed: {e}")
        return False


async def test_simple_api_call():
    """Test 6: Simple OpenAI API Call (requires valid API key)"""
    print_test("OpenAI API Call")

    try:
        from lib.ai.openai_service import OpenAIService, ChatMessage

        service = OpenAIService()

        messages = [
            ChatMessage(role="system", content="You are a helpful assistant. Respond with exactly: 'Test successful!'"),
            ChatMessage(role="user", content="Please confirm.")
        ]

        print("Calling OpenAI API...")
        response = await service.generate_response(messages)

        print_success(f"Response received: {response.content[:100]}")
        print_success(f"Tokens used: {response.tokens_used}")
        print_success(f"Model: {response.model}")
        print_success(f"Finish reason: {response.finish_reason}")

        return True

    except Exception as e:
        print_error(f"API call failed: {e}")
        print_warning("This is expected if OPENAI_API_KEY is invalid or missing")
        return False


async def test_main_agent():
    """Test 7: DexterAgent Initialization"""
    print_test("DexterAgent Initialization")

    try:
        from main import DexterAgent

        agent = DexterAgent()
        print_success(f"Agent initialized: {agent.model}")
        print_success(f"Tools registered: {len(agent.tools)}")
        print_success(f"System prompt loaded: {len(agent.system_prompt)} characters")

        return True

    except Exception as e:
        print_error(f"Agent initialization failed: {e}")
        return False


async def run_all_tests():
    """Führt alle Tests aus"""
    print(f"\n{Colors.BOLD}{'='*60}")
    print("🚀 DEXTER AGENT - OPENAI INTEGRATION TEST SUITE")
    print(f"{'='*60}{Colors.RESET}\n")

    tests = [
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("Service Layer", test_service_layer),
        ("Tool Converter", test_tool_converter),
        ("Error Handler", test_error_handler),
        ("DexterAgent", test_main_agent),
        ("API Call", test_simple_api_call),  # Last (requires API key)
    ]

    results = []

    for name, test_func in tests:
        try:
            result = await test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"Test crashed: {e}")
            results.append((name, False))

    # Summary
    print(f"\n{Colors.BOLD}{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}{Colors.RESET}\n")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = f"{Colors.GREEN}✓ PASSED{Colors.RESET}" if result else f"{Colors.RED}✗ FAILED{Colors.RESET}"
        print(f"  {name:.<40} {status}")

    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.RESET}")

    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED! 🎉{Colors.RESET}")
        print(f"\n{Colors.GREEN}✓ OpenAI integration is ready!{Colors.RESET}")
        print(f"{Colors.GREEN}✓ You can now run: python main.py{Colors.RESET}\n")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}⚠️  SOME TESTS FAILED{Colors.RESET}")
        print(f"\n{Colors.YELLOW}Please fix the errors above before running the agent.{Colors.RESET}\n")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(run_all_tests())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠️  Tests interrupted{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}❌ Fatal error: {e}{Colors.RESET}")
        sys.exit(1)
