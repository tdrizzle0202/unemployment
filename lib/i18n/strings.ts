export type Language = 'en' | 'es'

export const strings = {
  en: {
    // Intro & Name
    intro: "Hi! I'm Bruno. I'll help you check if you qualify for unemployment benefits!",
    askName: "First, what's your name?",
    greet: (name: string) => `Nice to meet you, ${name}! Let's see if you qualify for benefits.`,
    askState: (name: string) => `Which state did you work in, ${name}?`,

    // Wages & Quarters
    wages: "How much did you earn before taxes in the last 12 months?",
    quarters: "How many quarters did you receive a paycheck?",
    highestQuarter: "Was your income steady, or was one quarter higher than the others?",
    hours: (min: number) => `How many hours did you work in the last 12 months? (Your state requires at least ${min} hours)`,
    weeks: (min: number) => `How many weeks did you work in the past year? (Your state requires at least ${min} weeks)`,

    // Highest quarter options
    evenQuarter: 'About the same each quarter',
    evenQuarterDesc: 'My income was fairly steady',
    higherQuarter: 'One quarter was higher',
    higherQuarterDesc: "I'll enter my highest quarter earnings",

    // Separation
    separation: "Now let's talk about why you left your job. How did your employment end?",
    assessing: "Let me analyze your eligibility based on everything you've told me...",
    laidOff: 'Laid off',
    laidOffDesc: 'Position eliminated, downsizing, company closed, or contract ended',
    quit: 'Quit',
    quitDesc: 'I resigned or left voluntarily',
    fired: 'Fired',
    firedDesc: 'I was terminated or let go by my employer',
    other: 'Other',
    otherDesc: 'Reduced hours, mutual agreement, or something else',

    // Follow-ups
    followUpLaidOff: "Got it. Can you briefly describe what happened? For example: Was it a company-wide layoff? Did your position get eliminated? Was it a temporary/contract job that ended?",
    followUpQuit: "I understand. What led you to quit? For example: Were there issues with working conditions, pay cuts, safety concerns, or was it for personal reasons?",
    followUpFired: "I see. Can you tell me more about what happened? What reason did your employer give? Do you agree with their reason?",
    followUpOther: "Can you describe your situation? For example: Were your hours reduced? Was it a mutual decision? Something else?",

    // Monetary results
    monetaryPass: "Great news! Based on your work history, you meet the monetary requirements for unemployment benefits.",
    monetaryFail: "Based on your work history, you may not meet the monetary requirements for unemployment benefits.",
    monetaryPassTitle: 'You Meet the Monetary Requirements',
    monetaryFailTitle: 'Monetary Requirements Not Met',
    monetaryNext: "Next, we'll discuss why you left your job. This helps determine your full eligibility for unemployment benefits.",
    whatYouCanDo: 'What you can do',
    contactOffice: 'Contact your state unemployment office',
    askAlternative: 'Ask about alternative base period calculations',
    checkCircumstances: 'Check if circumstances have changed',

    // Buttons & UI
    continue: 'Continue',
    back: 'back',
    startOver: 'Start Over',
    startNew: 'Start New Assessment',
    getAssessment: 'Get My Eligibility Assessment',

    // Placeholders
    searchStates: 'Search states...',
    typeName: 'Type your name...',
    typeMessage: 'Type your message...',
    describeWhat: 'Describe what happened...',

    // Status
    brunoThinking: 'Bruno is thinking...',
    analyzing: 'Analyzing your eligibility...',

    // Units
    quarterUnit: (n: number) => n === 1 ? 'quarter' : 'quarters',
    hoursUnit: 'hours',
    weeksUnit: 'weeks',

    // User response display
    inMyHighestQuarter: 'in my highest quarter',

    // Monetary eligibility explanations
    basePeriodWagesMeet: (amount: string, min: string) => `Base period wages (${amount}) meet the minimum ${min} requirement`,
    basePeriodWagesFail: (amount: string, min: string) => `Base period wages (${amount}) must be at least ${min}`,
    highestQuarterMeet: (amount: string, min: string) => `Highest quarter wages (${amount}) meet the minimum ${min} requirement`,
    highestQuarterFail: (amount: string, min: string) => `Highest quarter wages (${amount}) must be at least ${min}`,
    wagesOutsideHQMeet: (amount: string) => `Wages outside your highest quarter (${amount}) meet the requirement`,
    wagesOutsideHQFail: (amount: string, required: string) => `Wages outside your highest quarter (${amount}) must be at least ${required}`,
    multiplierMeet: (amount: string, multiplier: string) => `Base period wages (${amount}) meet the ${multiplier}x high quarter requirement`,
    multiplierFail: (amount: string, multiplier: string, hq: string, required: string) => `Base period wages (${amount}) must be at least ${multiplier}x your highest quarter (${hq}) = ${required}`,
    twoHighestQuartersMeet: (amount: string, min: string) => `Two highest quarters (${amount}) meet the minimum ${min} requirement`,
    twoHighestQuartersFail: (amount: string, min: string) => `Two highest quarters (${amount}) must be at least ${min}`,
    quartersWithWagesMeet: (count: number, required: number) => `You have wages in ${count} quarters, meeting the ${required}-quarter requirement`,
    quartersWithWagesFail: (count: number, required: number) => `You need wages in at least ${required} quarters, but only have ${count}`,
    hoursWorkedMeet: (hours: number, required: number) => `You worked ${hours} hours, meeting the ${required}-hour requirement`,
    hoursWorkedFail: (hours: number, required: number) => `You need at least ${required} hours worked, but only have ${hours}`,
    weeksWorkedMeet: (weeks: number, required: number) => `You worked ${weeks} weeks, meeting the ${required}-week requirement`,
    weeksWorkedFail: (weeks: number, required: number) => `You need at least ${required} weeks worked, but only have ${weeks}`,
    wbaMultiplierMeet: (amount: string, multiplier: string) => `Base period wages (${amount}) meet the ${multiplier}x WBA requirement`,
    wbaMultiplierFail: (amount: string, multiplier: string) => `Base period wages (${amount}) should be at least ${multiplier}x the weekly benefit amount`,
    minWageMultiplierMeet: (desc: string, amount: string) => `${desc} (${amount}) meet the minimum wage requirement`,
    minWageMultiplierFail: (desc: string, amount: string, required: string) => `${desc} (${amount}) must be at least ${required}`,
    stateAwwMeet: (desc: string, amount: string) => `${desc} (${amount}) meet the state wage requirement`,
    stateAwwFail: (desc: string, amount: string, required: string) => `${desc} (${amount}) must be at least ${required} based on state average wages`,

    // Value descriptions for translation
    descBasePeriodWages: 'Base period wages',
    descHighestQuarter: 'Highest quarter',
    descTwoHighestQuarters: 'Two highest quarters',
    descLastTwoQuarters: 'Last two quarters',
    descAvgTwoHighestQuarters: 'Average of two highest quarters',
    descWagesOutsideHQ: 'Wages outside high quarter',
    descQuarterlyWages: 'Quarterly wages',
    descAvgWeeklyWages: 'Average weekly wages',

    // Monetary eligibility summary
    monetarySummaryPass: (stateName: string) => `You appear to meet ${stateName}'s monetary eligibility requirements.`,
    monetarySummaryFail: (stateName: string, count: number) => `You may not meet ${stateName}'s monetary eligibility requirements (${count} requirement${count === 1 ? '' : 's'} not met).`,
    monetarySummaryMissing: (missing: string) => `Missing required information: ${missing}`,

    // Assessment results
    mostLikelyEligible: 'Most Likely Eligible',
    mostLikelyDesc: 'Based on your situation, you have a strong case for unemployment benefits.',
    likelyEligible: 'Likely Eligible',
    likelyDesc: 'Your case looks promising, though there are some factors to be aware of.',
    unlikelyEligible: 'Unlikely Eligible',
    unlikelyDesc: 'Based on your situation, there are significant factors that may affect your eligibility.',
    uncertainEligibility: 'Uncertain Eligibility',
    uncertainDesc: 'We need more information to make a clear determination.',
    confidenceScore: 'Confidence Score',
    ourAnalysis: 'Our Analysis',
    factorsToConsider: 'Factors to Consider',
    legalReferences: (count: number) => `Legal References (${count})`,
    assessmentDisclaimer: 'This assessment is for informational purposes only and does not guarantee eligibility. Your state\'s unemployment office will make the final determination.',
    note: 'Note',

    // Benefits display
    maxPotentialBenefits: 'Maximum Potential Benefits',
    weekly: 'Weekly',
    weeksLabel: 'Weeks',
    totalMax: 'Total Max',
    benefitsDisclaimer: (stateCode: string) => `Based on ${stateCode}'s 2025 unemployment benefit rates. Actual benefits depend on your earnings history.`,

    // Footer
    footer: 'This tool provides guidance only. Contact your state unemployment office for official information.',
  },

  es: {
    intro: "¡Hola! Soy Bruno. ¡Te ayudaré a verificar si calificas para beneficios de desempleo!",
    askName: "Primero, ¿cómo te llamas?",
    greet: (name: string) => `¡Mucho gusto, ${name}! Veamos si calificas para beneficios.`,
    askState: (name: string) => `¿En qué estado trabajaste, ${name}?`,

    wages: "¿Cuánto ganaste antes de impuestos en los últimos 12 meses?",
    quarters: "¿En cuántos trimestres recibiste un cheque de pago?",
    highestQuarter: "¿Tu ingreso fue constante, o un trimestre fue más alto que los otros?",
    hours: (min: number) => `¿Cuántas horas trabajaste en los últimos 12 meses? (Tu estado requiere al menos ${min} horas)`,
    weeks: (min: number) => `¿Cuántas semanas trabajaste en el último año? (Tu estado requiere al menos ${min} semanas)`,

    evenQuarter: 'Casi igual cada trimestre',
    evenQuarterDesc: 'Mi ingreso fue bastante estable',
    higherQuarter: 'Un trimestre fue más alto',
    higherQuarterDesc: 'Ingresaré mis ganancias del trimestre más alto',

    separation: "Ahora hablemos de por qué dejaste tu trabajo. ¿Cómo terminó tu empleo?",
    assessing: "Déjame analizar tu elegibilidad basándome en todo lo que me has contado...",
    laidOff: 'Despido',
    laidOffDesc: 'Puesto eliminado, reducción de personal, empresa cerró, o contrato terminó',
    quit: 'Renuncié',
    quitDesc: 'Renuncié o me fui voluntariamente',
    fired: 'Me despidieron',
    firedDesc: 'Fui despedido o terminado por mi empleador',
    other: 'Otro',
    otherDesc: 'Horas reducidas, acuerdo mutuo, u otra situación',

    followUpLaidOff: "Entendido. ¿Puedes describir brevemente qué pasó? Por ejemplo: ¿Fue un despido masivo? ¿Tu puesto fue eliminado? ¿Era un trabajo temporal que terminó?",
    followUpQuit: "Entiendo. ¿Qué te llevó a renunciar? Por ejemplo: ¿Hubo problemas con las condiciones de trabajo, recortes de salario, problemas de seguridad, o fue por razones personales?",
    followUpFired: "Ya veo. ¿Puedes contarme más sobre lo que pasó? ¿Qué razón dio tu empleador? ¿Estás de acuerdo con esa razón?",
    followUpOther: "¿Puedes describir tu situación? Por ejemplo: ¿Te redujeron las horas? ¿Fue una decisión mutua? ¿Algo más?",

    monetaryPass: "¡Buenas noticias! Según tu historial laboral, cumples con los requisitos monetarios para beneficios de desempleo.",
    monetaryFail: "Según tu historial laboral, es posible que no cumplas con los requisitos monetarios para beneficios de desempleo.",
    monetaryPassTitle: 'Cumples los Requisitos Monetarios',
    monetaryFailTitle: 'Requisitos Monetarios No Cumplidos',
    monetaryNext: "Ahora hablaremos de por qué dejaste tu trabajo. Esto ayuda a determinar tu elegibilidad completa.",
    whatYouCanDo: 'Qué puedes hacer',
    contactOffice: 'Contacta la oficina de desempleo de tu estado',
    askAlternative: 'Pregunta sobre cálculos alternativos del período base',
    checkCircumstances: 'Verifica si las circunstancias han cambiado',

    continue: 'Continuar',
    back: 'atrás',
    startOver: 'Empezar de Nuevo',
    startNew: 'Nueva Evaluación',
    getAssessment: 'Obtener Mi Evaluación',

    searchStates: 'Buscar estados...',
    typeName: 'Escribe tu nombre...',
    typeMessage: 'Escribe tu mensaje...',
    describeWhat: 'Describe lo que pasó...',

    brunoThinking: 'Bruno está pensando...',
    analyzing: 'Analizando tu elegibilidad...',

    quarterUnit: (n: number) => n === 1 ? 'trimestre' : 'trimestres',
    hoursUnit: 'horas',
    weeksUnit: 'semanas',

    // User response display
    inMyHighestQuarter: 'en mi trimestre más alto',

    // Monetary eligibility explanations
    basePeriodWagesMeet: (amount: string, min: string) => `Salarios del período base (${amount}) cumplen el requisito mínimo de ${min}`,
    basePeriodWagesFail: (amount: string, min: string) => `Salarios del período base (${amount}) deben ser al menos ${min}`,
    highestQuarterMeet: (amount: string, min: string) => `Salarios del trimestre más alto (${amount}) cumplen el requisito mínimo de ${min}`,
    highestQuarterFail: (amount: string, min: string) => `Salarios del trimestre más alto (${amount}) deben ser al menos ${min}`,
    wagesOutsideHQMeet: (amount: string) => `Salarios fuera de tu trimestre más alto (${amount}) cumplen el requisito`,
    wagesOutsideHQFail: (amount: string, required: string) => `Salarios fuera de tu trimestre más alto (${amount}) deben ser al menos ${required}`,
    multiplierMeet: (amount: string, multiplier: string) => `Salarios del período base (${amount}) cumplen el requisito de ${multiplier}x del trimestre más alto`,
    multiplierFail: (amount: string, multiplier: string, hq: string, required: string) => `Salarios del período base (${amount}) deben ser al menos ${multiplier}x tu trimestre más alto (${hq}) = ${required}`,
    twoHighestQuartersMeet: (amount: string, min: string) => `Dos trimestres más altos (${amount}) cumplen el requisito mínimo de ${min}`,
    twoHighestQuartersFail: (amount: string, min: string) => `Dos trimestres más altos (${amount}) deben ser al menos ${min}`,
    quartersWithWagesMeet: (count: number, required: number) => `Tienes salarios en ${count} trimestres, cumpliendo el requisito de ${required} trimestres`,
    quartersWithWagesFail: (count: number, required: number) => `Necesitas salarios en al menos ${required} trimestres, pero solo tienes ${count}`,
    hoursWorkedMeet: (hours: number, required: number) => `Trabajaste ${hours} horas, cumpliendo el requisito de ${required} horas`,
    hoursWorkedFail: (hours: number, required: number) => `Necesitas al menos ${required} horas trabajadas, pero solo tienes ${hours}`,
    weeksWorkedMeet: (weeks: number, required: number) => `Trabajaste ${weeks} semanas, cumpliendo el requisito de ${required} semanas`,
    weeksWorkedFail: (weeks: number, required: number) => `Necesitas al menos ${required} semanas trabajadas, pero solo tienes ${weeks}`,
    wbaMultiplierMeet: (amount: string, multiplier: string) => `Salarios del período base (${amount}) cumplen el requisito de ${multiplier}x del beneficio semanal`,
    wbaMultiplierFail: (amount: string, multiplier: string) => `Salarios del período base (${amount}) deben ser al menos ${multiplier}x el beneficio semanal`,
    minWageMultiplierMeet: (desc: string, amount: string) => `${desc} (${amount}) cumplen el requisito de salario mínimo`,
    minWageMultiplierFail: (desc: string, amount: string, required: string) => `${desc} (${amount}) deben ser al menos ${required}`,
    stateAwwMeet: (desc: string, amount: string) => `${desc} (${amount}) cumplen el requisito salarial del estado`,
    stateAwwFail: (desc: string, amount: string, required: string) => `${desc} (${amount}) deben ser al menos ${required} según el salario promedio del estado`,

    // Value descriptions for translation
    descBasePeriodWages: 'Salarios del período base',
    descHighestQuarter: 'Trimestre más alto',
    descTwoHighestQuarters: 'Dos trimestres más altos',
    descLastTwoQuarters: 'Últimos dos trimestres',
    descAvgTwoHighestQuarters: 'Promedio de los dos trimestres más altos',
    descWagesOutsideHQ: 'Salarios fuera del trimestre más alto',
    descQuarterlyWages: 'Salarios trimestrales',
    descAvgWeeklyWages: 'Salarios semanales promedio',

    // Monetary eligibility summary
    monetarySummaryPass: (stateName: string) => `Parece que cumples con los requisitos monetarios de elegibilidad de ${stateName}.`,
    monetarySummaryFail: (stateName: string, count: number) => `Es posible que no cumplas con los requisitos monetarios de ${stateName} (${count} requisito${count === 1 ? '' : 's'} no cumplido${count === 1 ? '' : 's'}).`,
    monetarySummaryMissing: (missing: string) => `Falta información requerida: ${missing}`,

    // Assessment results
    mostLikelyEligible: 'Muy Probablemente Elegible',
    mostLikelyDesc: 'Según tu situación, tienes un caso sólido para recibir beneficios de desempleo.',
    likelyEligible: 'Probablemente Elegible',
    likelyDesc: 'Tu caso parece prometedor, aunque hay algunos factores a considerar.',
    unlikelyEligible: 'Probablemente No Elegible',
    unlikelyDesc: 'Según tu situación, hay factores significativos que pueden afectar tu elegibilidad.',
    uncertainEligibility: 'Elegibilidad Incierta',
    uncertainDesc: 'Necesitamos más información para hacer una determinación clara.',
    confidenceScore: 'Puntuación de Confianza',
    ourAnalysis: 'Nuestro Análisis',
    factorsToConsider: 'Factores a Considerar',
    legalReferences: (count: number) => `Referencias Legales (${count})`,
    assessmentDisclaimer: 'Esta evaluación es solo para fines informativos y no garantiza la elegibilidad. La oficina de desempleo de tu estado tomará la determinación final.',
    note: 'Nota',

    // Benefits display
    maxPotentialBenefits: 'Beneficios Potenciales Máximos',
    weekly: 'Semanal',
    weeksLabel: 'Semanas',
    totalMax: 'Total Máx',
    benefitsDisclaimer: (stateCode: string) => `Basado en las tasas de beneficios de desempleo de ${stateCode} para 2025. Los beneficios reales dependen de tu historial de ingresos.`,

    footer: 'Esta herramienta solo proporciona orientación. Contacta la oficina de desempleo de tu estado para información oficial.',
  },
} as const

export function getStrings(lang: Language) {
  return strings[lang]
}

// Helper to translate monetary eligibility check explanations
export function translateCheckExplanation(
  check: { module: string; passed: boolean; actual_value: string | number; required_value: string | number; explanation: string },
  t: ReturnType<typeof getStrings>
): string {
  const actual = String(check.actual_value);
  const required = String(check.required_value);

  // Extract currency amounts from strings like "$90,000.00"
  const extractAmount = (s: string) => {
    const match = s.match(/\$[\d,.]+/);
    return match ? match[0] : s;
  };

  // Extract numbers from strings like "4 quarters"
  const extractNumber = (s: string) => {
    const match = s.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  switch (check.module) {
    case 'FLAT_FLOOR': {
      const amount = extractAmount(actual);
      const min = extractAmount(required);
      // Check if it's "Two highest quarters" or similar
      if (check.explanation.includes('Two highest quarters')) {
        return check.passed
          ? t.twoHighestQuartersMeet(amount, min)
          : t.twoHighestQuartersFail(amount, min);
      }
      return check.passed
        ? t.basePeriodWagesMeet(amount, min)
        : t.basePeriodWagesFail(amount, min);
    }

    case 'HQ_FLOOR': {
      const amount = extractAmount(actual);
      const min = extractAmount(required);
      return check.passed
        ? t.highestQuarterMeet(amount, min)
        : t.highestQuarterFail(amount, min);
    }

    case 'OUTSIDE_HQ': {
      const amount = extractAmount(actual);
      return check.passed
        ? t.wagesOutsideHQMeet(amount)
        : t.wagesOutsideHQFail(amount, required);
    }

    case 'HQ_MULTIPLIER': {
      const amount = extractAmount(actual);
      // Extract multiplier from required like "$67,500.00 (1.5x HQW)"
      const multiplierMatch = required.match(/([\d.]+)x/);
      const multiplier = multiplierMatch ? multiplierMatch[1] : '1.5';
      if (check.passed) {
        return t.multiplierMeet(amount, multiplier);
      }
      // For failure, need to extract HQ amount from explanation
      const hqMatch = check.explanation.match(/highest quarter \((\$[\d,.]+)\)/);
      const hq = hqMatch ? hqMatch[1] : '';
      const reqMatch = check.explanation.match(/= (\$[\d,.]+)/);
      const req = reqMatch ? reqMatch[1] : required;
      return t.multiplierFail(amount, multiplier, hq, req);
    }

    case 'MULTI_QUARTER': {
      const count = extractNumber(actual);
      const req = extractNumber(required);
      return check.passed
        ? t.quartersWithWagesMeet(count, req)
        : t.quartersWithWagesFail(count, req);
    }

    case 'HOURS_WORKED': {
      const hours = extractNumber(actual);
      const req = extractNumber(required);
      return check.passed
        ? t.hoursWorkedMeet(hours, req)
        : t.hoursWorkedFail(hours, req);
    }

    case 'WEEKS_WORKED': {
      const weeks = extractNumber(actual);
      const req = extractNumber(required);
      return check.passed
        ? t.weeksWorkedMeet(weeks, req)
        : t.weeksWorkedFail(weeks, req);
    }

    case 'WBA_MULTIPLIER': {
      const amount = extractAmount(actual);
      // Extract multiplier from required like "$3,600.00 (36x estimated WBA)"
      const multiplierMatch = required.match(/(\d+)x/);
      const multiplier = multiplierMatch ? multiplierMatch[1] : '36';
      return check.passed
        ? t.wbaMultiplierMeet(amount, multiplier)
        : t.wbaMultiplierFail(amount, multiplier);
    }

    case 'MIN_WAGE_MULTIPLIER': {
      const amount = extractAmount(actual);
      const reqAmount = extractAmount(required);
      // Translate value description from explanation
      const desc = translateValueDescription(check.explanation, t);
      return check.passed
        ? t.minWageMultiplierMeet(desc, amount)
        : t.minWageMultiplierFail(desc, amount, reqAmount);
    }

    case 'STATE_AWW': {
      const amount = extractAmount(actual);
      const reqAmount = extractAmount(required);
      // Translate value description from explanation
      const desc = translateValueDescription(check.explanation, t);
      return check.passed
        ? t.stateAwwMeet(desc, amount)
        : t.stateAwwFail(desc, amount, reqAmount);
    }

    default:
      // Fall back to original explanation for unhandled modules
      return check.explanation;
  }
}

// Helper to translate value descriptions in explanations
function translateValueDescription(explanation: string, t: ReturnType<typeof getStrings>): string {
  if (explanation.includes('Base period wages')) return t.descBasePeriodWages;
  if (explanation.includes('Two highest quarters')) return t.descTwoHighestQuarters;
  if (explanation.includes('Last two quarters')) return t.descLastTwoQuarters;
  if (explanation.includes('Average of two highest quarters')) return t.descAvgTwoHighestQuarters;
  if (explanation.includes('Highest quarter')) return t.descHighestQuarter;
  if (explanation.includes('Wages outside high quarter')) return t.descWagesOutsideHQ;
  if (explanation.includes('Quarterly wages')) return t.descQuarterlyWages;
  if (explanation.includes('Average weekly wages')) return t.descAvgWeeklyWages;
  return t.descBasePeriodWages; // default
}

// Helper to translate monetary eligibility summary
export function translateSummary(
  summary: string,
  result: { eligible: boolean; state_name: string; checks: { required: boolean; passed: boolean }[] },
  t: ReturnType<typeof getStrings>
): string {
  // Check for missing info pattern
  if (summary.startsWith('Missing required information:')) {
    const missing = summary.replace('Missing required information: ', '');
    return t.monetarySummaryMissing(missing);
  }

  // Check for pass/fail patterns
  if (result.eligible) {
    return t.monetarySummaryPass(result.state_name);
  } else {
    const failedCount = result.checks.filter(c => c.required && !c.passed).length;
    return t.monetarySummaryFail(result.state_name, failedCount);
  }
}
