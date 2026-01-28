"""
Quick Test - Verify Dexter Agent works with OpenAI
"""

import asyncio
from main import DexterAgent


async def quick_test():
    """Run a simple test query"""
    print("\n" + "="*60)
    print("🚀 DEXTER AGENT - QUICK TEST")
    print("="*60 + "\n")

    # Initialize agent
    print("Initializing Dexter Agent...")
    agent = DexterAgent()
    print(f"✓ Agent ready with model: {agent.model}")
    print(f"✓ {len(agent.tools)} financial tools available\n")

    # Test query
    test_query = "What is ROI and why is it important for financial analysis?"

    print(f"Query: {test_query}\n")
    print("Dexter's Response:")
    print("-" * 60)

    # Get response
    async for chunk in agent.chat(test_query):
        print(chunk, end="", flush=True)

    print("\n" + "-" * 60)
    print("\n✅ Test completed successfully!")
    print("\nTo start the full interactive agent, run: python main.py\n")


if __name__ == "__main__":
    asyncio.run(quick_test())
