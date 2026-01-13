-- =============================================================================
-- BenefitPath RAG Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Handbook sections with embeddings for RAG
CREATE TABLE IF NOT EXISTS handbook_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code TEXT NOT NULL,
    effective_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    section_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
    source_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique sections per state/year
    UNIQUE (state_code, effective_year, section_id)
);

-- State-specific benefit calculation rules
CREATE TABLE IF NOT EXISTS state_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code TEXT NOT NULL,
    effective_year INTEGER NOT NULL,
    effective_date DATE NOT NULL,
    expires_date DATE,
    version TEXT NOT NULL DEFAULT '1.0',
    max_benefit DECIMAL(10,2) NOT NULL,
    min_benefit DECIMAL(10,2) NOT NULL,
    max_weeks INTEGER NOT NULL DEFAULT 26,
    formula_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (state_code, effective_year, version)
);

-- Assessment sessions (conversations)
CREATE TABLE IF NOT EXISTS assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    state_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    user_inputs JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated eligibility assessments
CREATE TABLE IF NOT EXISTS eligibility_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    eligibility_likelihood TEXT NOT NULL CHECK (eligibility_likelihood IN ('high', 'medium', 'low')),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    risk_factors JSONB DEFAULT '[]',
    reasoning TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    assessment_version TEXT NOT NULL DEFAULT '1.0',
    llm_model TEXT,
    llm_prompt_tokens INTEGER,
    llm_completion_tokens INTEGER,
    llm_total_tokens INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benefit calculations
CREATE TABLE IF NOT EXISTS benefit_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES eligibility_assessments(id) ON DELETE SET NULL,
    weekly_benefit_amount DECIMAL(10,2) NOT NULL,
    max_duration_weeks INTEGER NOT NULL,
    calculation_version TEXT NOT NULL DEFAULT '1.0',
    state_rule_id UUID REFERENCES state_rules(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-reported outcomes for model improvement
CREATE TABLE IF NOT EXISTS outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    reported_outcome TEXT NOT NULL CHECK (reported_outcome IN ('approved', 'denied', 'pending', 'appealing')),
    actual_weekly_benefit DECIMAL(10,2),
    denial_reason TEXT,
    days_to_decision INTEGER,
    user_notes TEXT,
    verification_level TEXT DEFAULT 'self_reported' CHECK (verification_level IN ('self_reported', 'verified')),
    reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- HNSW index for fast vector similarity search
-- m = 16 (connections per node), ef_construction = 64 (build-time accuracy)
CREATE INDEX IF NOT EXISTS handbook_sections_embedding_idx
ON handbook_sections
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- B-tree indexes for filtering (used WITH vector search)
CREATE INDEX IF NOT EXISTS handbook_sections_state_year_idx
ON handbook_sections (state_code, effective_year);

CREATE INDEX IF NOT EXISTS handbook_sections_state_idx
ON handbook_sections (state_code);

-- B-tree indexes for other tables
CREATE INDEX IF NOT EXISTS state_rules_state_year_idx
ON state_rules (state_code, effective_year);

CREATE INDEX IF NOT EXISTS assessment_sessions_user_idx
ON assessment_sessions (user_id);

CREATE INDEX IF NOT EXISTS assessment_sessions_status_idx
ON assessment_sessions (status);

CREATE INDEX IF NOT EXISTS eligibility_assessments_session_idx
ON eligibility_assessments (session_id);

CREATE INDEX IF NOT EXISTS benefit_calculations_session_idx
ON benefit_calculations (session_id);

CREATE INDEX IF NOT EXISTS outcomes_session_idx
ON outcomes (session_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Vector similarity search with state/year filtering
CREATE OR REPLACE FUNCTION match_handbook_sections(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_state TEXT DEFAULT NULL,
    filter_year INT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    state_code TEXT,
    section_id TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hs.id,
        hs.state_code,
        hs.section_id,
        hs.content,
        hs.metadata,
        1 - (hs.embedding <=> query_embedding) AS similarity
    FROM handbook_sections hs
    WHERE
        -- Apply state filter if provided
        (filter_state IS NULL OR hs.state_code = filter_state)
        -- Apply year filter if provided
        AND (filter_year IS NULL OR hs.effective_year = filter_year)
        -- Apply similarity threshold
        AND 1 - (hs.embedding <=> query_embedding) > match_threshold
    ORDER BY hs.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Get active state rule
CREATE OR REPLACE FUNCTION get_active_state_rule(
    p_state_code TEXT,
    p_effective_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    state_code TEXT,
    effective_year INT,
    max_benefit DECIMAL,
    min_benefit DECIMAL,
    max_weeks INT,
    formula_json JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sr.id,
        sr.state_code,
        sr.effective_year,
        sr.max_benefit,
        sr.min_benefit,
        sr.max_weeks,
        sr.formula_json
    FROM state_rules sr
    WHERE
        sr.state_code = p_state_code
        AND sr.effective_year = p_effective_year
        AND sr.effective_date <= p_as_of_date
        AND (sr.expires_date IS NULL OR sr.expires_date > p_as_of_date)
    ORDER BY sr.effective_date DESC
    LIMIT 1;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on user-specific tables
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
ON assessment_sessions FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own sessions"
ON assessment_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own sessions"
ON assessment_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Assessments follow session ownership
CREATE POLICY "Users can view own assessments"
ON eligibility_assessments FOR SELECT
USING (
    session_id IN (
        SELECT id FROM assessment_sessions
        WHERE user_id = auth.uid() OR user_id IS NULL
    )
);

CREATE POLICY "Service role can insert assessments"
ON eligibility_assessments FOR INSERT
WITH CHECK (true);

-- Benefit calculations follow session ownership
CREATE POLICY "Users can view own calculations"
ON benefit_calculations FOR SELECT
USING (
    session_id IN (
        SELECT id FROM assessment_sessions
        WHERE user_id = auth.uid() OR user_id IS NULL
    )
);

CREATE POLICY "Service role can insert calculations"
ON benefit_calculations FOR INSERT
WITH CHECK (true);

-- Outcomes follow session ownership
CREATE POLICY "Users can view own outcomes"
ON outcomes FOR SELECT
USING (
    session_id IN (
        SELECT id FROM assessment_sessions
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own outcomes"
ON outcomes FOR INSERT
WITH CHECK (
    session_id IN (
        SELECT id FROM assessment_sessions
        WHERE user_id = auth.uid()
    )
);

-- Handbook sections are public read
ALTER TABLE handbook_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Handbook sections are publicly readable"
ON handbook_sections FOR SELECT
USING (true);

-- State rules are public read
ALTER TABLE state_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "State rules are publicly readable"
ON state_rules FOR SELECT
USING (true);

-- =============================================================================
-- DONE
-- =============================================================================
-- After running this, you can ingest documents with:
-- npx tsx scripts/ingest-handbook.ts CA 2026 ./path/to/handbook.pdf
