/**
 * Rules — barrel export.
 *
 * @module @/rules
 */

export {
  validateAgainstRules,
  validateSingleRule,
  hasRule,
  clearRules,
  registerRule,
  RULES,
} from "./engine";
export type {
  RuleContext,
  RuleViolation,
  RuleResult,
  RuleCheck,
  Rule,
} from "./engine";

export {
  scanText,
  checkSafety,
  escalateToGuardian,
  blockAndLog,
  getFallbackForPersona,
  SENSITIVE_KEYWORDS,
  ESCALATION_CATEGORIES,
  PERSONA_FALLBACK_MESSAGES,
} from "./safety";
export type {
  SafetyCategory,
  SafetyMatch,
  SafetyResult,
} from "./safety";

export {
  runTutorRules,
  runContentRules,
  runAssessmentRules,
  runGuardianRules,
  runSchedulerRules,
  runCurriculumRules,
  runMediaRules,
} from "./runner";
export type {
  TutorRulesInput,
  TutorRulesResult,
  ContentRulesInput,
  ContentRulesResult,
  AssessmentRulesInput,
  AssessmentRulesResult,
  GuardianRulesInput,
  GuardianRulesResult,
  SchedulerRulesInput,
  SchedulerRulesResult,
  CurriculumRulesInput,
  CurriculumRulesResult,
  MediaRulesInput,
  MediaRulesResult,
} from "./runner";

// Import definitions to register all rules (side-effect)
import "./definitions";
