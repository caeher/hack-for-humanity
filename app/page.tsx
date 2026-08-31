import Link from 'next/link'
import { Activity, ArrowRight, HeartPulse, ShieldCheck, Sparkles, Stethoscope, Users } from 'lucide-react'

const portals = [
  { title: 'Patient', description: 'Track your daily recovery, complete check-ins, and understand your progress.', href: '/patient/dashboard', icon: HeartPulse },
  { title: 'Caregiver', description: 'Support a loved one through a clear, permission-based recovery view.', href: '/caregiver/dashboard', icon: Users },
  { title: 'Clinician', description: 'Prioritize caseload attention with longitudinal recovery intelligence.', href: '/clinician/dashboard', icon: Stethoscope },
  { title: 'Organization', description: 'Understand outcomes, engagement, governance, and operational performance.', href: '/admin/dashboard', icon: ShieldCheck },
]

export default function Page() {
  return <main className="paper-grid min-h-screen px-4 py-6 md:px-8">
    <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-lg border bg-card px-4 py-3 warm-shadow">
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-foreground font-bold text-background">C</span><div><strong className="block leading-none">CRI</strong><span className="text-xs text-muted-foreground">Recovery intelligence</span></div></div>
      <Link href="/patient/dashboard" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold">Open demo</Link>
    </nav>
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 pb-16 pt-20 text-center md:pt-28">
      <div className="flex items-center gap-2 rounded border bg-card px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider"><Sparkles className="size-3"/> One recovery picture</div>
      <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-.06em] md:text-7xl">Recovery intelligence for everyone involved.</h1>
      <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">CRI unifies patient-reported outcomes, care plans, and clinical context into one explainable recovery workspace.</p>
      <div className="flex flex-wrap justify-center gap-3"><Link href="/patient/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold">Explore patient view <ArrowRight className="size-4"/></Link><Link href="/clinician/dashboard" className="rounded-lg border bg-card px-5 py-3 text-sm font-semibold">Explore clinical view</Link></div>
    </section>
    <section className="mx-auto grid max-w-7xl gap-3 md:grid-cols-2 lg:grid-cols-4">{portals.map(({title,description,href,icon:Icon})=><Link href={href} key={title} className="group flex min-h-52 flex-col rounded-lg border bg-card p-5 warm-shadow hover:-translate-y-1"><div className="grid size-10 place-items-center rounded-lg bg-muted"><Icon className="size-5"/></div><h2 className="mt-8 text-xl font-semibold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><span className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold">Enter workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></span></Link>)}</section>
    <footer className="mx-auto mt-16 flex max-w-7xl flex-col gap-3 border-t py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between"><p>CRI prototype · Simulated data only · Not medical advice</p><p className="flex items-center gap-2"><Activity className="size-3"/> Designed for coordinated recovery</p></footer>
  </main>
}
