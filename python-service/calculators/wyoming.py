"""
Wyoming Unemployment Insurance Calculator

Formula:
- Weekly Benefit Amount (WBA) = 4% of base period wages
- Maximum: $560/week
- Minimum: $41/week
- Duration: 26 weeks (standard)

Source: Wyoming Department of Workforce Services
"""

from models import CalculationResult, create_result

# Wyoming constants (2026)
MAX_WEEKLY_BENEFIT = 560
MIN_WEEKLY_BENEFIT = 41
STANDARD_WEEKS = 26
PERCENTAGE = 0.04  # 4% of base period


def calculate(quarterly_earnings: list[float]) -> CalculationResult:
    """
    Calculate Wyoming unemployment benefits.

    Args:
        quarterly_earnings: List of quarterly earnings (at least 4 quarters)

    Returns:
        CalculationResult with weekly benefit, duration, and total
    """
    if len(quarterly_earnings) < 4:
        raise ValueError("Need at least 4 quarters of earnings")

    # Calculate total base period wages
    base_period_wages = sum(quarterly_earnings[:4])

    # Weekly benefit is 4% of base period wages
    weekly_benefit = base_period_wages * PERCENTAGE

    # Apply min/max caps
    weekly_benefit = max(MIN_WEEKLY_BENEFIT, min(MAX_WEEKLY_BENEFIT, weekly_benefit))

    return create_result(
        weekly=weekly_benefit,
        weeks=STANDARD_WEEKS,
        details={
            "base_period_wages": base_period_wages,
            "formula": f"${base_period_wages:,.2f} × {PERCENTAGE * 100}%",
            "pre_cap_weekly": round(base_period_wages * PERCENTAGE, 2),
            "cap_applied": weekly_benefit == MAX_WEEKLY_BENEFIT or weekly_benefit == MIN_WEEKLY_BENEFIT,
        }
    )
