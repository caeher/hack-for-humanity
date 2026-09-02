/**
 * Standardized provenance metadata for explainable insights across CRI portals.
 * Keep convex/lib/provenance.ts in sync when changing shapes or builder logic.
 */

import type { ConfidenceLevel, EffectDirection } from '@/lib/patternDetection'
import {
  computeSymptomTotalComputation,
  METHODOLOGY_COPY,
  SYMPTOM_METHODOLOGY_VERSION,
  TREND_REQUIREMENTS,
  type ContributingRating,
  type SymptomTotalComputation,
  type TrendSummary,
} from '@/lib/symptomMethodology'

export const PROVENANCE_SCHEMA_VERSION = '1.0.0' as const

export type ProvenanceSourceKind =
  | 'patient_report'
  | 'symptom_total'
  | 'computed_trend'
  | 'pattern_insight'
  | 'safety_outcome'
  | 'clinician_content'
  | 'ai_generated'

export type ProvenanceConfidenceState =
  | 'high'
  | 'moderate'
  | 'low'
  | 'insufficient'
  | 'not_applicable'

export interface ProvenanceSourceRecord {
  label: string
  recordType: string
  recordId?: string
  date?: string
  visible: boolean
}

export interface ProvenanceEvidenceReference {
  label: string
  citation?: string
  authority?: string
  ruleId?: string
  version?: string
}

export interface ProvenanceContributingCategory {
  label: string
  rating: number | null
  visible: boolean
}

export interface ProvenanceMetadata {
  schemaVersion: typeof PROVENANCE_SCHEMA_VERSION
  sourceKind: ProvenanceSourceKind
  sourceKindLabel: string
  plainLanguageRationale: string
  technicalDetail?: string
  dateRangeStart: string | null
  dateRangeEnd: string | null
  methodName: string
  methodVersion: string
  confidence: ProvenanceConfidenceState
  confidenceExplanation: string
  sourceRecords: ProvenanceSourceRecord[]
  evidenceReferences: ProvenanceEvidenceReference[]
  contributingCategories?: ProvenanceContributingCategory[]
  recomputedFromAmendment?: boolean
  amendmentNote?: string
  nonDiagnosticDisclaimer: string
  restrictedDetailCount?: number
}

export interface ProvenanceViewerContext {
  canViewPrivateNotes?: boolean
  canViewClinicianNotes?: boolean
}

const SOURCE_KIND_LABELS: Record<ProvenanceSourceKind, string> = {
  patient_report: 'Patient-reported entry',
  symptom_total: 'Symptom total calculation',
  computed_trend: 'Within-person trend',
  pattern_insight: 'Pattern observation',
  safety_outcome: 'Safety guidance',
  clinician_content: 'Clinician-authored content',
  ai_generated: 'AI-assisted wording',
}

const NON_DIAGNOSTIC_DEFAULT =
  'This information supports tracking and conversation with your care team. It is not a diagnosis, prognosis, recovery determination, or return-to-activity clearance.'

export function formatProvenanceConfidence(state: ProvenanceConfidenceState): string {
  switch (state) {
    case 'high':
      return 'High confidence — enough consistent observations to describe this clearly.'
    case 'moderate':
      return 'Moderate confidence — a useful signal, but more entries may refine it.'
    case 'low':
      return 'Low confidence — early signal only; treat as tentative.'
    case 'insufficient':
      return 'Not enough data yet — CRI will show this when minimum history is met.'
    case 'not_applicable':
      return 'Confidence scoring does not apply to this type of content.'
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

export function mapPatternConfidence(
  confidence: ConfidenceLevel | null | undefined,
  status: 'available' | 'insufficient' | 'suppressed'
): ProvenanceConfidenceState {
  if (status === 'insufficient') return 'insufficient'
  if (!confidence) return 'low'
  return confidence
}

function baseProvenance(
  partial: Omit<ProvenanceMetadata, 'schemaVersion' | 'sourceKindLabel' | 'nonDiagnosticDisclaimer'> & {
    sourceKind: ProvenanceSourceKind
    nonDiagnosticDisclaimer?: string
  }
): ProvenanceMetadata {
  const { nonDiagnosticDisclaimer, ...rest } = partial
  return {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    sourceKindLabel: SOURCE_KIND_LABELS[partial.sourceKind],
    nonDiagnosticDisclaimer: nonDiagnosticDisclaimer ?? NON_DIAGNOSTIC_DEFAULT,
    ...rest,
  }
}

export function buildSymptomTotalProvenance(args: {
  computation: SymptomTotalComputation
  checkInDate?: string
  checkInId?: string
  recomputedFromAmendment?: boolean
  amendmentNote?: string
  viewer?: ProvenanceViewerContext
}): ProvenanceMetadata {
  const categories: ProvenanceContributingCategory[] = args.computation.contributingRatings.map(
    rating => ({
      label: rating.label,
      rating: rating.rating,
      visible: true,
    })
  )

  const hiddenNotes = args.viewer?.canViewPrivateNotes === false ? 1 : 0

  return baseProvenance({
    sourceKind: 'symptom_total',
    plainLanguageRationale:
      args.computation.status === 'complete'
        ? `Today's patient-reported symptom total is the sum of eight independent ratings (0 = none, 6 = severe). Each category below contributed to the total.`
        : `This partial total sums only the symptom categories answered so far. Missing categories are excluded — never treated as zero.`,
    technicalDetail: `${METHODOLOGY_COPY.calculationRule} Methodology v${SYMPTOM_METHODOLOGY_VERSION}. ${METHODOLOGY_COPY.notRecoveryScore}`,
    dateRangeStart: args.checkInDate ?? null,
    dateRangeEnd: args.checkInDate ?? null,
    methodName: METHODOLOGY_COPY.metricName,
    methodVersion: SYMPTOM_METHODOLOGY_VERSION,
    confidence:
      args.computation.status === 'complete' ? 'not_applicable' : 'insufficient',
    confidenceExplanation:
      args.computation.status === 'complete'
        ? formatProvenanceConfidence('not_applicable')
        : 'Complete all eight symptom ratings before this total is saved as a check-in.',
    sourceRecords: args.checkInId
      ? [
          {
            label: args.checkInDate ? `Check-in · ${args.checkInDate}` : 'Daily check-in',
            recordType: 'check_in',
            recordId: args.checkInId,
            date: args.checkInDate,
            visible: true,
          },
        ]
      : [],
    evidenceReferences: [
      {
        label: 'Symptom methodology',
        citation: METHODOLOGY_COPY.calculationRule,
        version: SYMPTOM_METHODOLOGY_VERSION,
      },
    ],
    contributingCategories: categories,
    recomputedFromAmendment: args.recomputedFromAmendment,
    amendmentNote: args.amendmentNote,
    restrictedDetailCount: hiddenNotes > 0 ? hiddenNotes : undefined,
  })
}

export function buildSymptomTotalProvenanceFromAnswers(args: {
  answers: Record<string, number>
  checkInDate?: string
  checkInId?: string
  recomputedFromAmendment?: boolean
  amendmentNote?: string
  viewer?: ProvenanceViewerContext
}): ProvenanceMetadata {
  return buildSymptomTotalProvenance({
    computation: computeSymptomTotalComputation(args.answers),
    checkInDate: args.checkInDate,
    checkInId: args.checkInId,
    recomputedFromAmendment: args.recomputedFromAmendment,
    amendmentNote: args.amendmentNote,
    viewer: args.viewer,
  })
}

export function buildTrendProvenance(args: {
  trend: TrendSummary
  sourceCheckInDates: string[]
}): ProvenanceMetadata {
  const confidence: ProvenanceConfidenceState =
    args.trend.readiness === 'sufficient' ? 'moderate' : 'insufficient'

  return baseProvenance({
    sourceKind: 'computed_trend',
    plainLanguageRationale: args.trend.summaryText,
    technicalDetail: `Window: ${args.trend.windowDays} days · Points in window: ${args.trend.dataPointsInWindow} · Total history: ${args.trend.totalDataPoints}. Minimum history: ${TREND_REQUIREMENTS.minimumTotalEntries} check-ins or ${TREND_REQUIREMENTS.minimumConsecutiveDays} consecutive days. ${args.trend.disclaimerText}`,
    dateRangeStart: args.trend.earliestDate,
    dateRangeEnd: args.trend.latestDate,
    methodName: 'Within-person descriptive trend',
    methodVersion: args.trend.methodologyVersion,
    confidence,
    confidenceExplanation: formatProvenanceConfidence(confidence),
    sourceRecords: args.sourceCheckInDates.slice(0, 8).map(date => ({
      label: `Check-in · ${date}`,
      recordType: 'check_in',
      date,
      visible: true,
    })),
    evidenceReferences: [
      {
        label: 'Trend methodology',
        citation: METHODOLOGY_COPY.trendDisclaimer,
        version: args.trend.methodologyVersion,
      },
    ],
  })
}

export function buildPatternInsightProvenance(args: {
  title: string
  description: string
  patternType: string
  status: 'available' | 'insufficient' | 'suppressed'
  confidence: ConfidenceLevel | null
  sampleCount: number
  matchCount: number
  inputDateRangeStart: string | null
  inputDateRangeEnd: string | null
  algorithmVersion: string
  effectDirection: EffectDirection | null
  checkInCount: number
  exposureCount: number
}): ProvenanceMetadata {
  const confidence = mapPatternConfidence(args.confidence, args.status)
  const directionNote = args.effectDirection
    ? args.effectDirection === 'positive'
      ? 'Variables tended to increase together in logged entries.'
      : args.effectDirection === 'negative'
        ? 'One variable tended to decrease as the other increased.'
        : 'The association direction was mixed across observations.'
    : ''

  return baseProvenance({
    sourceKind: 'pattern_insight',
    plainLanguageRationale: args.description,
    technicalDetail: `Pattern: ${args.patternType}. Sample size: ${args.sampleCount}. Matches: ${args.matchCount}. Check-ins analyzed: ${args.checkInCount}. Exposure days: ${args.exposureCount}. ${directionNote}`,
    dateRangeStart: args.inputDateRangeStart,
    dateRangeEnd: args.inputDateRangeEnd,
    methodName: 'Longitudinal pattern detection',
    methodVersion: args.algorithmVersion,
    confidence,
    confidenceExplanation: formatProvenanceConfidence(confidence),
    sourceRecords: [
      {
        label: `${args.checkInCount} check-ins in analysis window`,
        recordType: 'check_in_aggregate',
        visible: true,
      },
      {
        label: `${args.exposureCount} exposure days in analysis window`,
        recordType: 'activity_exposure_aggregate',
        visible: true,
      },
    ],
    evidenceReferences: [
      {
        label: 'Pattern detection algorithm',
        citation:
          'Deterministic rank correlation and threshold counting over patient-reported entries.',
        version: args.algorithmVersion,
      },
    ],
  })
}

export interface SafetyProvenanceInput {
  status: string
  highestSeverity: string
  failSafeApplied: boolean
  ruleEngineVersion: string
  matchedRules: Array<{
    ruleId: string
    version: string
    name: string
    matchedEvidenceSummary: string
    evidenceSource: {
      authority: string
      citation: string
    }
  }>
}

export function buildSafetyProvenance(args: {
  safetyResult: SafetyProvenanceInput
  symptomTotal?: number
}): ProvenanceMetadata {
  const topRule = args.safetyResult.matchedRules[0]
  const confidence: ProvenanceConfidenceState = args.safetyResult.failSafeApplied
    ? 'insufficient'
    : topRule
      ? 'high'
      : 'not_applicable'

  const evidenceReferences: ProvenanceEvidenceReference[] = args.safetyResult.matchedRules
    .slice(0, 3)
    .map(rule => ({
      label: rule.name,
      citation: rule.evidenceSource.citation,
      authority: rule.evidenceSource.authority,
      ruleId: rule.ruleId,
      version: rule.version,
    }))

  if (evidenceReferences.length === 0) {
    evidenceReferences.push({
      label: 'Safety Engine',
      citation: 'No clinical safety rules matched the supplied inputs.',
      version: args.safetyResult.ruleEngineVersion,
    })
  }

  const rationaleParts = [
    topRule?.matchedEvidenceSummary ??
      'No safety rules matched. Routine completion guidance applies when inputs are complete.',
  ]
  if (args.symptomTotal !== undefined) {
    rationaleParts.push(
      `Patient-reported symptom total ${args.symptomTotal}/48 was evaluated alongside danger signs and activity impact. The total alone does not determine safety status.`
    )
  }

  return baseProvenance({
    sourceKind: 'safety_outcome',
    plainLanguageRationale: rationaleParts.join(' '),
    technicalDetail: `Engine v${args.safetyResult.ruleEngineVersion}. Status: ${args.safetyResult.status}. Severity: ${args.safetyResult.highestSeverity}. Fail-safe applied: ${args.safetyResult.failSafeApplied ? 'yes' : 'no'}.`,
    dateRangeStart: null,
    dateRangeEnd: null,
    methodName: 'Clinical Safety Engine',
    methodVersion: args.safetyResult.ruleEngineVersion,
    confidence,
    confidenceExplanation: formatProvenanceConfidence(confidence),
    sourceRecords: topRule
      ? [
          {
            label: `Rule ${topRule.ruleId} · ${topRule.name}`,
            recordType: 'safety_rule',
            recordId: topRule.ruleId,
            visible: true,
          },
        ]
      : [],
    evidenceReferences,
    nonDiagnosticDisclaimer:
      'Safety guidance helps you decide when to seek urgent or clinical care. It does not diagnose a condition or predict recovery.',
  })
}

export function buildClinicianContentProvenance(args: {
  title: string
  authorName: string
  authoredAt: string
  recordId?: string
}): ProvenanceMetadata {
  return baseProvenance({
    sourceKind: 'clinician_content',
    plainLanguageRationale: `${args.title} was written by ${args.authorName} for your care team.`,
    dateRangeStart: args.authoredAt,
    dateRangeEnd: args.authoredAt,
    methodName: 'Clinician documentation',
    methodVersion: '1.0.0',
    confidence: 'not_applicable',
    confidenceExplanation: formatProvenanceConfidence('not_applicable'),
    sourceRecords: [
      {
        label: args.title,
        recordType: 'clinical_encounter',
        recordId: args.recordId,
        date: args.authoredAt,
        visible: true,
      },
    ],
    evidenceReferences: [],
    nonDiagnosticDisclaimer:
      'Clinician-authored notes reflect professional judgment and should be interpreted with your care team.',
  })
}

export function buildAiGeneratedProvenance(args: {
  rationale: string
  modelVersion: string
  deidentified: boolean
}): ProvenanceMetadata {
  return baseProvenance({
    sourceKind: 'ai_generated',
    plainLanguageRationale: args.rationale,
    technicalDetail: args.deidentified
      ? 'Generated from de-identified symptom and activity summaries with guardrails and human-review gates.'
      : 'Generated with AI guardrails; verify important details with your care team.',
    dateRangeStart: null,
    dateRangeEnd: null,
    methodName: 'AI-assisted language',
    methodVersion: args.modelVersion,
    confidence: 'low',
    confidenceExplanation:
      'AI wording is assistive only. Always rely on your logged entries and care team for decisions.',
    sourceRecords: [],
    evidenceReferences: [
      {
        label: 'AI governance policy',
        citation: 'See docs/AI_PRIVACY_AND_THREAT_MODEL.md',
        version: args.modelVersion,
      },
    ],
    nonDiagnosticDisclaimer:
      'AI-generated text is not medical advice and must not be used for diagnosis or emergency decisions.',
  })
}

export function filterContributingCategoriesForViewer(
  categories: ProvenanceContributingCategory[] | undefined,
  viewer?: ProvenanceViewerContext
): ProvenanceContributingCategory[] {
  if (!categories) return []
  return categories.map(category => ({
    ...category,
    visible: category.visible && viewer?.canViewPrivateNotes !== false,
  }))
}

export function formatDateRangeLabel(start: string | null, end: string | null): string {
  if (start && end) {
    if (start === end) return start
    return `${start} – ${end}`
  }
  if (start) return `From ${start}`
  if (end) return `Through ${end}`
  return 'Single point in time'
}

export type { ContributingRating, SymptomTotalComputation, TrendSummary }
