"""
Test Suite for Scenario Planning Tool
======================================

4 comprehensive test cases:
1. Product Launch - Neue Produkteinführung mit Unsicherheit
2. Market Expansion - Geografische Expansion mit Risiken
3. Cost Crisis - Kostenexplosion-Szenario
4. Optimistic Growth - Starkes Wachstumsszenario
"""

import sys
import io

# Fix Windows encoding for emoji output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from tools.scenario_planning import create_scenario_plan


def test_product_launch():
    """Test 1: Product Launch Scenario"""
    print("=" * 80)
    print("TEST 1: PRODUCT LAUNCH SCENARIO")
    print("=" * 80)
    print("Szenario: Launch einer neuen Produktlinie mit unsicherer Marktakzeptanz")
    print()

    result = create_scenario_plan(
        planning_horizon="2025",
        base_revenue=500000,
        base_costs=300000,
        assumptions=[
            {
                "name": "Revenue Growth",
                "best_case": 25.0,    # Produkt wird Hit
                "base_case": 15.0,    # Solide Adoption
                "worst_case": 5.0,    # Schwache Adoption
                "unit": "%",
                "impact_level": "High"
            },
            {
                "name": "Cost Inflation",
                "best_case": 2.0,     # Stabile Kosten
                "base_case": 5.0,     # Normale Inflation
                "worst_case": 10.0,   # Hohe Inflation
                "unit": "%",
                "impact_level": "Medium"
            },
            {
                "name": "Market Penetration",
                "best_case": 8.0,     # Schnelle Durchdringung
                "base_case": 5.0,     # Moderate Durchdringung
                "worst_case": 2.0,    # Langsame Durchdringung
                "unit": "%",
                "impact_level": "High"
            }
        ]
    )

    if "error" in result:
        print(f"❌ ERROR: {result['error']}")
        return False
    else:
        print(result["formatted_output"])
        print()
        print("✅ TEST 1 PASSED")
        return True


def test_market_expansion():
    """Test 2: Market Expansion Scenario"""
    print("\n" + "=" * 80)
    print("TEST 2: MARKET EXPANSION SCENARIO")
    print("=" * 80)
    print("Szenario: Expansion in neue geografische Märkte (z.B. USA → Europe)")
    print()

    result = create_scenario_plan(
        planning_horizon="2025-2026",
        base_revenue=1000000,
        base_costs=650000,
        assumptions=[
            {
                "name": "Revenue Growth (New Market)",
                "best_case": 40.0,    # Starke Expansion
                "base_case": 20.0,    # Moderate Expansion
                "worst_case": 5.0,    # Schwache Expansion
                "unit": "%",
                "impact_level": "High"
            },
            {
                "name": "Setup Costs",
                "best_case": 50000,   # Niedrige Setup-Kosten
                "base_case": 100000,  # Normale Setup-Kosten
                "worst_case": 200000, # Hohe Setup-Kosten
                "unit": "€",
                "impact_level": "High"
            },
            {
                "name": "Operating Cost Increase",
                "best_case": 15.0,    # Effiziente Ops
                "base_case": 25.0,    # Normale Overhead
                "worst_case": 40.0,   # Hohe Overhead
                "unit": "%",
                "impact_level": "Medium"
            },
            {
                "name": "Currency Risk",
                "best_case": -2.0,    # Günstiger Wechselkurs
                "base_case": 0.0,     # Neutraler Wechselkurs
                "worst_case": 5.0,    # Ungünstiger Wechselkurs
                "unit": "%",
                "impact_level": "Low"
            }
        ],
        probabilities={
            "best_case": 0.25,
            "base_case": 0.50,
            "worst_case": 0.25
        }
    )

    if "error" in result:
        print(f"❌ ERROR: {result['error']}")
        return False
    else:
        print(result["formatted_output"])
        print()
        print("✅ TEST 2 PASSED")
        return True


def test_cost_crisis():
    """Test 3: Cost Crisis Scenario"""
    print("\n" + "=" * 80)
    print("TEST 3: COST CRISIS SCENARIO")
    print("=" * 80)
    print("Szenario: Plötzliche Kostenexplosion (Energie, Supply Chain, Personal)")
    print()

    result = create_scenario_plan(
        planning_horizon="Q1-Q4 2025",
        base_revenue=800000,
        base_costs=500000,
        assumptions=[
            {
                "name": "Revenue Growth",
                "best_case": 8.0,     # Leichtes Wachstum
                "base_case": 3.0,     # Stagnation
                "worst_case": -5.0,   # Rückgang
                "unit": "%",
                "impact_level": "Medium"
            },
            {
                "name": "Energy Cost Inflation",
                "best_case": 10.0,    # Moderate Steigerung
                "base_case": 25.0,    # Starke Steigerung
                "worst_case": 50.0,   # Extreme Steigerung
                "unit": "%",
                "impact_level": "High"
            },
            {
                "name": "Labor Cost Increase",
                "best_case": 3.0,     # Normale Steigerung
                "base_case": 8.0,     # Hohe Steigerung
                "worst_case": 15.0,   # Sehr hohe Steigerung
                "unit": "%",
                "impact_level": "High"
            },
            {
                "name": "Supply Chain Disruption",
                "best_case": 0.0,     # Keine Disruption
                "base_case": 5.0,     # Moderate Disruption
                "worst_case": 12.0,   # Schwere Disruption
                "unit": "%",
                "impact_level": "Medium"
            }
        ],
        probabilities={
            "best_case": 0.15,
            "base_case": 0.60,
            "worst_case": 0.25  # Höhere Worst-Case Probability
        }
    )

    if "error" in result:
        print(f"❌ ERROR: {result['error']}")
        return False
    else:
        print(result["formatted_output"])
        print()
        print("✅ TEST 3 PASSED")
        return True


def test_optimistic_growth():
    """Test 4: Optimistic Growth Scenario"""
    print("\n" + "=" * 80)
    print("TEST 4: OPTIMISTIC GROWTH SCENARIO")
    print("=" * 80)
    print("Szenario: Starkes Marktwachstum mit günstigen Bedingungen")
    print()

    result = create_scenario_plan(
        planning_horizon="2025-2027",
        base_revenue=2000000,
        base_costs=1200000,
        assumptions=[
            {
                "name": "Revenue Growth (Market Boom)",
                "best_case": 50.0,    # Explosive Growth
                "base_case": 30.0,    # Strong Growth
                "worst_case": 15.0,   # Moderate Growth
                "unit": "%",
                "impact_level": "High"
            },
            {
                "name": "Cost Efficiency Gains",
                "best_case": -10.0,   # Kosten sinken
                "base_case": -5.0,    # Leichte Reduktion
                "worst_case": 0.0,    # Keine Änderung
                "unit": "%",
                "impact_level": "Medium"
            },
            {
                "name": "Market Share Gain",
                "best_case": 12.0,    # Dominanz
                "base_case": 7.0,     # Starke Position
                "worst_case": 3.0,    # Moderate Position
                "unit": "%",
                "impact_level": "High"
            },
            {
                "name": "Pricing Power",
                "best_case": 8.0,     # Starke Pricing Power
                "base_case": 4.0,     # Moderate Pricing Power
                "worst_case": 0.0,    # Keine Pricing Power
                "unit": "%",
                "impact_level": "Medium"
            }
        ],
        probabilities={
            "best_case": 0.30,  # Höhere Best-Case Probability
            "base_case": 0.55,
            "worst_case": 0.15
        }
    )

    if "error" in result:
        print(f"❌ ERROR: {result['error']}")
        return False
    else:
        print(result["formatted_output"])
        print()
        print("✅ TEST 4 PASSED")
        return True


def test_error_handling():
    """Test 5: Error Handling"""
    print("\n" + "=" * 80)
    print("TEST 5: ERROR HANDLING")
    print("=" * 80)

    # Test 5.1: No assumptions
    print("\nTest 5.1: No Assumptions")
    result = create_scenario_plan(
        planning_horizon="2025",
        base_revenue=100000,
        base_costs=50000,
        assumptions=[]
    )
    assert "error" in result, "Should return error for no assumptions"
    print(f"✅ Correctly caught: {result['error']}")

    # Test 5.2: Invalid probabilities
    print("\nTest 5.2: Invalid Probabilities (don't sum to 1.0)")
    result = create_scenario_plan(
        planning_horizon="2025",
        base_revenue=100000,
        base_costs=50000,
        assumptions=[
            {
                "name": "Revenue Growth",
                "best_case": 10.0,
                "base_case": 5.0,
                "worst_case": 0.0,
                "unit": "%",
                "impact_level": "High"
            }
        ],
        probabilities={
            "best_case": 0.5,
            "base_case": 0.5,
            "worst_case": 0.5  # Sum = 1.5 (invalid!)
        }
    )
    assert "error" in result, "Should return error for invalid probabilities"
    print(f"✅ Correctly caught: {result['error']}")

    # Test 5.3: Invalid revenue/costs
    print("\nTest 5.3: Invalid Revenue (negative)")
    result = create_scenario_plan(
        planning_horizon="2025",
        base_revenue=-100000,
        base_costs=50000,
        assumptions=[
            {
                "name": "Revenue Growth",
                "best_case": 10.0,
                "base_case": 5.0,
                "worst_case": 0.0,
                "unit": "%",
                "impact_level": "High"
            }
        ]
    )
    assert "error" in result, "Should return error for negative revenue"
    print(f"✅ Correctly caught: {result['error']}")

    print("\n✅ ALL ERROR HANDLING TESTS PASSED")
    return True


def run_all_tests():
    """Run all test scenarios"""
    print("\n" + "=" * 80)
    print("SCENARIO PLANNING TOOL - COMPREHENSIVE TEST SUITE")
    print("=" * 80)
    print()

    tests = [
        ("Product Launch", test_product_launch),
        ("Market Expansion", test_market_expansion),
        ("Cost Crisis", test_cost_crisis),
        ("Optimistic Growth", test_optimistic_growth),
        ("Error Handling", test_error_handling)
    ]

    results = []

    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ TEST FAILED: {test_name}")
            print(f"   Error: {str(e)}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    passed = sum(1 for _, success in results if success)
    total = len(results)

    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name:25} {status}")

    print()
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return True
    else:
        print("❌ SOME TESTS FAILED")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
