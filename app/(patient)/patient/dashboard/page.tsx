import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Activity, CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts'
import { StatCard, TrendChart, ScoreGauge, TodayPlan, InsightCard } from '@/components/dashboard'

export default function PatientDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Monday, August 31"
        title="Good morning, Maya"
        description="Day 12 after a clinician-diagnosed concussion. Track how symptoms and daily activities change over time."
        action={
          <Link
            href="/patient/check-in"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[inset_0_1px_rgba(255,255,255,.6)] hover:bg-primary/90 transition-colors"
          >
            Start daily check-in <ArrowRight className="size-4" />
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Today&apos;s symptom total</h2>
            <span className="font-mono text-xs text-muted-foreground">UPDATED 8:42 AM</span>
          </div>
          <ScoreGauge score={15} maxScore={48} />
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">7-day trajectory</h2>
              <p className="text-sm text-muted-foreground">Patient-reported symptom total</p>
            </div>
            <Badge>Last 7 days</Badge>
          </div>
          <TrendChart />
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Check-in consistency"
          value="92%"
          detail="11 of 12 days logged"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Headache"
          value="2 / 6"
          detail="Patient-reported today"
          icon={Activity}
        />
        <StatCard
          label="Next appointment"
          value="Sep 3"
          detail="Dr. Olivia Brooks · 10:30 AM"
          icon={CalendarDays}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <TodayPlan />
        <InsightCard />
      </div>
    </div>
  )
}
