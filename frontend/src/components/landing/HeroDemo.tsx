import { useRef, useState, type MouseEvent } from 'react'
import { ArrowUpIcon, FunnelSimpleIcon } from '@phosphor-icons/react'

import { MessageView } from '../chat/MessageView'
import type { ChatMessage, Source } from '../../lib/types'
import { gsap, prefersReducedMotion, useGSAP } from './gsap'

const QUESTION = 'What has to happen before someone opens a high-voltage panel?'
const ANSWER =
  'Lock-out tag-out is mandatory before opening any panel rated above 50 volts [1]. For rooftop work, two people must be on site and the site lead signs the permit [1]. ' +
  'The rooftop checklist adds two checks: wind speed under 38 km/h and a current harness inspection date [2].'
const WORDS = ANSWER.split(' ')

const SOURCES: Source[] = [
  { n: 1, entity_type: 'document', entity_id: 0, title: 'field-service-handbook.md', chunk_index: 1, score: 0.71, snippet: 'Lock-out tag-out is mandatory before opening any panel rated above 50 volts. Two people must be on site for rooftop work. The site lead signs the permit.' },
  { n: 2, entity_type: 'note', entity_id: 0, title: 'Rooftop permit checklist', chunk_index: 0, score: 0.58, snippet: 'Check wind speed is under 38 km/h. Confirm harness inspection date. Second person on site.' },
]

type Phase = 'typing' | 'thinking' | 'streaming' | 'done'

/**
 * A scripted conversation rendered with the app's real chat components.
 * The script pauses whenever the panel is off screen.
 */
export function HeroDemo() {
  const root = useRef<HTMLDivElement>(null)
  const reduce = typeof window !== 'undefined' && prefersReducedMotion()
  const [typed, setTyped] = useState(0)
  const [words, setWords] = useState(reduce ? WORDS.length : 0)
  const [phase, setPhase] = useState<Phase>(reduce ? 'done' : 'typing')

  useGSAP(
    () => {
      if (reduce) return
      const proxy = { q: 0, a: 0 }
      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.4,
        delay: 1.1,
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', toggleActions: 'play pause resume pause' },
      })
      tl.call(() => {
        proxy.q = 0
        proxy.a = 0
        setTyped(0)
        setWords(0)
        setPhase('typing')
      })
        .to(proxy, { q: QUESTION.length, duration: 1.9, ease: 'none', onUpdate: () => setTyped(Math.round(proxy.q)) })
        .call(() => setPhase('thinking'), [], '+=0.35')
        .call(() => setPhase('streaming'), [], '+=0.9')
        .to(proxy, { a: WORDS.length, duration: 3.2, ease: 'none', onUpdate: () => setWords(Math.round(proxy.a)) })
        .call(() => setPhase('done'))
        .to({}, { duration: 5 })
        .to('.demo-thread', { opacity: 0, y: -8, duration: 0.35, ease: 'power2.in' })
        .set('.demo-thread', { opacity: 1, y: 0 })
    },
    { scope: root },
  )

  const asked = phase !== 'typing'
  const ai: ChatMessage = {
    id: 'demo-ai',
    role: 'ai',
    content: phase === 'thinking' ? '' : WORDS.slice(0, words).join(' '),
    sources: phase === 'typing' ? [] : SOURCES,
    created_at: '',
  }
  const user: ChatMessage = { id: 'demo-user', role: 'user', content: QUESTION, sources: [], created_at: '' }

  // The demo is for looking at: keep hover previews, block navigation.
  const blockClicks = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div ref={root} className="relative rounded-[20px] border border-line bg-surface/80 p-1.5 shadow-pop backdrop-blur" role="region" aria-label="Example conversation with Infera">
      <div className="rounded-[15px] border border-line bg-bg">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-xs text-subtle">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          mistral on Ollama
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-[7px] bg-accent/10 px-2 py-1 text-accent-ink">
            <FunnelSimpleIcon className="h-3.5 w-3.5" /> Field operations
          </span>
        </div>
        <div className="demo-thread h-[340px] space-y-6 overflow-hidden px-4 py-5 sm:h-[360px]" onClickCapture={blockClicks}>
          {asked && <MessageView message={user} />}
          {asked && <MessageView message={ai} streaming={phase !== 'done'} />}
        </div>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-[12px] border border-line bg-surface px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {phase === 'typing' ? QUESTION.slice(0, typed) : ''}
              {phase === 'typing' && <span className="ml-px inline-block h-4 w-px translate-y-[3px] animate-caret bg-fg" />}
              {phase !== 'typing' && <span className="text-subtle">Ask a follow-up</span>}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-accent text-on-accent">
              <ArrowUpIcon weight="bold" className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
