import { AlertTriangle, Phone } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MessageSafetyBannerProps {
  guidance: {
    status: string
    highestSeverity: string
    primaryEscalation: string
    userGuidance: string
    isEmergency: boolean
  }
  className?: string
}

export function MessageSafetyBanner({ guidance, className }: MessageSafetyBannerProps) {
  const isEmergency = guidance.isEmergency || guidance.status === 'emergency'

  return (
    <Card
      className={cn(
        'border p-4',
        isEmergency
          ? 'border-destructive/50 bg-destructive/5'
          : 'border-warning/50 bg-warning/5',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-3">
        {isEmergency ? (
          <Phone className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        )}
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">
            {isEmergency ? 'Urgent symptoms noted' : 'Safety guidance'}
          </p>
          <p className="text-muted-foreground">{guidance.userGuidance}</p>
          <p className="text-xs text-muted-foreground">
            {guidance.primaryEscalation}. This chat is not monitored for emergencies.
          </p>
        </div>
      </div>
    </Card>
  )
}
