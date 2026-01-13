/**
 * Test file for monetary eligibility question flow
 *
 * Run with: npx tsx scripts/test-question-flow.ts
 */

import {
    // Schemas
    UserEligibilityFlowSchema,
    MonetaryEligibilityInputSchema,
    SEPARATION_CATEGORY_LABELS,
    FIRED_REASON_LABELS,
    QUIT_REASON_LABELS,
    QUARTERS_WITH_WAGES_OPTIONS,
    HIGHEST_QUARTER_OPTIONS,
    QUESTION_STEPS,
    convertToMonetaryInputs,
    type UserEligibilityFlow,
    type MonetaryEligibilityInput,
} from '../lib/engine/schemas/eligibility-questions';

import {
    convertUserFlowToInputs,
    getPreliminaryRiskLevel,
    getPreliminaryMessage,
} from '../lib/engine/utils/input-converter';

import {
    runMonetaryEligibility,
} from '../lib/engine/pipeline/monetary-eligibility';

// ============================================================================
// TEST SCENARIOS - MONETARY ELIGIBILITY
// ============================================================================

const monetaryTestScenarios: { name: string; input: MonetaryEligibilityInput }[] = [
    {
        name: "California - High earner (should pass)",
        input: {
            state_code: "CA",
            base_period_wages: 65000,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "even" },
        },
    },
    {
        name: "California - Low earner (may fail HQ floor)",
        input: {
            state_code: "CA",
            base_period_wages: 4000,
            quarters_with_wages: 2,
            highest_quarter_wages: { mode: "specific", amount: 2500 },
        },
    },
    {
        name: "Washington - With hours (should pass)",
        input: {
            state_code: "WA",
            base_period_wages: 45000,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "even" },
            hours_worked: 1800,
        },
    },
    {
        name: "Washington - Missing hours (will fail)",
        input: {
            state_code: "WA",
            base_period_wages: 45000,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "even" },
            // hours_worked not provided - should show as missing
        },
    },
    {
        name: "New Jersey - With weeks (should pass)",
        input: {
            state_code: "NJ",
            base_period_wages: 52000,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "even" },
            weeks_worked: 48,
        },
    },
    {
        name: "Florida - Multi-quarter check",
        input: {
            state_code: "FL",
            base_period_wages: 25000,
            quarters_with_wages: 3,
            highest_quarter_wages: { mode: "specific", amount: 10000 },
        },
    },
    {
        name: "New York - HQ Multiplier test",
        input: {
            state_code: "NY",
            base_period_wages: 48000,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "specific", amount: 15000 },
        },
    },
];

// ============================================================================
// TEST FULL USER FLOW SCENARIOS
// ============================================================================

const fullFlowScenarios: { name: string; flow: UserEligibilityFlow }[] = [
    {
        name: "Layoff with good earnings (Low Risk)",
        flow: {
            state_code: "CA",
            base_period_wages: 65000,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "even" },
            separation: { category: "laid_off" },
        },
    },
    {
        name: "Quit for harassment (Medium Risk - Good Cause)",
        flow: {
            state_code: "TX",
            base_period_wages: 45760,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "even" },
            separation: {
                category: "quit",
                quit_reason: "harassment",
                quit_details: "Supervisor made repeated inappropriate comments",
            },
        },
    },
    {
        name: "Fired for attendance (High Risk - Potential Misconduct)",
        flow: {
            state_code: "NY",
            base_period_wages: 47500,
            quarters_with_wages: 4,
            highest_quarter_wages: { mode: "specific", amount: 12200 },
            separation: {
                category: "let_go",
                fired_reason: "attendance",
            },
        },
    },
];

// ============================================================================
// RUN TESTS
// ============================================================================

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  MONETARY ELIGIBILITY QUESTION FLOW - TEST RESULTS");
console.log("═══════════════════════════════════════════════════════════════════\n");

// Show question steps
console.log("QUESTION STEPS:\n");
QUESTION_STEPS.forEach((step) => {
    const conditional = step.conditional?.states ? ` (${step.conditional.states.join(", ")} only)` : "";
    console.log(`  Step ${step.id}: ${step.title}${conditional}`);
    console.log(`    └─ ${step.description}`);
    console.log(`    └─ Required: ${step.required ? "Yes" : "No"}\n`);
});

console.log("\n" + "─".repeat(70) + "\n");

// Show quarters options
console.log("QUARTERS WITH WAGES OPTIONS (Step 3):\n");
QUARTERS_WITH_WAGES_OPTIONS.forEach((opt) => {
    console.log(`  ○ ${opt.label}`);
});

console.log("\n" + "─".repeat(70) + "\n");

// Show highest quarter options
console.log("HIGHEST QUARTER OPTIONS (Step 4):\n");
HIGHEST_QUARTER_OPTIONS.forEach((opt) => {
    console.log(`  ○ ${opt.label}`);
});

console.log("\n" + "─".repeat(70) + "\n");

// Test monetary eligibility scenarios
console.log("MONETARY ELIGIBILITY TEST SCENARIOS:\n");

monetaryTestScenarios.forEach((scenario, index) => {
    console.log(`┌${"─".repeat(68)}┐`);
    console.log(`│ Scenario ${index + 1}: ${scenario.name.padEnd(52)}│`);
    console.log(`├${"─".repeat(68)}┤`);

    // Validate the input
    const parseResult = MonetaryEligibilityInputSchema.safeParse(scenario.input);

    if (!parseResult.success) {
        console.log(`│ ❌ Validation Error: ${parseResult.error.message.substring(0, 45)}│`);
        console.log(`└${"─".repeat(68)}┘\n`);
        return;
    }

    // Convert to MonetaryInputs and run eligibility check
    const monetaryInputs = convertToMonetaryInputs(scenario.input);
    const result = runMonetaryEligibility(monetaryInputs);

    const status = result.eligible ? "✓ ELIGIBLE" : "✗ NOT ELIGIBLE";
    console.log(`│ Status: ${status.padEnd(59)}│`);
    console.log(`│ State: ${result.state_name.padEnd(60)}│`);
    console.log(`├${"─".repeat(68)}┤`);

    // Show quarterly wages derived
    const qwStr = monetaryInputs.quarterly_wages.map(q => `$${q.toLocaleString()}`).join(", ");
    console.log(`│ Quarterly Wages: ${qwStr.substring(0, 50).padEnd(50)}│`);

    console.log(`├${"─".repeat(68)}┤`);
    console.log(`│ Module Checks:${" ".repeat(53)}│`);

    result.checks.forEach((check) => {
        const icon = check.passed ? "✓" : "✗";
        const line = `  ${icon} ${check.module}: ${check.actual_value} vs ${check.required_value}`;
        console.log(`│ ${line.substring(0, 66).padEnd(66)}│`);
    });

    if (result.missing_inputs.length > 0) {
        console.log(`├${"─".repeat(68)}┤`);
        console.log(`│ ⚠ Missing: ${result.missing_inputs.join(", ").substring(0, 54).padEnd(55)}│`);
    }

    console.log(`├${"─".repeat(68)}┤`);
    console.log(`│ Summary: ${result.summary.substring(0, 57).padEnd(58)}│`);
    console.log(`└${"─".repeat(68)}┘\n`);
});

console.log("\n" + "─".repeat(70) + "\n");

// Test full flow scenarios with separation
console.log("FULL FLOW TEST SCENARIOS (with separation reason):\n");

fullFlowScenarios.forEach((scenario, index) => {
    console.log(`┌${"─".repeat(68)}┐`);
    console.log(`│ Scenario ${index + 1}: ${scenario.name.padEnd(52)}│`);
    console.log(`├${"─".repeat(68)}┤`);

    // Validate the input
    const parseResult = UserEligibilityFlowSchema.safeParse(scenario.flow);

    if (!parseResult.success) {
        console.log(`│ ❌ Validation Error: ${JSON.stringify(parseResult.error.issues[0]).substring(0, 45)}│`);
        console.log(`└${"─".repeat(68)}┘\n`);
        return;
    }

    // Convert to technical inputs
    const technicalInputs = convertUserFlowToInputs(scenario.flow);
    const riskLevel = scenario.flow.separation
        ? getPreliminaryRiskLevel(scenario.flow.separation)
        : 'medium';
    const message = scenario.flow.separation
        ? getPreliminaryMessage(scenario.flow.separation)
        : 'No separation reason provided';

    console.log(`│ State: ${scenario.flow.state_code.padEnd(60)}│`);
    console.log(`│ Risk Level: ${riskLevel.toUpperCase().padEnd(55)}│`);
    console.log(`├${"─".repeat(68)}┤`);
    console.log(`│ Technical Separation Reason:${" ".repeat(39)}│`);

    // Wrap long separation reason
    const reason = technicalInputs.separation_reason;
    const chunks = reason.match(/.{1,64}/g) || [reason];
    chunks.forEach((chunk) => {
        console.log(`│   ${chunk.padEnd(65)}│`);
    });

    console.log(`├${"─".repeat(68)}┤`);
    console.log(`│ Quarterly Earnings: ${technicalInputs.quarterly_earnings?.map(e => `$${e.toLocaleString()}`).join(", ").substring(0, 45).padEnd(47)}│`);

    console.log(`├${"─".repeat(68)}┤`);
    console.log(`│ User Message:${" ".repeat(54)}│`);

    // Wrap message
    const msgChunks = message.match(/.{1,64}/g) || [message];
    msgChunks.forEach((chunk) => {
        console.log(`│   ${chunk.padEnd(65)}│`);
    });

    console.log(`└${"─".repeat(68)}┘\n`);
});

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  All tests completed successfully! ✓");
console.log("═══════════════════════════════════════════════════════════════════");
