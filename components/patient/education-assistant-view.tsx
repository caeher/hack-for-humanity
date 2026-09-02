'use client'

import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { BookOpen, Loader2, Send, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/layouts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'
import type { EducationAssistantResponse } from '@/lib/education/types'

const DEMO_RESPONSE: EducationAssistantResponse = {
  kind: 'grounded_answer',
  answerText:
    'Based on approved clinical education sources, here is general recovery guidance related to your question:\n\nDuring concussion recovery, maintain a consistent sleep schedule with regular bed and wake times. Limit screen use before bedtime, keep the bedroom dark and quiet, and avoid caffeine late in the day. [CDC HEADS UP]\n\nThis information is educational only. CRI does not diagnose, prescribe, or clear return to activity. Contact your clinician for personal medical decisions.',
  citations: [
    {
      chunkId: 'cdc-sleep-hygiene-001',
      sourceTitle: 'CDC HEADS UP — Sleep During Recovery',
      sourceAuthority: 'CDC HEADS UP',
      section: 'Sleep hygiene',
      version: 'v1',
      effectiveDate: '2024-01-15',
      excerpt:
        'During concussion recovery, maintain a consistent sleep schedule with regular bed and wake times. Limit screen use before bedtime...',
    },
  ],
  classification: 'education',
  corpusVersion: 'v1',
  environment: 'development',
  requestId: 'demo-request',
  ctxSessionId: 'demo-session',
  auditOutcome: 'success',
}

function CitationCard({
  citation,
}: {
  citation: EducationAssistantResponse['citations'][number]
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{citation.sourceAuthority}</Badge>
        <span className="text-xs text-muted-foreground">
          {citation.section} · v{citation.version} · {citation.effectiveDate}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{citation.sourceTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{citation.excerpt}</p>
    </Card>
  )
}

function EducationAssistantPanel({
  response,
  isLoading,
  error,
}: {
  response: EducationAssistantResponse | null
  isLoading: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <Card className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Searching approved recovery education sources…
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </Card>
      ) : null}

      {response ? (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  response.kind === 'grounded_answer' || response.kind === 'app_help'
                    ? 'good'
                    : response.kind === 'safety_refusal'
                      ? 'bad'
                      : 'neutral'
                }
              >
                {response.kind.replace(/_/g, ' ')}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground uppercase">
                Corpus {response.corpusVersion} · {response.environment}
              </span>
            </div>
            {response.safetyGuidance ? (
              <div className="mt-4 flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                <p>{response.safetyGuidance}</p>
              </div>
            ) : null}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground">{response.answerText}</p>
          </Card>

          {response.citations.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">Sources & excerpts</h2>
              {response.citations.map(citation => (
                <CitationCard key={citation.chunkId} citation={citation} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function EducationAssistantDemo() {
  const [query, setQuery] = useState('What sleep hygiene practices are recommended during concussion recovery?')
  const [response, setResponse] = useState<EducationAssistantResponse | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="[E2E demo shell] Evidence-based education"
        title="Recovery education assistant"
        description="Answers general concussion recovery questions using approved clinical sources with verifiable citations. Not for diagnosis, prescriptions, or clearance."
      />

      <Card className="p-4">
        <label htmlFor="education-query-demo" className="text-sm font-medium text-foreground">
          Ask a recovery education question
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <textarea
            id="education-query-demo"
            value={query}
            onChange={event => setQuery(event.target.value)}
            rows={3}
            className="min-h-24 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Example: How should I gradually increase screen time after a concussion?"
          />
          <Button
            type="button"
            className="sm:self-end"
            onClick={() => setResponse(DEMO_RESPONSE)}
            disabled={query.trim().length === 0}
          >
            <Send className="size-4" aria-hidden="true" />
            Ask
          </Button>
        </div>
      </Card>

      <EducationAssistantPanel response={response} isLoading={false} error={null} />

      <div className="rounded-xl border border-border bg-accent p-4 text-sm leading-6 text-foreground">
        <strong>Prototype decision support.</strong> CRI does not diagnose conditions or replace your care team.
        If you have urgent symptoms, call local emergency services.
      </div>
    </div>
  )
}

function EducationAssistantLive() {
  const askQuestion = useMutation(api.educationAssistant.askQuestion)
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<EducationAssistantResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await askQuestion({ queryText: trimmed })
      setResponse(result)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to process your question.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Evidence-based education"
        title="Recovery education assistant"
        description="Answers general concussion recovery questions using approved clinical sources with verifiable citations. Not for diagnosis, prescriptions, or clearance."
      />

      <Card className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="education-query" className="text-sm font-medium text-foreground">
            Ask a recovery education question
          </label>
          <textarea
            id="education-query"
            value={query}
            onChange={event => setQuery(event.target.value)}
            rows={3}
            className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Example: Is it normal for symptoms to fluctuate day to day during recovery?"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden="true" />
            Responses cite approved sources only. Personal diagnosis, prescribing, and clearance requests are refused.
          </div>
          <Button type="submit" disabled={isLoading || query.trim().length === 0} className="self-start">
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Ask
          </Button>
        </form>
      </Card>

      <EducationAssistantPanel response={response} isLoading={isLoading} error={error} />

      <div className="rounded-xl border border-border bg-accent p-4 text-sm leading-6 text-foreground">
        <strong>Prototype decision support.</strong> CRI does not diagnose conditions or replace your care team.
        If you have urgent symptoms, call local emergency services.
      </div>
    </div>
  )
}

export function EducationAssistantView() {
  if (isE2ETestMode) {
    return <EducationAssistantDemo />
  }

  return <EducationAssistantLive />
}
