'use client'

import React from 'react'
import { LockKeyhole } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface RestrictedSection {
  section: string
  reason: string
  requiredScope?: string
}

export interface CaregiverRestrictedNoticeProps {
  sections: RestrictedSection[]
  className?: string
}

export function CaregiverRestrictedNotice({ sections, className }: CaregiverRestrictedNoticeProps) {
  if (sections.length === 0) return null

  return (
    <Card className={className ?? 'p-5'}>
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Information not shared with you</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The patient controls what appears here. Hidden items are not shown — only why they are unavailable.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {sections.map(section => (
              <li
                key={section.section}
                className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{section.section}</span>
                <span className="text-muted-foreground"> — {section.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
