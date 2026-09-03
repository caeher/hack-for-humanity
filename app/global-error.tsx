'use client'

import React, { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { reportError, StructuredErrorReport } from '@/lib/observability/errorReporter'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [report, setReport] = useState<StructuredErrorReport | null>(null)

  useEffect(() => {
    const errorReport = reportError(error, {
      component: 'GlobalErrorBoundary',
    })
    setReport(errorReport)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-[#f8f7f5] text-[#261b07] font-sans antialiased min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-neutral-200 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-neutral-900">
              System Error
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed">
              CRI encountered an unexpected initialization error. Please reload the recovery workspace.
            </p>
          </div>

          {report && (
            <div className="bg-neutral-100 rounded p-2.5 text-xs text-neutral-600 font-mono select-all">
              Incident ID: <span className="text-neutral-900">{report.correlationId}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0ea5e9] hover:bg-[#0284c7] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
