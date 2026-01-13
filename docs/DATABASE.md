# Database Schema Documentation

## Overview

BenefitPath uses Supabase (PostgreSQL) with the pgvector extension for vector similarity search.

## Tables

### handbook_sections

Stores chunked handbook content with embeddings for RAG retrieval.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| state_code | text | State abbreviation (e.g., "CA") |
| effective_year | int | Year the handbook is effective |
| section_id | text | Identifier for the section |
| content | text | The actual text content |
| embedding | vector(1536) | OpenAI text-embedding-3-small vector |
| source_url | text | URL where handbook was obtained |
| metadata | jsonb | Additional metadata (title, page, etc.) |
| created_at | timestamptz | When the record was created |

**Indexes:**
- HNSW index on `embedding` for fast similarity search
- B-tree index on `(state_code, effective_year)`

### state_rules

Stores deterministic benefit calculation rules by state.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| state_code | text | State abbreviation |
| effective_year | int | Year the rules apply |
| effective_date | date | When rules became effective |
| expires_date | date | When rules expire (null if current) |
| version | text | Version identifier |
| max_benefit | decimal | Maximum weekly benefit |
| min_benefit | decimal | Minimum weekly benefit |
| formula_json | jsonb | Calculation formula details |
| created_at | timestamptz | When the record was created |

### assessment_sessions

Tracks user assessment sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users (nullable for anonymous) |
| state_code | text | State being assessed |
| status | text | 'in_progress', 'completed', 'abandoned' |
| user_inputs | jsonb | Accumulated user inputs |
| started_at | timestamptz | Session start time |
| completed_at | timestamptz | Session completion time |
| updated_at | timestamptz | Last update time |

### eligibility_assessments

Stores AI-generated eligibility assessments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | uuid | References assessment_sessions |
| eligibility_likelihood | text | 'high', 'medium', 'low' |
| confidence_score | int | 0-100 confidence percentage |
| risk_factors | jsonb | Array of risk factors |
| reasoning | text | Plain-text explanation |
| citations | jsonb | Array of handbook citations |
| assessment_version | text | Version of assessment logic |
| llm_model | text | Model used (e.g., claude-sonnet-4-20250514) |
| llm_prompt_tokens | int | Tokens in prompt |
| llm_completion_tokens | int | Tokens in response |
| llm_total_tokens | int | Total tokens used |
| processing_time_ms | int | Time to generate assessment |
| created_at | timestamptz | When assessment was created |

### benefit_calculations

Stores deterministic benefit calculations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | uuid | References assessment_sessions |
| assessment_id | uuid | References eligibility_assessments |
| weekly_benefit_amount | decimal | Calculated weekly benefit |
| max_duration_weeks | int | Maximum weeks of benefits |
| calculation_version | text | Version of calculation logic |
| state_rule_id | uuid | References state_rules used |
| created_at | timestamptz | When calculation was made |

### outcomes

Stores user-reported actual outcomes.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | uuid | References assessment_sessions |
| reported_outcome | text | 'approved', 'denied', 'pending' |
| actual_weekly_benefit | decimal | Actual benefit received |
| denial_reason | text | Reason for denial if denied |
| days_to_decision | int | Days from filing to decision |
| user_notes | text | Additional user comments |
| verification_level | text | 'self_reported', 'verified' |
| reported_at | timestamptz | When outcome was reported |

## Functions

### match_handbook_sections

Performs vector similarity search for RAG retrieval.

```sql
SELECT * FROM match_handbook_sections(
  query_embedding := '[...]'::vector(1536),
  match_threshold := 0.7,
  match_count := 5,
  filter_state := 'CA',
  filter_year := 2026
);
```

### get_active_state_rule

Retrieves the currently active rule for a state.

```sql
SELECT * FROM get_active_state_rule(
  p_state_code := 'CA',
  p_effective_year := 2026,
  p_as_of_date := CURRENT_DATE
);
```

## Migrations

Database schema is managed via Supabase SQL Editor. The complete schema SQL is available in the tech specification document.
