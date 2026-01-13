"""
California Unemployment Insurance Calculator

Formula:
- Weekly Benefit Amount (WBA) = Highest Quarter Wages / 26
- Maximum: $450/week
- Minimum: $40/week
- Duration: 26 weeks (standard)

Source: California EDD
"""

from models import CalculationResult, create_result

# California constants (2026)
MAX_WEEKLY_BENEFIT = 450
MIN_WEEKLY_BENEFIT = 40
STANDARD_WEEKS = 26
DIVISOR = 26


def calculate(quarterly_earnings: list[float]) -> CalculationResult:
    """
    Calculate California unemployment benefits.

    Args:
        quarterly_earnings: List of quarterly earnings (at least 4 quarters)

    Returns:
        CalculationResult with weekly benefit, duration, and total
    """
    if len(quarterly_earnings) < 4:
        raise ValueError("Need at least 4 quarters of earnings")

    # Use highest quarter in base period
    high_quarter = max(quarterly_earnings[:4])

    # Calculate weekly benefit
    weekly_benefit = high_quarter / DIVISOR

    # Apply min/max caps
    weekly_benefit = max(MIN_WEEKLY_BENEFIT, min(MAX_WEEKLY_BENEFIT, weekly_benefit))

    return create_result(
        weekly=weekly_benefit,
        weeks=STANDARD_WEEKS,
        details={
            "high_quarter": high_quarter,
            "formula": f"${high_quarter:,.2f} / {DIVISOR}",
            "pre_cap_weekly": round(high_quarter / DIVISOR, 2),
            "cap_applied": weekly_benefit == MAX_WEEKLY_BENEFIT or weekly_benefit == MIN_WEEKLY_BENEFIT,
        }
    )
