from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from calculators import california, texas, wyoming, florida, new_york, washington

app = FastAPI(
    title="BenefitPath Calculator Service",
    description="Unemployment benefit calculation microservice",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Calculator registry
CALCULATORS = {
    "CA": california.calculate,
    "TX": texas.calculate,
    "NY": new_york.calculate,
    "FL": florida.calculate,
    "WA": washington.calculate,
    "WY": wyoming.calculate,
}


class CalculationRequest(BaseModel):
    state_code: str
    quarterly_earnings: list[float]


class CalculationResponse(BaseModel):
    weekly_benefit_amount: float
    max_duration_weeks: int
    total_potential: float
    calculation_details: Optional[dict] = None


class StateRulesResponse(BaseModel):
    state_code: str
    max_benefit: float
    min_benefit: float
    standard_weeks: int
    formula_description: str


@app.get("/")
async def root():
    return {
        "service": "BenefitPath Calculator",
        "version": "1.0.0",
        "supported_states": list(CALCULATORS.keys()),
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/calculate", response_model=CalculationResponse)
async def calculate_benefits(request: CalculationRequest):
    state_code = request.state_code.upper()

    if state_code not in CALCULATORS:
        raise HTTPException(
            status_code=400,
            detail=f"State {state_code} not supported. Supported states: {list(CALCULATORS.keys())}",
        )

    if len(request.quarterly_earnings) < 4:
        raise HTTPException(
            status_code=400,
            detail="At least 4 quarters of earnings are required",
        )

    if any(e < 0 for e in request.quarterly_earnings):
        raise HTTPException(
            status_code=400,
            detail="Earnings cannot be negative",
        )

    calculator = CALCULATORS[state_code]
    result = calculator(request.quarterly_earnings)

    return result


@app.get("/rules/{state_code}", response_model=StateRulesResponse)
async def get_state_rules(state_code: str):
    state_code = state_code.upper()

    # State rules metadata
    rules = {
        "CA": {
            "max_benefit": 450,
            "min_benefit": 40,
            "standard_weeks": 26,
            "formula_description": "Highest quarter wages divided by 26",
        },
        "TX": {
            "max_benefit": 577,
            "min_benefit": 72,
            "standard_weeks": 26,
            "formula_description": "Highest quarter wages divided by 25",
        },
        "NY": {
            "max_benefit": 504,
            "min_benefit": 104,
            "standard_weeks": 26,
            "formula_description": "Average weekly wage times 0.5, max $504",
        },
        "FL": {
            "max_benefit": 275,
            "min_benefit": 32,
            "standard_weeks": 12,
            "formula_description": "Highest quarter wages divided by 26, 12-23 weeks based on state rate",
        },
        "WA": {
            "max_benefit": 999,
            "min_benefit": 201,
            "standard_weeks": 26,
            "formula_description": "Highest quarter wages divided by 25",
        },
        "WY": {
            "max_benefit": 560,
            "min_benefit": 41,
            "standard_weeks": 26,
            "formula_description": "4% of base period wages, up to $560/week",
        },
    }

    if state_code not in rules:
        raise HTTPException(
            status_code=404,
            detail=f"Rules for state {state_code} not found",
        )

    return StateRulesResponse(
        state_code=state_code,
        **rules[state_code],
    )


@app.get("/states")
async def list_supported_states():
    return {
        "supported_states": list(CALCULATORS.keys()),
        "count": len(CALCULATORS),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
