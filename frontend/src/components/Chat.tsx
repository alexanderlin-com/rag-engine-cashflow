'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'


type Msg = { role: 'user' | 'assistant'; content: string }

// This is the "thinking" animation.
const LoadingIndicator = () => (
  <div className="flex items-center justify-center space-x-2">
    <div className="h-2 w-2 bg-neutral-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    <div className="h-2 w-2 bg-neutral-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
    <div className="h-2 w-2 bg-neutral-400 rounded-full animate-pulse"></div>
  </div>
)

const mdComponents: Components = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer" />
  ),
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code className="px-1 py-0.5 rounded bg-[var(--bubble)] border border-[var(--composer-border)]">
          {children}
        </code>
      )
    }
    return (
      <pre className="p-3 rounded-lg bg-[var(--bubble)] border border-[var(--composer-border)] overflow-x-auto">
        <code className={className}>{children}</code>
      </pre>
    )
  },
}

// This is our smart interpreter. It fixes the AI's lazy markdown.
function normalizeMarkdown(raw: string): string {
  let text = raw;

  // Rule 1: Convert standalone bold lines into Level 2 Headings. (Kept from before)
  text = text.replace(/^\*\*(.*?)\*\*$/gm, '## $1');

  // Rule 2 (NEW): Convert bolded term/definition pairs into a bulleted list.
  // This looks for any line that starts with `**Word:**` and automatically
  // prepends a `*` to turn it into a proper list item.
  text = text.replace(/^(\s*)\*\*(.*?):\*\*/gm, '$1* **$2:**');

  // Rule 3: Ensure there's a blank line before a list starts.
  // This helps separate the list from the preceding paragraph.
  text = text.replace(/(\n\n\s*)(\* |1\. )/g, '$1\n$2');

  return text;
}


export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const aiIndexRef = useRef<number | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return

    const text = input.trim()
    setInput('')
    setLoading(true)

    const userMsg: Msg = { role: 'user', content: text }
    setMessages((prev): Msg[] => {
      const next = [...prev, userMsg, { role: 'assistant' as const, content: '' }]
      aiIndexRef.current = next.length - 1
      return next
    })

    try {
      const history = [...messages, userMsg]

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          chat_history: history.map(({ role, content }) => ({ role, content })),
        }),
      })
      if (!res.ok || !res.body) throw new Error(`API ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let done = false
      let buffer = ''
      let accum = ''

      const commit = () => {
        const idx = aiIndexRef.current
        if (idx == null) return
        setMessages((curr) => {
          if (!curr[idx]) return curr
          const next = curr.slice()
          next[idx] = { role: 'assistant' as const, content: accum }
          return next
        })
      }

      function mergeWithOverlap(existing: string, incoming: string): string {
        if (!existing) return incoming
        if (incoming.startsWith(existing)) return incoming
        if (existing.startsWith(incoming)) return existing

        const max = Math.min(512, existing.length, incoming.length)
        const a = existing.slice(-max)
        const b = incoming.slice(0, max)
        for (let i = max; i > 0; i--) {
          if (a.slice(-i) === b.slice(0, i)) {
            return existing + incoming.slice(i)
          }
        }
        return existing + incoming
      }

      function extractContent(raw: string): string {
        try {
          const j = JSON.parse(raw)
          if (typeof j?.content === 'string') return j.content
          if (typeof j?.delta === 'string') return j.delta
          if (typeof j?.text === 'string') return j.text
        } catch { /* not JSON */ }
        return raw
      }

      function onPayload(raw: string) {
        if (!raw || raw === '[DONE]') return
        const incoming = extractContent(raw)
        accum = mergeWithOverlap(accum, incoming)
        commit()
      }

      while (!done) {
        const { value, done: rdDone } = await reader.read()
        done = rdDone
        const chunk = value ? decoder.decode(value, { stream: !done }) : ''
        if (!chunk) continue

        buffer += chunk

        let nl: number
        let sawSSE = false
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trimEnd()
          buffer = buffer.slice(nl + 1)
          if (line.startsWith('data:')) {
            sawSSE = true
            const payload = line.slice(5).trim()
            if (payload) onPayload(payload)
          }
        }

        if (!sawSSE && !chunk.includes('data:')) {
          const parts = chunk.split(/\r?\n/).filter(Boolean)
          if (parts.length > 1) {
            for (const p of parts) onPayload(p)
          } else {
            onPayload(chunk)
          }
        }
      }

      const tail = buffer.trim()
      if (tail) onPayload(tail)
    } catch {
      setMessages((m): Msg[] => [...m, { role: 'assistant' as const, content: 'Error contacting backend.' }])
    } finally {
      setLoading(false)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      aiIndexRef.current = null
    }
  }

  return (
    <>
      <main className="mx-auto max-w-3xl px-4">
        <div className="pb-[calc(92px+env(safe-area-inset-bottom))] space-y-6">
          {messages.length === 0 ? (
            <div className="text-center pt-24">
              <h1 className="text-4xl font-bold">Cashflow Depot RAG</h1>
              <p className="text-neutral-500 mt-2">
                Ask a question to get started.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'flex justify-end max-w-full'
                    : 'flex justify-start max-w-full'
                }
              >
                {m.role === 'user' ? (
                  <div className="rounded-xl px-4 py-3 max-w-[75%] text-left bg-[var(--bubble)] border border-[var(--composer-border)]">
                    {m.content}
                  </div>
                ) : (
                  <div className="prose dark:prose-invert max-w-[80%] text-left">
                    {m.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={mdComponents}
                      >
                        {normalizeMarkdown(m.content)}
                      </ReactMarkdown>
                    ) : (
                      <LoadingIndicator />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--composer-bg)] border-t border-[var(--composer-border)]">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-end gap-2 rounded-xl px-3 py-2 bg-[var(--bubble)] border border-[var(--composer-border)] shadow-lg">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              rows={1}
              placeholder="Type your message…"
              className="flex-1 bg-transparent text-[var(--fg)] placeholder:text-[var(--placeholder-fg)] outline-none resize-none leading-6"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Send"
              title="Send"
              className={[
                'flex items-center justify-center',
                'h-9 w-9 rounded-full',
                'border border-neutral-400',
                loading || !input.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:opacity-80',
              ].join(' ')}
            >
              ↑
            </button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </>
  )
}