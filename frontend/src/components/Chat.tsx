'use client'
import { useState, useRef } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  async function handleSend() {
    if (!input.trim() || loading) return
    const text = input
    setInput('')
    setLoading(true)

    const userMsg: Msg = { role: 'user', content: text }
    setMessages(m => [...m, userMsg])

    // reserve slot for assistant reply
    const aiIndex = messages.length + 1
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }))

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, chat_history: history }),
      })
      if (!res.ok || !res.body) throw new Error(`API ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      // Streaming state
      let done = false
      let buffer = ''       // holds partial line between reads (for SSE)
      let accum = ''        // full text we’ve decided to show (idempotent)

      // Helper: commit current accum to UI
      const commit = () => {
        setMessages(curr => {
          const next = [...curr]
          const msg = next[aiIndex] ?? { role: 'assistant', content: '' }
          msg.content = accum
          next[aiIndex] = msg
          return next
        })
      }

      // Normalize very obvious immediate word doubles at boundaries
      function dedupeBoundary(a: string, b: string): string {
        // if b starts with the last word of a repeated, trim one
        const tail = a.split(/\s+/).slice(-3).join(' ')
        if (tail && b.startsWith(tail)) {
          // try the longest overlap first
          for (let n = Math.min(3, tail.split(' ').length); n >= 1; n--) {
            const piece = tail.split(' ').slice(-n).join(' ')
            if (b.startsWith(piece)) {
              return b.slice(piece.length)
            }
          }
        }
        return b
      }

      // Process one logical payload (raw text or parsed JSON.content)
      function onPayload(payload: string) {
        let incoming = payload

        // If the backend sends JSON frames, prefer "content"
        try {
          const j = JSON.parse(payload)
          if (typeof j?.content === 'string') incoming = j.content
        } catch { /* not JSON, ignore */ }

        // Decide cumulative vs delta:
        // If incoming looks like a prefix-extension of accum, treat as cumulative
        if (incoming.length >= accum.length && incoming.startsWith(accum)) {
          accum = incoming
          commit()
          return
        }

        // If accum appears inside incoming (some servers resend with minor variance)
        const idx = incoming.indexOf(accum)
        if (idx === 0 || (idx > 0 && idx < incoming.length)) {
          accum = incoming.slice(0) // replace completely
          commit()
          return
        }

        // Otherwise treat as delta; trim obvious duplicate boundary
        const delta = dedupeBoundary(accum, incoming)
        if (delta) {
          accum += delta
          commit()
        }
      }

      while (!done) {
        const { value, done: rdDone } = await reader.read()
        done = rdDone
        const chunk = value ? decoder.decode(value, { stream: !done }) : ''
        if (!chunk) continue

        // If the stream uses SSE, split on newlines and collect data: lines.
        buffer += chunk
        let lineBreakIndex: number
        while ((lineBreakIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineBreakIndex).trimEnd()
          buffer = buffer.slice(lineBreakIndex + 1)

          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            onPayload(payload)
          } else if (line === '') {
            // ignore keep-alives
          } else {
            // Non-SSE line; treat as plain text payload
            onPayload(line)
          }
        }

        // If it’s not SSE at all (just raw text), process the chunk directly
        if (!chunk.includes('data:') && !chunk.includes('\n')) {
          onPayload(chunk)
        }
      }

      // flush any remainder in buffer (last line without newline)
      if (buffer.trim()) onPayload(buffer.trim())

    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Error contacting backend.' }])
    } finally {
      setLoading(false)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col">
      <h1 className="text-lg font-medium tracking-tight mb-4">
        {process.env.NEXT_PUBLIC_SITE_NAME || 'RAG Client'}
      </h1>

      <div className="flex-1 space-y-6">
        {messages.map((m: Msg, i: number) => (
          <div
            key={i}
            className={m.role === 'user'
              ? 'flex justify-end max-w-full'
              : 'flex justify-start max-w-full'}
          >
            {m.role === 'user' ? (
              <div className="rounded-xl px-4 py-3 bubble max-w-[75%] text-left">
                {m.content}
              </div>
            ) : (
              <div className="whitespace-pre-wrap max-w-[80%] text-left">
                {m.content}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 mt-6">
        <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 bg-transparent">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            rows={1}
            placeholder="Type your message…"
            className="flex-1 bg-transparent outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send"
            title="Send"
            className={[
              'flex items-center justify-center',
              'h-9 w-9 rounded-full',
              'border border-black/20 dark:border-white/20',
              'bg-transparent',
              (loading || !input.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
            ].join(' ')}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
