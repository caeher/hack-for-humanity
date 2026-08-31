import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts'
import { InsightCard } from '@/components/dashboard'

export default function InsightsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Explainable intelligence"
        title="Recovery insights"
        description="Patterns detected across your check-ins, care plan, and connected health signals."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard />
        {[
          'Longer screen sessions preceded higher headache ratings on 3 days',
          'Dizziness ratings were lower on lower-activity days',
          'Concentration difficulty and fatigue changed together this week',
        ].map((t, i) => (
          <Card className="p-6" key={t}>
            <div className="flex justify-between items-center mb-4">
              <Badge tone={i === 2 ? 'good' : 'neutral'}>
                {i === 2 ? 'High confidence' : 'Moderate confidence'}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{i + 2} SOURCES</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              CRI found a temporal association in simulated check-in data. It does not establish cause. Discuss the observation with a clinician before changing your routine.
            </p>
            <button className="mt-5 text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary cursor-pointer">
              View evidence
            </button>
          </Card>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-accent p-4 text-sm leading-6 text-foreground">
        <strong>Prototype decision support.</strong> CRI does not diagnose conditions or replace your care team. If you have urgent symptoms, call local emergency services.
      </div>
    </div>
  )
}
