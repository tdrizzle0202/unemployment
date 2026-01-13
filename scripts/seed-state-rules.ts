import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StateRule {
  state_code: string;
  effective_year: number;
  effective_date: string;
  expires_date: string | null;
  version: string;
  max_benefit: number;
  min_benefit: number;
  formula_json: {
    weekly_benefit: {
      type: string;
      divisor?: number;
      percentage?: number;
    };
    duration: {
      base_weeks: number;
      max_weeks: number;
      variable: boolean;
    };
    base_period: {
      type: string;
      lookback_quarters: number;
    };
  };
}

const STATE_RULES_2026: StateRule[] = [
  {
    state_code: 'CA',
    effective_year: 2026,
    effective_date: '2026-01-01',
    expires_date: null,
    version: '2026.1',
    max_benefit: 450,
    min_benefit: 40,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 26,
      },
      duration: {
        base_weeks: 26,
        max_weeks: 26,
        variable: false,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
  {
    state_code: 'TX',
    effective_year: 2026,
    effective_date: '2026-01-01',
    expires_date: null,
    version: '2026.1',
    max_benefit: 577,
    min_benefit: 72,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 25,
      },
      duration: {
        base_weeks: 26,
        max_weeks: 26,
        variable: false,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
  {
    state_code: 'NY',
    effective_year: 2026,
    effective_date: '2026-01-01',
    expires_date: null,
    version: '2026.1',
    max_benefit: 504,
    min_benefit: 104,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 26,
      },
      duration: {
        base_weeks: 26,
        max_weeks: 26,
        variable: false,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
  {
    state_code: 'FL',
    effective_year: 2026,
    effective_date: '2026-01-01',
    expires_date: null,
    version: '2026.1',
    max_benefit: 275,
    min_benefit: 32,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 26,
      },
      duration: {
        base_weeks: 12,
        max_weeks: 23,
        variable: true,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
  {
    state_code: 'WA',
    effective_year: 2026,
    effective_date: '2026-01-01',
    expires_date: null,
    version: '2026.1',
    max_benefit: 999,
    min_benefit: 201,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 25,
      },
      duration: {
        base_weeks: 26,
        max_weeks: 26,
        variable: false,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
  {
    state_code: 'WY',
    effective_year: 2026,
    effective_date: '2026-01-01',
    expires_date: null,
    version: '2026.1',
    max_benefit: 560,
    min_benefit: 41,
    formula_json: {
      weekly_benefit: {
        type: 'base_period_percentage',
        percentage: 4,
      },
      duration: {
        base_weeks: 26,
        max_weeks: 26,
        variable: false,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
];

async function seedStateRules() {
  console.log('Seeding state rules...\n');

  for (const rule of STATE_RULES_2026) {
    console.log(`Inserting ${rule.state_code}...`);

    const { error } = await supabase
      .from('state_rules')
      .upsert(rule, {
        onConflict: 'state_code,effective_year,version',
      });

    if (error) {
      console.error(`  Error: ${error.message}`);
    } else {
      console.log(`  ✅ ${rule.state_code} inserted`);
    }
  }

  console.log('\nDone!');
}

seedStateRules().catch(console.error);
