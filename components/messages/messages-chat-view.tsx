'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { Loader2, Send } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { SearchField, TextField } from '@/components/forms'
import { cn } from '@/lib/utils'
import { isE2ETestMode } from '@/lib/e2e'
import { MessagingDisclaimer } from '@/components/messages/messaging-disclaimer'
import { MessageSafetyBanner } from '@/components/messages/message-safety-banner'

function MessagesChatViewDemo() {
  const [messages, setMessages] = useState([
    {
      from: 'Dr. Olivia Brooks',
      text: '[E2E demo shell] I reviewed your symptom log. Please keep following the plan we discussed.',
      mine: false,
    },
    {
      from: 'Maya Chen',
      text: '[E2E demo shell] Thank you. I will bring up the headaches I notice after longer screen sessions.',
      mine: true,
    },
  ])
  const [inputText, setInputText] = useState('')

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault()
    if (!inputText.trim()) return
    setMessages(prev => [...prev, { from: 'Maya Chen', text: inputText, mine: true }])
    setInputText('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Care team"
        title="Messages"
        description="[E2E demo shell] Secure prototype conversations with your coordinated care team."
      />
      <MessagingDisclaimer />
      <Card className="grid min-h-[540px] overflow-hidden p-0 md:grid-cols-[260px_1fr]">
        <div className="space-y-3 border-r border-border bg-muted/30 p-3">
          <div className="rounded-lg border border-border/80 bg-card p-3">
            <p className="text-xs font-bold text-foreground">Concussion care team</p>
            <p className="mt-1 text-xs text-muted-foreground">Demo conversation</p>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="border-b border-border p-4">
            <p className="text-sm font-semibold text-foreground">Dr. Olivia Brooks</p>
            <p className="text-xs text-muted-foreground">Usually replies during clinical hours</p>
          </div>
          <div
            role="log"
            aria-live="polite"
            aria-label="Care team messages"
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-5"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                role="article"
                aria-label={message.mine ? `You: ${message.text}` : `${message.from}: ${message.text}`}
                className={cn(
                  'max-w-md rounded-xl p-3.5 text-sm leading-6 shadow-xs',
                  message.mine
                    ? 'ml-auto bg-foreground font-medium text-background'
                    : 'border border-border/60 bg-muted text-foreground'
                )}
              >
                {!message.mine && (
                  <p className="mb-1 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                    {message.from}
                  </p>
                )}
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSend}
            aria-label="Compose message to care team"
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-t border-border bg-card p-3"
          >
            <div className="flex-1 min-w-[200px]">
              <TextField
                placeholder="Write a message to your care team..."
                value={inputText}
                onChange={event => setInputText(event.target.value)}
                clearable
                size="md"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label="Send message"
              className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="size-3.5" aria-hidden="true" /> Send
            </button>
          </form>
        </div>
      </Card>
    </div>
  )
}

function createClientMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatMessageTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function MessagesChatView() {
  if (isE2ETestMode) {
    return <MessagesChatViewDemo />
  }
  return <MessagesChatViewLive />
}

function MessagesChatViewLive() {
  const threads = useQuery(api.messages.listThreads)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [safetyGuidance, setSafetyGuidance] = useState<
  | {
      status: string
      highestSeverity: string
      primaryEscalation: string
      userGuidance: string
      isEmergency: boolean
    }
  | null
>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendMessage = useMutation(api.messages.sendMessage)
  const markRead = useMutation(api.messages.markRead)

  const activeThreadId = selectedThreadId ?? threads?.[0]?.threadId ?? null

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.messages.listByThread,
    activeThreadId ? { threadId: activeThreadId } : 'skip',
    { initialNumItems: 25 }
  )

  const chronologicalMessages = useMemo(() => [...(results ?? [])].reverse(), [results])

  const filteredThreads = useMemo(() => {
    if (!threads) return []
    const query = searchQuery.trim().toLowerCase()
    if (!query) return threads
    return threads.filter(
      thread =>
        thread.title.toLowerCase().includes(query) ||
        thread.patientDisplayId.toLowerCase().includes(query) ||
        thread.lastMessagePreview?.toLowerCase().includes(query)
    )
  }, [threads, searchQuery])

  const activeThread = threads?.find(thread => thread.threadId === activeThreadId)

  useEffect(() => {
    if (!activeThreadId) return
    void markRead({ threadId: activeThreadId }).catch(() => {
      // Non-blocking read receipt
    })
  }, [activeThreadId, markRead, chronologicalMessages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chronologicalMessages.length, activeThreadId])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!inputText.trim() || !activeThreadId || isSending) return

    const content = inputText.trim()
    const clientMessageId = createClientMessageId()
    setInputText('')
    setSendError(null)
    setIsSending(true)

    try {
      const result = await sendMessage({
        threadId: activeThreadId,
        content,
        clientMessageId,
      })

      if (result.safetyGuidance) {
        setSafetyGuidance(result.safetyGuidance)
      }
    } catch (error) {
      setInputText(content)
      setSendError(error instanceof Error ? error.message : 'Unable to send message.')
    } finally {
      setIsSending(false)
    }
  }

  if (threads === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Care team"
          title="Messages"
          description="Secure conversations with your coordinated care team."
        />
        <Card className="flex min-h-[320px] items-center justify-center p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            Loading conversations…
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Care team"
        title="Messages"
        description="Secure conversations with your coordinated care team."
      />

      <MessagingDisclaimer />

      {safetyGuidance ? <MessageSafetyBanner guidance={safetyGuidance} /> : null}

      <Card className="grid min-h-[540px] overflow-hidden p-0 md:grid-cols-[260px_1fr]">
        <div className="space-y-3 border-r border-border bg-muted/30 p-3">
          <SearchField
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            size="sm"
          />

          {filteredThreads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No conversations available for your account.
            </div>
          ) : (
            filteredThreads.map(thread => {
              const isActive = thread.threadId === activeThreadId
              return (
                <button
                  key={thread.threadId}
                  type="button"
                  onClick={() => {
                    setSelectedThreadId(thread.threadId)
                    setSafetyGuidance(null)
                  }}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    isActive
                      ? 'border-border/80 bg-card shadow-xs'
                      : 'border-transparent hover:bg-muted/60'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-foreground">{thread.title}</p>
                    {thread.unreadCount > 0 ? (
                      <Badge tone="warn" className="shrink-0">
                        {thread.unreadCount}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{thread.patientDisplayId}</p>
                  {thread.lastMessagePreview ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {thread.lastMessagePreview}
                    </p>
                  ) : null}
                </button>
              )
            })
          )}
        </div>

        <div className="flex flex-col">
          {activeThread ? (
            <>
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeThread.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Patient {activeThread.patientDisplayId} · Replies during clinical hours
                  </p>
                </div>
                <Badge tone="neutral">Secure</Badge>
              </div>

              <div
                role="log"
                aria-live="polite"
                aria-label="Care team messages"
                className="flex flex-1 flex-col gap-3 overflow-y-auto p-5"
              >
                {status === 'CanLoadMore' ? (
                  <button
                    type="button"
                    onClick={() => loadMore(25)}
                    className="mx-auto rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  >
                    Load earlier messages
                  </button>
                ) : null}

                {isLoading && chronologicalMessages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Loading messages…
                  </div>
                ) : null}

                {chronologicalMessages.map(message => (
                  <div
                    key={message._id}
                    role="article"
                    aria-label={message.isMine ? `You: ${message.content}` : `${message.senderName}: ${message.content}`}
                    className={cn(
                      'max-w-md rounded-xl p-3.5 text-sm leading-6 shadow-xs',
                      message.isMine
                        ? 'ml-auto bg-foreground font-medium text-background'
                        : 'border border-border/60 bg-muted text-foreground'
                    )}
                  >
                    {!message.isMine ? (
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                        {message.senderName}
                      </p>
                    ) : null}
                    <p>{message.content}</p>
                    <p
                      className={cn(
                        'mt-2 text-[10px]',
                        message.isMine ? 'text-background/70' : 'text-muted-foreground'
                      )}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                aria-label="Compose message to care team"
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-t border-border bg-card p-3"
              >
                <div className="flex-1 min-w-[200px]">
                  <TextField
                    placeholder="Write a message to your care team..."
                    value={inputText}
                    onChange={event => setInputText(event.target.value)}
                    clearable
                    size="md"
                    disabled={isSending}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  aria-label="Send message"
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                >
                  {isSending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-3.5" aria-hidden="true" />
                  )}
                  Send
                </button>
              </form>

              {sendError ? (
                <p className="border-t border-border px-4 py-2 text-xs text-destructive" role="alert">
                  {sendError}
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a conversation to view secure messages.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
