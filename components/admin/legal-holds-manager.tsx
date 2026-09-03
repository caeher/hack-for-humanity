'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { ShieldAlert, Plus, CheckCircle, Lock } from 'lucide-react'

export function LegalHoldsManager() {
  if (isE2ETestMode) {
    return (
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Lock className="h-4 w-4 text-warning" />
          Legal & Clinical Holds
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          [E2E demo shell] Legal hold governance active. Pruning and deletion controls are protected.
        </p>
      </Card>
    )
  }

  return <LegalHoldsManagerLive />
}

function LegalHoldsManagerLive() {
  const org = useQuery(api.organizations.getMyOrganization, {})
  const holds = useQuery(
    api.retention.listLegalHolds,
    org ? { orgId: org._id } : 'skip'
  )

  const applyHold = useMutation(api.retention.applyLegalHold)
  const releaseHold = useMutation(api.retention.releaseLegalHold)

  const [isApplying, setIsApplying] = useState(false)
  const [holdType, setHoldType] = useState<'legal' | 'clinical' | 'regulatory'>('legal')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org || !reason.trim()) return

    try {
      setSubmitting(true)
      await applyHold({
        orgId: org._id,
        holdType,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      })
      setMessage('Legal hold applied successfully.')
      setReason('')
      setNotes('')
      setIsApplying(false)
    } catch (err) {
      setMessage(`Error applying hold: ${String(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRelease = async (holdId: any) => {
    try {
      await releaseHold({ holdId, notes: 'Released by administrator' })
      setMessage('Legal hold released.')
    } catch (err) {
      setMessage(`Error releasing hold: ${String(err)}`)
    }
  }

  const activeHolds = holds?.filter(h => h.status === 'active') ?? []

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-warning" />
            Legal & Clinical Holds Governance
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active holds immediately prohibit statutory data pruning and right-to-be-forgotten deletion requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsApplying(!isApplying)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Apply New Hold
        </button>
      </div>

      {message && (
        <div className="rounded-md bg-muted p-2.5 text-xs text-foreground flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span>{message}</span>
        </div>
      )}

      {isApplying && (
        <form onSubmit={handleApply} className="bg-muted/30 rounded-lg p-4 border border-border flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase text-foreground tracking-wider">Apply Legal Hold</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Hold Type</label>
              <select
                value={holdType}
                onChange={e => setHoldType(e.target.value as any)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="legal">Legal Hold (Subpoena / Litigation)</option>
                <option value="clinical">Clinical Hold (Adverse Event / Safety Review)</option>
                <option value="regulatory">Regulatory Hold (Compliance Audit)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Reason / Case Ref</label>
              <input
                type="text"
                placeholder="e.g. Formal record request #2026-09"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Additional Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Scope, attorney name, or clinical reviewer..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsApplying(false)}
              className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Applying…' : 'Confirm Hold'}
            </button>
          </div>
        </form>
      )}

      {/* Holds Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-[160px]">Applied Date</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holds === undefined && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">
                  Loading holds…
                </TableCell>
              </TableRow>
            )}
            {holds !== undefined && holds.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">
                  No legal or clinical holds applied. Standard retention schedules apply.
                </TableCell>
              </TableRow>
            )}
            {holds?.map(hold => (
              <TableRow key={hold._id} className="text-xs">
                <TableCell>
                  <Badge tone={hold.holdType === 'legal' ? 'bad' : 'warn'} className="capitalize">
                    {hold.holdType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={hold.status === 'active' ? 'bad' : 'good'}>
                    {hold.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {hold.reason}
                  {hold.notes && <p className="text-muted-foreground text-[11px] mt-0.5">{hold.notes}</p>}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {new Date(hold.appliedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {hold.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => handleRelease(hold._id)}
                      className="text-xs text-destructive hover:underline font-medium"
                    >
                      Release
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">Released</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
