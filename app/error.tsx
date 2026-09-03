'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'
import { reportError, StructuredErrorReport } from '@/lib/observability/errorReporter'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [report, setReport] = useState<StructuredErrorReport | null>(null)

  useEffect(() => {
    const errorReport = reportError(error, {
      component: 'AppErrorBoundary',
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
    setReport(errorReport)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 sm:p-8 space-y-6 text-center warm-shadow border-border">
        {/* Soft, non-harsh indicator */}
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The application encountered an unexpected issue. Your locally saved check-in drafts remain safe.
          </p>
        </div>

        {/* Emergency Notice */}
        <div
          role="note"
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-left flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-foreground leading-tight">
            <span className="font-semibold text-destructive">Emergency notice: </span>
            If you are experiencing severe worsening headache, repeated vomiting, or neurological red flags, call{' '}
            <strong className="text-destructive">911</strong> immediately.
          </div>
        </div>

        {/* Safe Incident Reference for Operators */}
        {report && (
          <div className="bg-muted/40 rounded p-2.5 text-xs text-muted-foreground font-mono select-all">
            Incident ID: <span className="text-foreground">{report.correlationId}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => reset()}
            variant="default"
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try again
          </Button>

          <Button variant="outline" asChild>
            <Link href="/" className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Return home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
