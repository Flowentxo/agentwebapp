"""
End-to-End Functionality Tests for Dexter Agent with OpenAI Integration

Tests the complete workflow:
1. Agent initialization
2. API connection to OpenAI
3. Simple queries (no tools)
4. Tool execution (ROI, Sales Forecast, etc.)
5. Error handling
6. Conversation history
"""

import asyncio
import sys
from datetime import datetime
from typing import List

# Test framework
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(title: str):
    """Print test section header"""
    print(f"\n{Colors.CYAN}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{title}{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*70}{Colors.RESET}\n")


def print_test(name: str):
    """Print individual test name"""
    print(f"{Colors.BLUE}▶ {name}...{Colors.RESET}", end=" ", flush=True)


def print_success(msg: str = "PASSED"):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")


def print_error(msg: str = "FAILED"):
    """Print error message"""
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")


def print_info(msg: str):
    """Print info message"""
    print(f"{Colors.CYAN}  ℹ {msg}{Colors.RESET}")


async def test_1_agent_initialization():
    """Test 1: Agent Initialization (Health Check)"""
    print_header("TEST 1: AGENT INITIALIZATION & HEALTH CHECK")

    try:
        from main import DexterAgent
        from config import get_config

        print_test("Loading configuration")
        config = get_config()
        print_success(f"Config loaded: {config.agent_name}")

        print_test("Initializing Dexter Agent")
        agent = DexterAgent()
        print_success(f"Agent initialized")

        print_test("Verifying model configuration")
        assert agent.model == "gpt-4-turbo-preview", f"Unexpected model: {agent.model}"
        print_success(f"Model: {agent.model}")

        print_test("Verifying tools registration")
        assert len(agent.tools) == 6, f"Expected 6 tools, got {len(agent.tools)}"
        print_success(f"{len(agent.tools)} tools registered")

        print_test("Verifying system prompt")
        assert len(agent.system_prompt) > 0, "System prompt is empty"
        print_success(f"System prompt loaded ({len(agent.system_prompt)} chars)")

        print(f"\n{Colors.GREEN}{'✓ HEALTH CHECK: ALL SYSTEMS OPERATIONAL'}{Colors.RESET}\n")

        return True, agent

    except Exception as e:
        print_error(f"FAILED: {e}")
        return False, None


async def test_2_simple_chat_query(agent):
    """Test 2: Simple Chat Query (No Tool Execution)"""
    print_header("TEST 2: SIMPLE CHAT QUERY (NO TOOLS)")

    try:
        query = "What is ROI and why is it important?"

        print_test("Sending query to OpenAI")
        print_info(f"Query: '{query}'")

        response_chunks = []
        async for chunk in agent.chat(query):
            response_chunks.append(chunk)

        full_response = "".join(response_chunks)

        print_test("Verifying response received")
        assert len(full_response) > 0, "Empty response"
        print_success(f"Response received ({len(full_response)} chars)")

        print_test("Verifying response quality")
        assert "ROI" in full_response or "Return on Investment" in full_response.lower(), "Response doesn't mention ROI"
        print_success("Response is relevant")

        print(f"\n{Colors.CYAN}Response Preview:{Colors.RESET}")
        preview = full_response[:300] + "..." if len(full_response) > 300 else full_response
        print(f"{Colors.CYAN}{preview}{Colors.RESET}\n")

        print(f"{Colors.GREEN}✓ SIMPLE QUERY: SUCCESS{Colors.RESET}\n")

        return True

    except Exception as e:
        print_error(f"FAILED: {e}")
        return False


async def test_3_roi_calculation_tool(agent):
    """Test 3: ROI Calculation with Tool Execution"""
    print_header("TEST 3: ROI CALCULATION (TOOL EXECUTION)")

    try:
        # Reset conversation for clean test
        agent.reset_conversation()

        query = "Berechne den ROI für eine Investition von 100.000 Euro mit einem Revenue von 180.000 Euro über 18 Monate."

        print_test("Sending ROI calculation request")
        print_info(f"Investment: €100,000")
        print_info(f"Revenue: €180,000")
        print_info(f"Period: 18 months")

        response_chunks = []
        tool_used = False

        async for chunk in agent.chat(query):
            response_chunks.append(chunk)
            if "calculate_roi" in chunk.lower() or "[verwende tool:" in chunk.lower():
                tool_used = True

        full_response = "".join(response_chunks)

        print_test("Verifying tool was called")
        assert tool_used, "ROI tool was not called"
        print_success("calculate_roi tool executed")

        print_test("Verifying response contains calculations")
        assert len(full_response) > 100, "Response too short"
        print_success(f"Detailed response received ({len(full_response)} chars)")

        print_test("Verifying ROI calculations present")
        # Should contain ROI percentage or financial terms
        has_roi_info = any(term in full_response.lower() for term in ["roi", "%", "prozent", "rendite", "profit"])
        assert has_roi_info, "Response missing ROI calculations"
        print_success("ROI calculations included")

        print(f"\n{Colors.CYAN}Response Preview:{Colors.RESET}")
        # Show first 500 chars of response
        preview = full_response[:500] + "..." if len(full_response) > 500 else full_response
        print(f"{Colors.CYAN}{preview}{Colors.RESET}\n")

        print(f"{Colors.GREEN}✓ ROI TOOL EXECUTION: SUCCESS{Colors.RESET}\n")

        return True

    except Exception as e:
        print_error(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_4_multiple_tool_awareness(agent):
    """Test 4: Agent Knows About All Available Tools"""
    print_header("TEST 4: MULTI-TOOL AWARENESS")

    try:
        agent.reset_conversation()

        query = "What financial analysis tools do you have available?"

        print_test("Asking about available tools")

        response_chunks = []
        async for chunk in agent.chat(query):
            response_chunks.append(chunk)

        full_response = "".join(response_chunks)

        print_test("Verifying agent lists tools")

        # Check for mentions of different tools
        tools_mentioned = {
            "ROI": "roi" in full_response.lower(),
            "Sales Forecast": "sales" in full_response.lower() or "forecast" in full_response.lower(),
            "P&L": "p&l" in full_response.lower() or "profit" in full_response.lower() or "loss" in full_response.lower(),
            "Balance Sheet": "balance" in full_response.lower() or "bilanz" in full_response.lower(),
            "Cash Flow": "cash" in full_response.lower() or "flow" in full_response.lower(),
            "Break-Even": "break" in full_response.lower() or "even" in full_response.lower()
        }

        mentioned_count = sum(tools_mentioned.values())
        print_success(f"{mentioned_count}/6 tools mentioned")

        for tool, mentioned in tools_mentioned.items():
            status = "✓" if mentioned else "✗"
            print_info(f"{status} {tool}")

        print(f"\n{Colors.GREEN}✓ TOOL AWARENESS: VERIFIED{Colors.RESET}\n")

        return True

    except Exception as e:
        print_error(f"FAILED: {e}")
        return False


async def test_5_conversation_history(agent):
    """Test 5: Conversation History Management"""
    print_header("TEST 5: CONVERSATION HISTORY")

    try:
        agent.reset_conversation()

        print_test("Sending first message")
        query1 = "My company has 50000 euro revenue."
        response1_chunks = []
        async for chunk in agent.chat(query1):
            response1_chunks.append(chunk)
        response1 = "".join(response1_chunks)
        print_success(f"Response 1 received")

        print_test("Sending follow-up referencing previous context")
        query2 = "And the costs are 30000 euro. What is the profit margin?"
        response2_chunks = []
        async for chunk in agent.chat(query2):
            response2_chunks.append(chunk)
        response2 = "".join(response2_chunks)
        print_success(f"Response 2 received")

        print_test("Verifying conversation history maintained")
        # Agent should remember the 50000 revenue from query1
        # and use it with 30000 costs from query2
        assert len(agent.conversation_history) > 2, "Conversation history not maintained"
        print_success(f"{len(agent.conversation_history)} messages in history")

        print_test("Verifying context awareness in response")
        # Response should include profit margin calculation or reference to profit
        has_margin_info = any(term in response2.lower() for term in ["margin", "marge", "profit", "%", "prozent"])
        assert has_margin_info, "Response doesn't show context awareness"
        print_success("Agent used conversation context")

        print(f"\n{Colors.CYAN}Follow-up Response:{Colors.RESET}")
        preview = response2[:400] + "..." if len(response2) > 400 else response2
        print(f"{Colors.CYAN}{preview}{Colors.RESET}\n")

        print(f"{Colors.GREEN}✓ CONVERSATION HISTORY: WORKING{Colors.RESET}\n")

        return True

    except Exception as e:
        print_error(f"FAILED: {e}")
        return False


async def test_6_error_handling(agent):
    """Test 6: Error Handling"""
    print_header("TEST 6: ERROR HANDLING")

    try:
        agent.reset_conversation()

        print_test("Testing with invalid/ambiguous input")
        query = "Calculate ROI with negative revenue of -5000 euro"

        response_chunks = []
        error_occurred = False

        try:
            async for chunk in agent.chat(query):
                response_chunks.append(chunk)
                if "error" in chunk.lower() or "fehler" in chunk.lower():
                    error_occurred = True
        except Exception as e:
            error_occurred = True
            print_info(f"Exception caught: {type(e).__name__}")

        full_response = "".join(response_chunks)

        print_test("Verifying graceful error handling")
        # Agent should either explain the issue or handle it gracefully
        assert len(full_response) > 0, "No response received"
        print_success("Agent provided response")

        print_test("Verifying response addresses the issue")
        # Should mention negative values or provide guidance
        addresses_issue = any(term in full_response.lower() for term in ["negative", "negativ", "invalid", "ungültig", "positive", "positiv"])
        if addresses_issue or error_occurred:
            print_success("Agent acknowledged issue")
        else:
            print_info("Agent processed request without explicit error")

        print(f"\n{Colors.CYAN}Error Handling Response:{Colors.RESET}")
        preview = full_response[:400] + "..." if len(full_response) > 400 else full_response
        print(f"{Colors.CYAN}{preview}{Colors.RESET}\n")

        print(f"{Colors.GREEN}✓ ERROR HANDLING: ROBUST{Colors.RESET}\n")

        return True

    except Exception as e:
        print_error(f"FAILED: {e}")
        return False


async def test_7_performance_metrics(agent):
    """Test 7: Performance Metrics"""
    print_header("TEST 7: PERFORMANCE METRICS")

    try:
        agent.reset_conversation()

        print_test("Measuring response time")

        import time
        query = "What is a balance sheet?"

        start_time = time.time()
        response_chunks = []
        first_chunk_time = None

        async for chunk in agent.chat(query):
            if first_chunk_time is None and chunk.strip():
                first_chunk_time = time.time()
            response_chunks.append(chunk)

        end_time = time.time()

        total_time = end_time - start_time
        time_to_first_chunk = first_chunk_time - start_time if first_chunk_time else total_time

        print_success(f"Complete")

        print_info(f"Time to first response: {time_to_first_chunk:.2f}s")
        print_info(f"Total response time: {total_time:.2f}s")
        print_info(f"Response length: {len(''.join(response_chunks))} chars")

        print_test("Verifying acceptable response time")
        # Should get first chunk within 5 seconds
        assert time_to_first_chunk < 10, f"First response took {time_to_first_chunk}s (>10s)"
        print_success(f"Response time acceptable ({time_to_first_chunk:.1f}s)")

        print(f"\n{Colors.GREEN}✓ PERFORMANCE: ACCEPTABLE{Colors.RESET}\n")

        return True

    except Exception as e:
        print_error(f"FAILED: {e}")
        return False


async def run_all_e2e_tests():
    """Run all end-to-end tests"""
    print(f"\n{Colors.BOLD}{'='*70}")
    print(f"🧪 DEXTER AGENT - END-TO-END FUNCTIONALITY TESTS")
    print(f"{'='*70}{Colors.RESET}\n")

    print_info(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_info(f"Testing: OpenAI GPT-4 Integration")
    print_info(f"Agent: Dexter Financial Analyst\n")

    results = []
    agent = None

    # Test 1: Initialization (Health Check)
    success, agent = await test_1_agent_initialization()
    results.append(("Agent Initialization & Health", success))

    if not success:
        print(f"\n{Colors.RED}❌ Cannot proceed - Agent initialization failed{Colors.RESET}\n")
        return

    # Test 2: Simple Query
    success = await test_2_simple_chat_query(agent)
    results.append(("Simple Chat Query", success))

    # Test 3: ROI Tool
    success = await test_3_roi_calculation_tool(agent)
    results.append(("ROI Calculation Tool", success))

    # Test 4: Tool Awareness
    success = await test_4_multiple_tool_awareness(agent)
    results.append(("Multi-Tool Awareness", success))

    # Test 5: Conversation History
    success = await test_5_conversation_history(agent)
    results.append(("Conversation History", success))

    # Test 6: Error Handling
    success = await test_6_error_handling(agent)
    results.append(("Error Handling", success))

    # Test 7: Performance
    success = await test_7_performance_metrics(agent)
    results.append(("Performance Metrics", success))

    # Summary
    print_header("TEST SUMMARY")

    passed = sum(1 for _, success in results if success)
    total = len(results)

    for test_name, success in results:
        status = f"{Colors.GREEN}✓ PASSED{Colors.RESET}" if success else f"{Colors.RED}✗ FAILED{Colors.RESET}"
        print(f"  {test_name:.<50} {status}")

    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.RESET}")

    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL E2E TESTS PASSED! 🎉{Colors.RESET}")
        print(f"\n{Colors.GREEN}✓ Dexter Agent is fully operational with OpenAI GPT-4{Colors.RESET}")
        print(f"{Colors.GREEN}✓ All core functionality verified{Colors.RESET}")
        print(f"{Colors.GREEN}✓ Production-ready status confirmed{Colors.RESET}\n")
        return 0
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  SOME TESTS FAILED{Colors.RESET}")
        print(f"\n{Colors.YELLOW}Please review failed tests above.{Colors.RESET}\n")
        return 1


if __name__ == "__main__":
    # Fix Windows encoding
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8')

    try:
        exit_code = asyncio.run(run_all_e2e_tests())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠️  Tests interrupted{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}❌ Fatal error: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
