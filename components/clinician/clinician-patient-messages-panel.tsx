'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/forms'
import { MessagingDisclaimer } from '@/components/messages/messaging-disclaimer'
import { DataSourceBadge } from './data-source-badge'
import { cn } from '@/lib/utils'

function createClientMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface ClinicianPatientMessagesPanelProps {
  patientId: Id<'patients'>
  className?: string
}

export function ClinicianPatientMessagesPanel({
  patientId,
  className,
}: ClinicianPatientMessagesPanelProps) {
  const threads = useQuery(api.messages.listThreads)
  const sendMessage = useMutation(api.messages.sendMessage)
  const markRead = useMutation(api.messages.markRead)

  const patientThread = useMemo(
    () => threads?.find(thread => thread.patientId === patientId) ?? null,
    [threads, patientId]
  )

  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.listByThread,
    patientThread ? { threadId: patientThread.threadId } : 'skip',
    { initialNumItems: 25 }
  )

  const chronologicalMessages = useMemo(() => [...(results ?? [])].reverse(), [results])

  useEffect(() => {
    if (patientThread) {
      void markRead({ threadId: patientThread.threadId })
    }
  }, [patientThread, markRead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chronologicalMessages.length])

  if (threads === undefined) {
    return (
      <Card className={cn('flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground', className)}>
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading messages…
      </Card>
    )
  }

  if (!patientThread) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <MessageSquare className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium text-foreground">No secure thread for this patient</p>
          <p className="text-sm text-muted-foreground">
            A care-team conversation will appear here once messaging is initiated.
          </p>
        </div>
      </Card>
    )
  }

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!inputText.trim() || !patientThread) return
    setIsSending(true)
    setSendError(null)
    try {
      await sendMessage({
        threadId: patientThread.threadId,
        content: inputText.trim(),
        clientMessageId: createClientMessageId(),
      })
      setInputText('')
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-foreground">Secure messages</h2>
        <DataSourceBadge kind="patient_reported" />
      </div>
      <MessagingDisclaimer />
      <Card className="flex min-h-[400px] flex-col overflow-hidden">
        <div className="border-b border-border p-4">
          <p className="text-sm font-semibold text-foreground">{patientThread.title}</p>
          <p className="text-xs text-muted-foreground">
            {patientThread.patientDisplayId} · {patientThread.unreadCount} unread
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {status === 'LoadingFirstPage' ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading conversation…
            </div>
          ) : chronologicalMessages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages in this thread yet.
            </p>
          ) : (
            chronologicalMessages.map(message => (
              <div
                key={message._id}
                className={cn(
                  'max-w-md rounded-xl p-3 text-sm leading-6',
                  message.isMine
                    ? 'ml-auto bg-primary font-medium text-primary-foreground'
                    : 'border border-border bg-muted text-foreground'
                )}
              >
                {!message.isMine ? (
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    {message.senderName}
                  </p>
                ) : null}
                {message.content}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        {status === 'CanLoadMore' ? (
          <div className="border-t border-border p-2 text-center">
            <Button type="button" variant="ghost" size="sm" onClick={() => loadMore(25)}>
              Load earlier messages
            </Button>
          </div>
        ) : null}
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
          <div className="flex-1">
            <TextField
              placeholder="Write a secure message…"
              value={inputText}
              onChange={event => setInputText(event.target.value)}
              clearable
              size="md"
            />
          </div>
          <Button type="submit" disabled={!inputText.trim() || isSending}>
            <Send className="size-3.5" aria-hidden="true" />
            Send
          </Button>
        </form>
        {sendError ? (
          <p className="px-3 pb-3 text-sm text-destructive" role="alert">
            {sendError}
          </p>
        ) : null}
      </Card>
    </div>
  )
}
