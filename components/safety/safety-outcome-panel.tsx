'use client'

import React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  PhoneCall,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react'
import type { SafetyEvaluationResult } from '@/convex/lib/safetyEngine'
import type { EscalationPath } from '@/convex/lib/safetyRules'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  getSafetyOutcomeCopy,
  resolveSafetyOutcomeState,
  severityToAccessibleLabel,
  type AudienceBand,
} from '@/lib/safety/copy'
import { getEmergencyGuidance, type EmergencyRegion } from '@/lib/safety/emergency'
import { ESCALATION_PRESENTATION } from '@/lib/safety/presentation'
import { buildSafetyProvenance } from '@/lib/provenance'
import { ExplanationView } from '@/components/explanation'

export type SafetyOutcomeSource = 'backend' | 'client_fallback'

export interface SafetyOutcomePanelProps {
  safetyResult: SafetyEvaluationResult
  symptomTotal?: number
  source?: SafetyOutcomeSource
  audience?: AudienceBand
  emergencyRegion?: EmergencyRegion
  savedSuccessfully?: boolean
  isAcknowledging?: boolean
  onAcknowledge?: () => void | Promise<void>
  onReviewAnswers?: () => void
  showRoutineCompletion?: boolean
  showExplanation?: boolean
}

function SeverityIcon({
  state,
  className,
}: {
  state: ReturnType<typeof resolveSafetyOutcomeState>
  className?: string
}) {
  switch (state) {
    case 'urgent':
      return <AlertTriangle className={cn('size-7', className)} aria-hidden="true" />
    case 'prompt_professional_review':
      return <Stethoscope className={cn('size-7', className)} aria-hidden="true" />
    case 'insufficient_information':
      return <ShieldAlert className={cn('size-7', className)} aria-hidden="true" />
    case 'routine':
      return <Check className={cn('size-6', className)} aria-hidden="true" />
  }
}

function getEscalationAction(escalation: EscalationPath | 'none', region: EmergencyRegion) {
  if (escalation === 'emergency_911_ed') {
    const emergency = getEmergencyGuidance(region)
    return {
      label: emergency.primaryActionLabel,
      href: emergency.primaryActionHref,
      secondary: emergency.secondaryGuidance,
    }
  }

  const config = ESCALATION_PRESENTATION[escalation as EscalationPath]
  if (!config) return null

  return {
    label: config.actionLabel,
    href: config.actionHref,
    secondary: undefined,
  }
}

export function SafetyOutcomePanel({
  safetyResult,
  symptomTotal,
  source = 'backend',
  audience = 'adult',
  emergencyRegion,
  savedSuccessfully = false,
  isAcknowledging = false,
  onAcknowledge,
  onReviewAnswers,
  showRoutineCompletion = true,
  showExplanation = true,
}: SafetyOutcomePanelProps) {
  const outcomeState = resolveSafetyOutcomeState(safetyResult.status, safetyResult.failSafeApplied)
  const copy = getSafetyOutcomeCopy(outcomeState, audience)
  const safetyProvenance = buildSafetyProvenance({ safetyResult, symptomTotal })
  const region = emergencyRegion ?? 'unknown'
  const emergency = getEmergencyGuidance(region)
  const escalationAction = getEscalationAction(safetyResult.primaryEscalation, region)
  const topRule = safetyResult.matchedRules[0]
  const isBlocking = safetyResult.blockedActions.includes('allow_routine_completion')
  const severityLabel = severityToAccessibleLabel(safetyResult.highestSeverity)

  const iconWrapperClass =
    outcomeState === 'urgent'
      ? 'bg-destructive text-destructive-foreground'
      : outcomeState === 'prompt_professional_review'
        ? 'bg-warning text-warning-foreground'
        : outcomeState === 'insufficient_information'
          ? 'bg-muted text-foreground'
          : 'bg-primary text-primary-foreground'

  return (
    <div className="mx-auto max-w-2xl" aria-live={isBlocking ? 'assertive' : 'polite'}>
      <Card
        className={cn('p-8', isBlocking && 'border-destructive')}
        role={isBlocking ? 'alert' : 'status'}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn('grid size-14 shrink-0 place-items-center rounded-full', iconWrapperClass)}
          >
            <SeverityIcon state={outcomeState} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.severityLabel}
            </p>
            <p className="sr-only">{severityLabel}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {copy.actionHeading}
            </h1>
          </div>
        </div>

        {source === 'client_fallback' && (
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3" role="status">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              Offline guidance — your check-in could not reach the server
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Showing approved immediate guidance from your device. Reconnect and complete your
              check-in when possible so your care team receives a full record.
            </p>
          </div>
        )}

        <section className="mt-6 space-y-2" aria-labelledby="safety-action-heading">
          <h2 id="safety-action-heading" className="text-sm font-semibold text-foreground">
            What to do now
          </h2>
          <p className="text-sm leading-6 text-foreground">{copy.actionBody}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            {outcomeState === 'urgent' && emergency.primaryActionHref && (
              <a
                href={emergency.primaryActionHref}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90"
              >
                <PhoneCall className="size-4" aria-hidden="true" />
                {emergency.primaryActionLabel}
              </a>
            )}

            {outcomeState !== 'urgent' && escalationAction?.href && (
              <Link
                href={escalationAction.href}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {escalationAction.label}
              </Link>
            )}

            {outcomeState !== 'urgent' && escalationAction && !escalationAction.href && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground">
                {escalationAction.label}
              </span>
            )}

            {onReviewAnswers && isBlocking && (
              <button
                type="button"
                onClick={onReviewAnswers}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Review my answers
              </button>
            )}
          </div>

          {outcomeState === 'urgent' && (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {emergency.secondaryGuidance}
            </p>
          )}
        </section>

        <section className="mt-6 space-y-2 border-t border-border pt-6" aria-labelledby="safety-rationale-heading">
          <h2 id="safety-rationale-heading" className="text-sm font-semibold text-foreground">
            {copy.rationaleHeading}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">{copy.rationaleBody}</p>
          {topRule && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {safetyResult.matchedRules.slice(0, 3).map(rule => (
                <li key={rule.ruleId}>
                  <span className="font-medium text-foreground">{rule.name}</span>
                  {' — '}
                  {rule.matchedEvidenceSummary}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 space-y-2" aria-labelledby="safety-source-heading">
          <h2 id="safety-source-heading" className="text-sm font-semibold text-foreground">
            {copy.sourceHeading}
          </h2>
          {topRule ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {topRule.evidenceSource.authority}: {topRule.evidenceSource.citation}
              <span className="block mt-1 font-mono text-xs">
                Rule {topRule.ruleId} v{topRule.version} · Engine v{safetyResult.ruleEngineVersion}
              </span>
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Safety Engine v{safetyResult.ruleEngineVersion} — no rules matched.
            </p>
          )}
        </section>

        <section className="mt-6 space-y-2" aria-labelledby="safety-limitation-heading">
          <h2 id="safety-limitation-heading" className="text-sm font-semibold text-foreground">
            {copy.limitationHeading}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">{copy.limitationBody}</p>
          <p className="text-sm leading-6 text-muted-foreground">{emergency.limitation}</p>
        </section>

        {savedSuccessfully && source === 'backend' && (
          <p className="mt-4 text-sm leading-6 text-foreground">
            Your responses were saved so your care team can review them. This does not replace
            emergency or clinical care.
          </p>
        )}

        {showRoutineCompletion && outcomeState === 'routine' && symptomTotal !== undefined && (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Today&apos;s patient-reported symptom total is {symptomTotal} out of 48. This simple
            total helps compare entries over time. It is not a diagnosis, prognosis, or
            return-to-activity decision.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
          {onAcknowledge && (
            <>
              <button
                type="button"
                onClick={() => void onAcknowledge()}
                disabled={isAcknowledging}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-70',
                  outcomeState === 'urgent'
                    ? 'border border-border bg-background text-foreground hover:bg-muted'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                )}
              >
                {isAcknowledging && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {copy.acknowledgementLabel}
              </button>
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.acknowledgementDisclaimer}
              </p>
            </>
          )}

          {outcomeState === 'routine' && !onAcknowledge && (
            <Link
              href="/patient/dashboard"
              className="inline-flex justify-center rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
            >
              Return to overview
            </Link>
          )}
        </div>
      </Card>

      {showExplanation ? (
        <div className="mt-6">
          <ExplanationView
            provenance={safetyProvenance}
            title="Safety rule provenance"
            compact
            id="safety-explanation"
          />
        </div>
      ) : null}
    </div>
  )
}
