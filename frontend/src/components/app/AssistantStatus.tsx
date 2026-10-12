import { cn } from '../../lib/format'
import type { AssistantStatus as Status } from '../../lib/types'

export function assistantLabel(status?: Status) {
  if (!status) return { title: 'Checking assistant', detail: '' }
  if (status.provider === 'ollama') return { title: `${status.model} on Ollama`, detail: 'Answers are generated on this machine.' }
  if (status.provider === 'gemini') return { title: `${status.model} via Gemini`, detail: 'Retrieved passages are sent to Google to write answers.' }
  return {
    title: 'Passage mode',
    detail: status.detail
      ? `${status.detail}. Infera quotes the most relevant passages instead of writing summaries.`
      : 'Infera quotes the most relevant passages instead of writing summaries.',
  }
}

/** A status dot that carries real meaning: green when a model is writing answers, amber in passage mode. */
export function AssistantDot({ status, className }: { status?: Status; className?: string }) {
  const live = status?.provider === 'ollama' || status?.provider === 'gemini'
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden="true">
      {live && <span className="absolute inset-0 animate-ping rounded-full bg-success/50 [animation-duration:2.4s]" />}
      <span className={cn('relative h-2 w-2 rounded-full', !status ? 'bg-line-strong' : live ? 'bg-success' : 'bg-warning')} />
    </span>
  )
}
