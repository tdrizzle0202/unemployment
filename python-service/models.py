from pydantic import BaseModel
from typing import Optional


class CalculationResult(BaseModel):
    """Standard result format for all state calculators."""
    weekly_benefit_amount: float
    max_duration_weeks: int
    total_potential: float
    calculation_details: Optional[dict] = None


def create_result(
    weekly: float,
    weeks: int,
    details: Optional[dict] = None
) -> CalculationResult:
    """Helper to create a standardized calculation result."""
    return CalculationResult(
        weekly_benefit_amount=round(weekly, 2),
        max_duration_weeks=weeks,
        total_potential=round(weekly * weeks, 2),
        calculation_details=details,
    )
