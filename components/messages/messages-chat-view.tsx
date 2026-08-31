'use client'

import React, { useState } from 'react'
import { Send } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { SearchField, TextField } from '@/components/forms'
import { cn } from '@/lib/utils'

export function MessagesChatView() {
  const [messages, setMessages] = useState([
    {
      from: 'Dr. Olivia Brooks',
      text: 'I reviewed your symptom log. Please keep following the plan we discussed until our appointment.',
      mine: false,
    },
    {
      from: 'Maya Chen',
      text: 'Thank you. I will bring up the headaches I notice after longer screen sessions.',
      mine: true,
    },
  ])
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    setMessages(prev => [...prev, { from: 'Maya Chen', text: inputText, mine: true }])
    setInputText('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Care team"
        title="Messages"
        description="Secure prototype conversations with your coordinated care team."
      />
      <Card className="grid min-h-[540px] overflow-hidden p-0 md:grid-cols-[260px_1fr]">
        <div className="border-r border-border bg-muted/30 p-3 space-y-3">
          <SearchField
            placeholder="Search care team..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            size="sm"
          />
          <div className="rounded-lg bg-card p-3 border border-border/80 shadow-xs cursor-pointer">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">Dr. Olivia Brooks</p>
              <span className="size-2 rounded-full bg-success" />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Your progress looks steady...
            </p>
          </div>
          <div className="p-3 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer">
            <p className="text-xs font-semibold text-foreground">Concussion care team</p>
            <p className="mt-1 text-xs text-muted-foreground">Next session Sep 2</p>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-border p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-foreground">Dr. Olivia Brooks</p>
              <p className="text-xs text-muted-foreground">Sports medicine · Usually replies in 4h</p>
            </div>
            <Badge tone="good">Online</Badge>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-5 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-md rounded-xl p-3.5 text-sm leading-6 shadow-xs',
                  m.mine
                    ? 'ml-auto bg-foreground text-background font-medium'
                    : 'bg-muted text-foreground border border-border/60'
                )}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3 bg-card items-center">
            <div className="flex-1">
              <TextField
                placeholder="Write a message to your care team..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                clearable
                size="md"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Send className="size-3.5" /> Send
            </button>
          </form>
        </div>
      </Card>
    </div>
  )
}
