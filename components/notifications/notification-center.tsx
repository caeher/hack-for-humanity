'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DISCLAIMER =
  'Notifications are not emergency monitoring and may be delayed. They do not replace emergency care.'

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function priorityBadgeVariant(priority: 'low' | 'medium' | 'high') {
  switch (priority) {
    case 'high':
      return 'bad' as const
    case 'medium':
      return 'warn' as const
    default:
      return 'neutral' as const
  }
}

export function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const unreadCount = useQuery(api.notifications.unreadCount)
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)

  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.listForMe,
    {},
    { initialNumItems: 15 }
  )

  const handleNotificationClick = async (
    notificationId: Id<'notifications'>,
    deepLinkPath?: string,
    deepLinkAccessible?: boolean
  ) => {
    await markRead({ notificationId })

    if (deepLinkPath && deepLinkAccessible) {
      setOpen(false)
      router.push(deepLinkPath)
    }
  }

  const count = unreadCount ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
          className="relative grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-primary-foreground"
              aria-hidden
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          {count > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => void markAllRead({})}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <p className="border-b border-border bg-muted/50 px-4 py-2 text-[11px] leading-snug text-muted-foreground">
          {DISCLAIMER}
        </p>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          {results === undefined ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map(item => (
                <li key={item._id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-muted/60',
                      item.isUnread && 'bg-accent/40'
                    )}
                    onClick={() =>
                      void handleNotificationClick(
                        item._id,
                        item.deepLinkPath,
                        item.deepLinkAccessible
                      )
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <Badge variant={priorityBadgeVariant(item.priority)} className="shrink-0 text-[10px]">
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                      {!item.deepLinkAccessible && (
                        <span className="text-[10px] text-warning">Access revoked</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {status === 'CanLoadMore' && (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => loadMore(15)}
              >
                Load more
              </Button>
            </div>
          )}

          {status === 'LoadingMore' && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
