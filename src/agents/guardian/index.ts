/**
 * Guardian Agent — barrel exports.
 *
 * @module @/agents/guardian
 */

export { handleAdmission } from "./admission";
export type { AdmissionInput, AdmissionResult } from "./admission";

export { generateWeeklyReport } from "./report";
export type { WeeklyReport, SubjectSummary, WeakArea } from "./report";

export { checkEarlyWarnings } from "./early-warning";
export type { EarlyWarningResult, DetectedIssue } from "./early-warning";

export {
  scanEmergencyKeywords,
  createEmergencyIntervention,
  checkReportSafety,
  sanitiseReport,
  verifyStudentOwnership,
  filterVisibleStudents,
  EMERGENCY_KEYWORDS,
  FORBIDDEN_REPORT_PHRASES,
} from "./safety";
export type { SafetyCheckResult, EscalationRecord } from "./safety";

export { processGuardianReportJob } from "./worker";
