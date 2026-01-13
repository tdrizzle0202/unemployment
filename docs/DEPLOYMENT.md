# Deployment Guide

## Prerequisites

- Node.js 20+
- Python 3.11+ (for microservice)
- Supabase account
- Anthropic API key
- OpenAI API key
- Vercel account
- Railway account (for Python service)

## Environment Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to initialize
3. Go to SQL Editor and run the complete schema from the tech spec
4. Note your project URL and keys from Settings > API

### 2. Configure Environment Variables

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...

# Unstructured.io
UNSTRUCTURED_API_KEY=your-key

# Python Service
PYTHON_SERVICE_URL=http://localhost:8000
```

## Local Development

### Start Next.js App

```bash
npm install
npm run dev
```

### Start Python Service

```bash
cd python-service
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

## Production Deployment

### Deploy Next.js to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
# Or deploy via CLI
npm i -g vercel
vercel --prod
```

### Deploy Python Service to Railway

1. Create new project on [railway.app](https://railway.app)
2. Connect your repository
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add any required environment variables
5. Deploy

Update `PYTHON_SERVICE_URL` in Vercel to point to Railway URL.

## Data Ingestion

### Ingest State Handbooks

1. Download handbook PDFs to `data/handbooks/raw/`
2. Run ingestion script:

```bash
npx tsx scripts/ingest-handbook.ts CA 2026
npx tsx scripts/ingest-handbook.ts TX 2026
npx tsx scripts/ingest-handbook.ts WY 2026
```

### Seed State Rules

```bash
npx tsx scripts/seed-state-rules.ts
```

## Monitoring

### Vercel Analytics

- Enabled by default for performance monitoring
- View at Vercel dashboard

### Langfuse (Optional)

1. Create account at [langfuse.com](https://langfuse.com)
2. Add credentials to environment
3. LLM calls will be automatically traced

### Error Tracking (Sentry)

1. Create Sentry project
2. Install: `npm install @sentry/nextjs`
3. Run setup: `npx @sentry/wizard@latest -i nextjs`

## Checklist

### Pre-Deploy

- [ ] All environment variables configured
- [ ] Database schema applied
- [ ] At least 3 states ingested
- [ ] State rules seeded
- [ ] Python service deployed and accessible

### Post-Deploy

- [ ] Test authentication flow
- [ ] Test assessment flow end-to-end
- [ ] Verify RAG retrieval works
- [ ] Check error logging
- [ ] Set up uptime monitoring

## Troubleshooting

### Common Issues

**"No handbook sections found"**
- Check if ingestion completed successfully
- Verify state_code matches exactly
- Lower match_threshold in retrieval

**"Python service unreachable"**
- Verify PYTHON_SERVICE_URL is correct
- Check Railway deployment status
- Ensure service is public/accessible

**"Supabase connection failed"**
- Verify environment variables
- Check Supabase project status
- Ensure IP is not blocked
