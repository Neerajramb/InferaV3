import { memo, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, useReducedMotion } from 'motion/react'
import { CaretDownIcon, CheckIcon, CopyIcon, FileTextIcon, NoteIcon, SparkleIcon, WarningIcon } from '@phosphor-icons/react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'

import { errorMessage, openDocument } from '../../lib/api'
import { cn } from '../../lib/format'
import type { ChatMessage, Source } from '../../lib/types'

/** Older messages stored sources in a different shape. */
export function normalizeSources(sources: unknown[]): Source[] {
  return (sources ?? []).map((raw, index) => {
    const s = raw as Record<string, unknown>
    if (typeof s.n === 'number') return s as unknown as Source
    const isNote = s.entity_type === 'note'
    return {
      n: index + 1,
      entity_type: isNote ? 'note' : 'document',
      entity_id: Number(isNote ? s.note_id : s.document_id),
      title: String((isNote ? s.note_title : s.document_title) ?? 'Source'),
      chunk_index: Number(s.chunk_index ?? 0),
      score: Number(s.score ?? 0),
    }
  })
}

function openSource(source: Source, navigate: NavigateFunction) {
  if (source.entity_type === 'note') navigate(`/notes?note=${source.entity_id}&space=all`)
  else openDocument(source.entity_id, source.title).catch((e) => toast.error(errorMessage(e)))
}

function Citation({ source, label }: { source?: Source; label: string }) {
  const navigate = useNavigate()
  if (!source) return <sup className="text-subtle">[{label}]</sup>
  return (
    <span className="group/cite relative inline-block align-baseline">
      <button
        onClick={() => openSource(source, navigate)}
        className="mx-0.5 inline-flex h-[18px] min-w-[18px] -translate-y-[1px] items-center justify-center rounded-[5px] border border-accent/30 bg-accent/10 px-1 font-mono text-[10.5px] font-medium text-accent-ink transition-colors hover:bg-accent/20"
        aria-label={`Source ${label}: ${source.title}`}
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-overlay mb-2 w-72 origin-bottom -translate-x-1/2 scale-[0.97] rounded-control border border-line bg-elevated p-3 text-left opacity-0 shadow-pop transition-[opacity,transform] duration-150 ease-out group-hover/cite:scale-100 group-hover/cite:opacity-100 group-hover/cite:delay-150 group-has-[:focus-visible]/cite:scale-100 group-has-[:focus-visible]/cite:opacity-100"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
          {source.entity_type === 'note' ? <NoteIcon className="h-3.5 w-3.5" /> : <FileTextIcon className="h-3.5 w-3.5" />}
          <span className="truncate">{source.title}</span>
        </span>
        {source.snippet && <span className="mt-1.5 line-clamp-4 block text-xs leading-5 text-muted">{source.snippet}</span>}
      </span>
    </span>
  )
}

/** Turn [1], [1][2] and [1, 2] into links the markdown renderer maps to citation chips. */
function linkCitations(text: string) {
  return text.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_, group: string) =>
    group
      .split(',')
      .map((n) => `[${n.trim()}](#cite-${n.trim()})`)
      // A word joiner keeps trailing punctuation on the same line as the chip.
      .join('') + '\u2060',
  )
}

const Markdown = memo(function Markdown({ content, sources }: { content: string; sources: Source[] }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          if (href?.startsWith('#cite-')) {
            const n = Number(href.slice(6))
            return <Citation source={sources.find((s) => s.n === n)} label={String(n)} />
          }
          return <a href={href} target="_blank" rel="noreferrer">{children}</a>
        },
      }}
    >
      {linkCitations(content)}
    </ReactMarkdown>
  )
})

function SourceList({ sources }: { sources: Source[] }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const unique = sources.filter((s, i, all) => all.findIndex((x) => x.entity_type === s.entity_type && x.entity_id === s.entity_id) === i)
  return (
    <div className="mt-4">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-fg" aria-expanded={open}>
        {unique.length} {unique.length === 1 ? 'source' : 'sources'}
        <CaretDownIcon className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {!open &&
          unique.slice(0, 4).map((source) => (
            <button key={`${source.entity_type}-${source.entity_id}`} onClick={() => openSource(source, navigate)} className="inline-flex max-w-[240px] items-center gap-1.5 rounded-chip border border-line bg-elevated/60 px-2 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg">
              {source.entity_type === 'note' ? <NoteIcon className="h-3.5 w-3.5 shrink-0" /> : <FileTextIcon className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{source.title}</span>
            </button>
          ))}
      </div>
      {open && (
        <motion.ol initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-2">
          {sources.map((source) => (
            <li key={`${source.n}`}>
              <button onClick={() => openSource(source, navigate)} className="w-full rounded-control border border-line bg-surface p-3 text-left transition-colors hover:border-line-strong">
                <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-accent/10 px-1 font-mono text-[10.5px] text-accent-ink">{source.n}</span>
                  <span className="truncate">{source.title}</span>
                  <span className="ml-auto shrink-0 text-xs font-normal text-subtle">part {source.chunk_index + 1}</span>
                </span>
                {source.snippet && <span className="mt-1.5 line-clamp-3 block text-[13px] leading-5 text-muted">{source.snippet}</span>}
              </button>
            </li>
          ))}
        </motion.ol>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-xs text-subtle transition-colors hover:bg-elevated hover:text-fg"
      aria-label="Copy answer"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-success" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

interface MessageViewProps {
  message: ChatMessage
  streaming?: boolean
  error?: string | null
  onRetry?: () => void
  footer?: ReactNode
}

export function MessageView({ message, streaming, error, onRetry }: MessageViewProps) {
  const reduce = useReducedMotion()
  const sources = normalizeSources(message.sources)
  const enter = { initial: reduce ? false : { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] as const } }

  if (message.role === 'user') {
    return (
      <motion.div {...enter} className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-[14px] rounded-br-[5px] bg-elevated px-4 py-2.5 text-[15px] leading-7 text-fg shadow-inset ring-1 ring-line">
          {message.content}
        </div>
      </motion.div>
    )
  }

  const thinking = streaming && !message.content
  return (
    <motion.div {...enter} className="flex gap-3.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-accent/25 bg-accent/10 text-accent-ink">
        <SparkleIcon weight="fill" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        {thinking ? (
          <div className="flex h-7 items-center gap-2 text-sm text-muted">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-accent-ink" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </span>
            {sources.length ? `Reading ${sources.length} ${sources.length === 1 ? 'passage' : 'passages'}` : 'Searching your documents'}
          </div>
        ) : (
          <div className="prose-chat">
            <Markdown content={message.content} sources={sources} />
            {streaming && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-caret bg-accent-ink" aria-hidden="true" />}
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-danger" role="alert">
            <WarningIcon className="h-4 w-4" /> {error}
            {onRetry && <button onClick={onRetry} className="font-medium underline underline-offset-4">Retry</button>}
          </div>
        )}
        {!streaming && sources.length > 0 && <SourceList sources={sources} />}
        {!streaming && message.content && (
          <div className="mt-2 -ml-2">
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
