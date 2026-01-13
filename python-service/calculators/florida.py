"""
Florida Unemployment Insurance Calculator

Formula:
- Weekly Benefit Amount (WBA) = Highest Quarter Wages / 26
- Maximum: $275/week
- Minimum: $32/week
- Duration: 12-23 weeks (varies based on state unemployment rate)

Note: Florida has one of the lowest maximum benefits in the country.

Source: Florida DEO
"""

from models import CalculationResult, create_result

# Florida constants (2026)
MAX_WEEKLY_BENEFIT = 275
MIN_WEEKLY_BENEFIT = 32
MIN_WEEKS = 12
MAX_WEEKS = 23
DIVISOR = 26


def calculate(quarterly_earnings: list[float]) -> CalculationResult:
    """
    Calculate Florida unemployment benefits.

    Args:
        quarterly_earnings: List of quarterly earnings (at least 4 quarters)

    Returns:
        CalculationResult with weekly benefit, duration, and total
    """
    if len(quarterly_earnings) < 4:
        raise ValueError("Need at least 4 quarters of earnings")

    # Use highest quarter in base period
    high_quarter = max(quarterly_earnings[:4])
    base_period_wages = sum(quarterly_earnings[:4])

    # Calculate weekly benefit
    weekly_benefit = high_quarter / DIVISOR

    # Apply min/max caps
    weekly_benefit = max(MIN_WEEKLY_BENEFIT, min(MAX_WEEKLY_BENEFIT, weekly_benefit))

    # Duration varies based on state unemployment rate
    # For now, use a simplified calculation based on base period wages
    # Higher earners tend to get more weeks
    if base_period_wages >= 50000:
        weeks = MAX_WEEKS
    elif base_period_wages >= 30000:
        weeks = 19
    else:
        weeks = MIN_WEEKS

    return create_result(
        weekly=weekly_benefit,
        weeks=weeks,
        details={
            "high_quarter": high_quarter,
            "base_period_wages": base_period_wages,
            "formula": f"${high_quarter:,.2f} / {DIVISOR}",
            "pre_cap_weekly": round(high_quarter / DIVISOR, 2),
            "cap_applied": weekly_benefit == MAX_WEEKLY_BENEFIT or weekly_benefit == MIN_WEEKLY_BENEFIT,
            "weeks_note": "Duration varies by state unemployment rate",
        }
    )
