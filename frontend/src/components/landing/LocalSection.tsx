import { useRef } from 'react'

import { gsap, useGSAP } from './gsap'

const STATEMENT = 'Files stay on the server you run. Passages are embedded on its CPU, and answers come from a model running next to it. Nothing leaves unless you decide it should.'

const STACK = [
  { label: 'Embeddings', value: 'all-MiniLM-L6-v2, 384 dimensions' },
  { label: 'Vector search', value: 'FAISS, inner product' },
  { label: 'Answers', value: 'Ollama, Mistral by default' },
  { label: 'Without a model', value: 'Quotes the best passages' },
]

export function LocalSection() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Words brighten in reading order as the statement scrolls through the viewport.
        gsap.fromTo(
          '.l-word',
          { opacity: 0.16 },
          { opacity: 1, ease: 'none', stagger: 0.06, scrollTrigger: { trigger: '.l-statement', start: 'top 78%', end: 'bottom 42%', scrub: true } },
        )
        gsap.from('.l-spec', {
          autoAlpha: 0,
          y: 16,
          duration: 0.7,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.l-specs', start: 'top 85%', once: true },
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="local" aria-label="Self-hosted" className="border-y border-line bg-surface/50">
      <div className="mx-auto max-w-[1200px] px-5 py-28 sm:px-8 md:py-40">
        <p className="l-statement max-w-4xl text-[30px] font-semibold leading-[1.18] tracking-[-0.03em] md:text-[46px]">
          {STATEMENT.split(' ').map((word, i) => (
            <span key={i} className="l-word">{word} </span>
          ))}
        </p>
        <dl className="l-specs mt-16 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((item) => (
            <div key={item.label} className="l-spec bg-bg p-5">
              <dt className="text-[13px] text-subtle">{item.label}</dt>
              <dd className="mt-1.5 font-mono text-sm text-fg">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
