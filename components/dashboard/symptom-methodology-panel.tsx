import React from 'react'
import { ExplanationView } from '@/components/explanation'
import {
  buildSymptomTotalProvenanceFromAnswers,
  type ProvenanceMetadata,
} from '@/lib/provenance'
import {
  type ContributingRating,
  type SymptomTotalComputation,
} from '@/lib/symptomMethodology'

export interface SymptomMethodologyPanelProps {
  computation?: SymptomTotalComputation
  contributingRatings?: ContributingRating[]
  provenance?: ProvenanceMetadata
  checkInDate?: string
  checkInId?: string
  recomputedFromAmendment?: boolean
  amendmentNote?: string
  className?: string
  compact?: boolean
}

export function SymptomMethodologyPanel({
  computation,
  contributingRatings,
  provenance,
  checkInDate,
  checkInId,
  recomputedFromAmendment,
  amendmentNote,
  className,
  compact = false,
}: SymptomMethodologyPanelProps) {
  const ratings = contributingRatings ?? computation?.contributingRatings ?? []

  const resolvedProvenance =
    provenance ??
    (computation
      ? buildSymptomTotalProvenanceFromAnswers({
          answers: Object.fromEntries(
            ratings.map(entry => [entry.dimensionId, entry.rating])
          ),
          checkInDate,
          checkInId,
          recomputedFromAmendment,
          amendmentNote,
        })
      : buildSymptomTotalProvenanceFromAnswers({
          answers: Object.fromEntries(
            ratings.map(entry => [entry.dimensionId, entry.rating])
          ),
          checkInDate,
          checkInId,
        }))

  return (
    <ExplanationView
      provenance={resolvedProvenance}
      title={`How this ${resolvedProvenance.methodName.toLowerCase()} is calculated`}
      compact={compact}
      className={className}
      id="symptom-methodology"
    />
  )
}
