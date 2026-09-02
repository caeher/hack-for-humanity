'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { MoreHorizontal, UserPlus } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'
import type { Id } from '@/convex/_generated/dataModel'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { SearchField, SelectField } from '@/components/forms'
import { ConfirmActionDialog } from './confirm-action-dialog'

type LifecycleAction = 'suspend' | 'reactivate' | 'changeRole'

interface ActionTarget {
  userId: Id<'users'>
  email: string
  name: string
  currentRole: string
  action: LifecycleAction
  nextRole?: 'patient' | 'caregiver' | 'clinician' | 'admin'
}

export interface UserManagementTableProps {
  orgId: Id<'organizations'>
  onInvite?: () => void
}

function statusTone(status: string): 'good' | 'warn' | 'bad' | undefined {
  if (status === 'Active' || status === 'active') return 'good'
  if (status === 'Invited' || status === 'invited') return 'warn'
  if (status === 'Suspended' || status === 'inactive') return 'bad'
  return undefined
}

function UserManagementTableDemo({ onInvite }: Pick<UserManagementTableProps, 'onInvite'>) {
  return (
    <Card className="p-6">
      <h2 className="font-semibold text-foreground">Users & roles</h2>
      <p className="text-sm text-muted-foreground mt-2">
        [E2E demo shell] Organization user provisioning and recovery workspace access management.
      </p>
      {onInvite && (
        <Button size="sm" className="mt-4" onClick={onInvite}>
          <UserPlus className="size-3.5" /> Invite user
        </Button>
      )}
    </Card>
  )
}

function UserManagementTableLive({ orgId, onInvite }: UserManagementTableProps) {
  const users = useQuery(api.orgProvisioning.listOrgUsers, { orgId })
  const invitations = useQuery(api.orgProvisioning.listInvitations, { orgId })

  const suspendUser = useMutation(api.orgProvisioning.suspendUser)
  const reactivateUser = useMutation(api.orgProvisioning.reactivateUser)
  const changeUserRole = useMutation(api.orgProvisioning.changeUserRole)
  const cancelInvitation = useMutation(api.orgProvisioning.cancelInvitation)
  const resendInvitation = useMutation(api.orgProvisioning.resendInvitation)

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null)
  const [cancelInviteTarget, setCancelInviteTarget] = useState<{
    id: Id<'organizationInvitations'>
    email: string
  } | null>(null)

  const filteredUsers = useMemo(() => {
    if (!users) return []
    return users.filter(entry => {
      const matchesQuery =
        entry.user.name.toLowerCase().includes(query.toLowerCase()) ||
        entry.user.email.toLowerCase().includes(query.toLowerCase())
      const matchesRole =
        roleFilter === 'all' || entry.membership.orgRole === roleFilter
      return matchesQuery && matchesRole
    })
  }, [users, query, roleFilter])

  const pendingInvites = invitations?.filter(i => i.status === 'pending') ?? []

  const handleConfirmAction = async () => {
    if (!actionTarget) return

    if (actionTarget.action === 'suspend') {
      await suspendUser({
        orgId,
        userId: actionTarget.userId,
        confirmationEmail: actionTarget.email,
      })
    } else if (actionTarget.action === 'reactivate') {
      await reactivateUser({ orgId, userId: actionTarget.userId })
    } else if (actionTarget.action === 'changeRole' && actionTarget.nextRole) {
      await changeUserRole({
        orgId,
        userId: actionTarget.userId,
        role: actionTarget.nextRole,
        confirmationEmail: actionTarget.email,
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 bg-card">
          <div className="flex flex-1 flex-wrap items-center gap-3 max-w-2xl">
            <SearchField
              placeholder="Search by name or email…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              size="sm"
            />
            <SelectField
              label=""
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              options={[
                { label: 'All roles', value: 'all' },
                { label: 'Patients', value: 'patient' },
                { label: 'Caregivers', value: 'caregiver' },
                { label: 'Clinicians', value: 'clinician' },
                { label: 'Administrators', value: 'admin' },
              ]}
              className="min-w-[140px]"
            />
          </div>
          {onInvite && (
            <Button size="sm" onClick={onInvite}>
              <UserPlus className="size-3.5" /> Invite user
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map(col => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {users === undefined ? 'Loading members…' : 'No members match your filters.'}
                </TableCell>
              </TableRow>
            )}
            {filteredUsers.map(({ user, membership }) => (
              <TableRow key={user._id}>
                <TableCell className="font-semibold text-foreground">{user.name}</TableCell>
                <TableCell className="font-mono text-xs">{user.email}</TableCell>
                <TableCell>
                  <Badge>{membership.orgRole}</Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {user.status === 'Suspended' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setActionTarget({
                            userId: user._id,
                            email: user.email,
                            name: user.name,
                            currentRole: membership.orgRole,
                            action: 'reactivate',
                          })
                        }
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setActionTarget({
                            userId: user._id,
                            email: user.email,
                            name: user.name,
                            currentRole: membership.orgRole,
                            action: 'suspend',
                          })
                        }
                      >
                        Suspend
                      </Button>
                    )}
                    <SelectField
                      label=""
                      value={membership.orgRole}
                      onChange={e => {
                        const nextRole = e.target.value as ActionTarget['nextRole']
                        if (nextRole && nextRole !== membership.orgRole) {
                          setActionTarget({
                            userId: user._id,
                            email: user.email,
                            name: user.name,
                            currentRole: membership.orgRole,
                            action: 'changeRole',
                            nextRole,
                          })
                        }
                      }}
                      options={[
                        { label: 'Patient', value: 'patient' },
                        { label: 'Caregiver', value: 'caregiver' },
                        { label: 'Clinician', value: 'clinician' },
                        { label: 'Admin', value: 'admin' },
                      ]}
                      className="min-w-[120px]"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {pendingInvites.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MoreHorizontal className="size-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Pending invitations</h3>
            <Badge tone="warn">{pendingInvites.length}</Badge>
          </div>
          <div className="space-y-2">
            {pendingInvites.map(invite => (
              <div
                key={invite._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{invite.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{invite.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{invite.role}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void resendInvitation({ orgId, invitationId: invite._id })}
                  >
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCancelInviteTarget({ id: invite._id, email: invite.email })
                    }
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {actionTarget && (
        <ConfirmActionDialog
          open={Boolean(actionTarget)}
          title={
            actionTarget.action === 'suspend'
              ? 'Suspend user account'
              : actionTarget.action === 'reactivate'
                ? 'Reactivate user account'
                : 'Change user role'
          }
          description={`Confirm lifecycle action for ${actionTarget.name}.`}
          impactSummary={
            actionTarget.action === 'suspend'
              ? `${actionTarget.name} will lose access immediately. Their recovery data remains retained per organization policy.`
              : actionTarget.action === 'reactivate'
                ? `${actionTarget.name} will regain access to their assigned workspace.`
                : `Role will change from ${actionTarget.currentRole} to ${actionTarget.nextRole}. Permissions update immediately.`
          }
          confirmLabel={
            actionTarget.action === 'suspend'
              ? 'Suspend account'
              : actionTarget.action === 'reactivate'
                ? 'Reactivate account'
                : 'Change role'
          }
          confirmationEmail={
            actionTarget.action === 'reactivate' ? undefined : actionTarget.email
          }
          destructive={actionTarget.action === 'suspend'}
          onClose={() => setActionTarget(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      {cancelInviteTarget && (
        <ConfirmActionDialog
          open={Boolean(cancelInviteTarget)}
          title="Cancel invitation"
          description="Revoke this pending invitation."
          impactSummary={`${cancelInviteTarget.email} will no longer be able to accept this invitation link.`}
          confirmLabel="Cancel invitation"
          confirmationEmail={cancelInviteTarget.email}
          destructive
          onClose={() => setCancelInviteTarget(null)}
          onConfirm={async () => {
            await cancelInvitation({
              orgId,
              invitationId: cancelInviteTarget.id,
              confirmationEmail: cancelInviteTarget.email,
            })
          }}
        />
      )}
    </div>
  )
}

export function UserManagementTable({ orgId, onInvite }: UserManagementTableProps) {
  if (isE2ETestMode) {
    return <UserManagementTableDemo onInvite={onInvite} />
  }
  return <UserManagementTableLive orgId={orgId} onInvite={onInvite} />
}
