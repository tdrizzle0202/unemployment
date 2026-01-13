# BenefitPath API Documentation

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://benefitpath.vercel.app/api`

## Authentication

All protected endpoints require a valid Supabase session. Include the session token in requests via cookies (handled automatically by the Supabase client).

## Endpoints

### POST /api/assess

Run an eligibility assessment.

**Request Body:**

```json
{
  "session_id": "uuid (optional - to resume existing session)",
  "state_code": "CA",
  "user_message": "I was laid off from my job last month",
  "user_inputs": {
    "separation_reason": "laid off",
    "employment_dates": {
      "start": "2023-01-15",
      "end": "2025-12-01"
    },
    "quarterly_earnings": [15000, 16000, 14500, 15500]
  }
}
```

**Response (Success):**

```json
{
  "session_id": "uuid",
  "message": "Assessment complete",
  "assessment": {
    "likelihood": "high",
    "confidence_score": 85,
    "risk_factors": [],
    "reasoning": "Based on your situation...",
    "citations": [
      {
        "section_id": "CA-1253",
        "section_title": "Eligibility Requirements",
        "content_excerpt": "To be eligible for benefits..."
      }
    ]
  },
  "benefit_calculation": {
    "weekly_amount": 450,
    "max_weeks": 26,
    "total_potential": 11700
  }
}
```

**Response (More Info Needed):**

```json
{
  "session_id": "uuid",
  "message": "More information needed",
  "missing_fields": ["quarterly_earnings"],
  "next_questions": [
    "What were your quarterly earnings for the past 4 quarters?"
  ]
}
```

### POST /api/chat

Streaming chat endpoint for conversational assessment.

**Request Body:**

```json
{
  "messages": [
    { "role": "user", "content": "I quit my job, am I eligible?" }
  ],
  "state_code": "CA",
  "session_id": "uuid (optional)"
}
```

**Response:**

Server-Sent Events stream with the assistant's response.

### POST /api/feedback

Submit outcome feedback for a completed assessment.

**Request Body:**

```json
{
  "session_id": "uuid",
  "reported_outcome": "approved",
  "actual_weekly_benefit": 425,
  "days_to_decision": 14,
  "user_notes": "Approved after phone interview"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Thank you for your feedback!"
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "details": [] // Optional validation errors
}
```

**Status Codes:**

- `400` - Invalid request (validation error)
- `401` - Unauthorized (not logged in)
- `404` - Resource not found
- `500` - Internal server error

## Rate Limits

- 10 assessments per hour per user
- 100 chat messages per hour per user
