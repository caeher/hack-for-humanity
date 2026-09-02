import { AlertTriangle, Clock3, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function MessagingDisclaimer() {
  return (
    <Card className="border-border/80 bg-muted/40 p-4">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Secure care-team messaging</p>
          <p>
            Messages are reviewed during clinical hours and are <strong>not monitored in real time</strong>.
            Typical response times are within one business day.
          </p>
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              This inbox is <strong>not an emergency service</strong>. If you have severe or worsening
              symptoms, call emergency services (911) or go to the nearest emergency department.
            </span>
          </p>
          <p className="flex items-center gap-2 text-xs">
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            Automated safety screening may surface educational guidance — it does not replace emergency care.
          </p>
        </div>
      </div>
    </Card>
  )
}
