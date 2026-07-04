/**
 * Rules Engine — core types and validation runner.
 *
 * Every agent rule is a typed function that receives a RuleContext and
 * returns a RuleResult. The engine collects all rules for the requested
 * agent type and runs them in sequence, returning aggregated violations.
 *
 * @module @/rules/engine
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RuleContext {
  /** Which agent is being validated (TUTOR, CONTENT, ASSESSMENT, etc.) */
  agentType: string;
  /** Free-form input that triggered the rule check */
  input?: unknown;
  /** Output / response being validated */
  output?: unknown;
  /** Student context (id, gradeLevel, persona, etc.) */
  student?: Record<string, unknown>;
  /** Material / content being validated */
  material?: Record<string, unknown>;
  /** Arbitrary extra context for rule-specific logic */
  extra?: Record<string, unknown>;
}

export interface RuleViolation {
  ruleId: string;
  message: string;
  severity: "ERROR" | "WARN" | "INFO";
}

export interface RuleResult {
  passed: boolean;
  violations: RuleViolation[];
}

export type RuleCheck = (context: RuleContext) => RuleResult;

export interface Rule {
  id: string;
  agentType: string;
  description: string;
  check: RuleCheck;
  severity: "ERROR" | "WARN" | "INFO";
}

/* ------------------------------------------------------------------ */
/*  Rule registry                                                      */
/* ------------------------------------------------------------------ */

/** Global registry of all rules. Populated at import time by definitions. */
export const RULES: Rule[] = [];

/**
 * Register a rule. Called at module load time from definitions.
 * Registration order is the execution order during validation.
 */
export function registerRule(rule: Rule): void {
  RULES.push(rule);
}

/**
 * Clear all registered rules (for testing or hot-reload).
 */
export function clearRules(): void {
  RULES.length = 0;
}

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

/**
 * Run all rules for a given agent type against the provided context.
 *
 * @param context - The execution context containing agent type and data
 * @returns Aggregated result with all violations across matching rules
 */
export function validateAgainstRules(context: RuleContext): RuleResult {
  const agentRules = RULES.filter((r) => r.agentType === context.agentType);
  const violations: RuleViolation[] = [];

  for (const rule of agentRules) {
    try {
      const result = rule.check(context);
      if (!result.passed) {
        violations.push(...result.violations);
      }
    } catch (err) {
      // If a rule itself throws, treat it as an ERROR violation
      violations.push({
        ruleId: rule.id,
        message: `Rule "${rule.id}" threw: ${err instanceof Error ? err.message : String(err)}`,
        severity: "ERROR",
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Run a single rule check by rule ID.
 */
export function validateSingleRule(
  ruleId: string,
  context: RuleContext,
): RuleResult {
  const rule = RULES.find((r) => r.id === ruleId);
  if (!rule) {
    return {
      passed: false,
      violations: [
        {
          ruleId,
          message: `Unknown rule: "${ruleId}"`,
          severity: "ERROR",
        },
      ],
    };
  }
  try {
    return rule.check(context);
  } catch (err) {
    return {
      passed: false,
      violations: [
        {
          ruleId: rule.id,
          message: `Rule "${rule.id}" threw: ${err instanceof Error ? err.message : String(err)}`,
          severity: "ERROR",
        },
      ],
    };
  }
}

/**
 * Check if a specific rule ID exists in the registry.
 */
export function hasRule(ruleId: string): boolean {
  return RULES.some((r) => r.id === ruleId);
}
