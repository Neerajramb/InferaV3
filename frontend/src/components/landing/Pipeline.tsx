import { useRef } from 'react'

import { gsap, useGSAP } from './gsap'

const STEPS = [
  { title: 'Extract', body: 'Text is pulled out of PDFs, Word files, Markdown and CSV on the server that stores them.' },
  { title: 'Chunk', body: 'The text is split into overlapping passages of about 900 characters, keeping sentences whole.' },
  { title: 'Embed', body: 'Each passage becomes a 384-number vector, computed locally, and is added to a FAISS index.' },
  { title: 'Retrieve and cite', body: 'Your question is matched against passages you are allowed to read. The answer cites each one it uses.' },
]

// Stage coordinates (px) inside a 440 x 360 canvas.
const LINE_WIDTHS = [200, 176, 196, 118, 200, 186, 156, 200, 138, 194, 172, 92]
const BAR_W = 200
const docPos = (i: number) => ({ x: 120, y: 72 + i * 20 })
const chunkPos = (i: number) => {
  const c = Math.floor(i / 3)
  return { x: 42 + (c % 2) * 200, y: 70 + Math.floor(c / 2) * 150 + (i % 3) * 16 }
}
const chunkCenter = (c: number) => ({ x: 42 + (c % 2) * 200 + 70, y: 70 + Math.floor(c / 2) * 150 + 16 })
const QUERY = { x: 212, y: 168 }
// Dots 0-3 come from this document's chunks; 4-11 are passages from other files.
const SCATTER = [
  { x: 176, y: 128 }, { x: 258, y: 196 }, { x: 96, y: 278 }, { x: 352, y: 92 },
  { x: 70, y: 84 }, { x: 128, y: 196 }, { x: 236, y: 120 }, { x: 330, y: 238 },
  { x: 384, y: 300 }, { x: 196, y: 300 }, { x: 300, y: 54 }, { x: 52, y: 180 },
]
const NEAREST = [0, 1, 6]

export function Pipeline() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const bars = q('.p-bar')
      const dots = q('.p-dot')
      const steps = q('.p-step')
      const mm = gsap.matchMedia()

      const setStep = (index: number) => steps.forEach((el, i) => el.setAttribute('data-active', String(i === index)))

      // Static end state: mobile, or reduced motion.
      const showFinal = () => {
        bars.forEach((bar) => gsap.set(bar, { autoAlpha: 0 }))
        q('.p-doc, .p-chunkbox').forEach((el) => gsap.set(el, { autoAlpha: 0 }))
        dots.forEach((dot, i) => gsap.set(dot, { x: SCATTER[i].x, y: SCATTER[i].y, autoAlpha: 1, scale: 1 }))
        gsap.set(q('.p-grid, .p-query, .p-answer'), { autoAlpha: 1, y: 0 })
        gsap.set(q('.p-link'), { strokeDashoffset: 0 })
        gsap.set(NEAREST.map((i) => dots[i].firstElementChild), { autoAlpha: 1 })
        steps.forEach((el) => el.setAttribute('data-active', 'true'))
      }

      // The callback only runs when a condition matches, so mobile needs its own entry.
      mm.add({ desktop: '(min-width: 1024px)', mobile: '(max-width: 1023.98px)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
        const { desktop, reduce } = ctx.conditions as { desktop: boolean; reduce: boolean }
        if (!desktop || reduce) {
          showFinal()
          return
        }

        bars.forEach((bar, i) => gsap.set(bar, { x: docPos(i).x, y: docPos(i).y, scaleX: 0, transformOrigin: 'left center' }))
        dots.forEach((dot, i) => {
          const start = i < 4 ? chunkCenter(i) : SCATTER[i]
          gsap.set(dot, { x: start.x, y: start.y, autoAlpha: 0, scale: 0.6 })
        })
        gsap.set(q('.p-chunkbox, .p-grid, .p-query'), { autoAlpha: 0 })
        gsap.set(q('.p-answer'), { autoAlpha: 0, y: 16 })
        gsap.set(q('.p-link'), { strokeDashoffset: 1 })
        setStep(0)

        const tl = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          scrollTrigger: {
            trigger: root.current,
            pin: q('.p-pin')[0],
            start: 'top top',
            end: () => `+=${window.innerHeight * 3}`,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => setStep(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length * 0.999))),
          },
        })

        // 1. Extract: lines of text appear on the page.
        tl.to(bars, { scaleX: (i) => LINE_WIDTHS[i] / BAR_W, duration: 1, stagger: 0.05 })
        // 2. Chunk: lines regroup into four passages.
          .to(q('.p-chunkbox'), { autoAlpha: 1, duration: 0.5 }, 1.4)
          .to(bars, { x: (i) => chunkPos(i).x, y: (i) => chunkPos(i).y, scaleX: (i) => (LINE_WIDTHS[i] / BAR_W) * 0.68, duration: 1, stagger: 0.03 }, 1.4)
          .to(q('.p-doc'), { autoAlpha: 0.25, duration: 0.6 }, 1.6)
        // 3. Embed: each passage collapses into a point in vector space.
          .to(bars, { scaleX: 0.04, autoAlpha: 0, duration: 0.5, stagger: 0.02 }, 2.9)
          .to(q('.p-chunkbox, .p-doc'), { autoAlpha: 0, duration: 0.5 }, 2.9)
          .to(q('.p-grid'), { autoAlpha: 1, duration: 0.6 }, 3.1)
          .to(dots.slice(0, 4), { autoAlpha: 1, scale: 1, duration: 0.3 }, 3.2)
          .to(dots.slice(0, 4), { x: (i) => SCATTER[i].x, y: (i) => SCATTER[i].y, duration: 0.9 }, 3.5)
          .to(dots.slice(4), { autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.04 }, 3.6)
        // 4. Retrieve: the question lands, nearest passages light up, answer appears.
          .to(q('.p-query'), { autoAlpha: 1, duration: 0.4 }, 4.6)
          .to(q('.p-link'), { strokeDashoffset: 0, duration: 0.7, stagger: 0.1 }, 4.9)
          .to(NEAREST.map((i) => dots[i].firstElementChild), { autoAlpha: 1, duration: 0.3, stagger: 0.08 }, 5.2)
          .to(q('.p-answer'), { autoAlpha: 1, y: 0, duration: 0.6 }, 5.5)
          .to({}, { duration: 0.6 })

        return () => setStep(0)
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="pipeline" aria-labelledby="pipeline-title" className="relative">
      <div className="p-pin flex min-h-[100dvh] items-center">
        <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_480px] lg:gap-20">
          <div className="flex flex-col justify-center">
            <h2 id="pipeline-title" className="max-w-md text-4xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-5xl">From a PDF to a cited answer</h2>
            <ol className="mt-10 space-y-1">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  data-active={i === 0}
                  className="p-step group relative rounded-control py-3 pl-6 pr-4 transition-[opacity] duration-300 data-[active=false]:opacity-40"
                >
                  <span className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-[2px] rounded-full bg-line" aria-hidden="true">
                    <span className="block h-full w-full origin-top scale-y-0 rounded-full bg-accent transition-transform duration-500 ease-out group-data-[active=true]:scale-y-100" />
                  </span>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{step.title}</h3>
                  <p className="mt-1 max-w-sm text-[15px] leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative mx-auto hidden h-[360px] w-[440px] lg:block" aria-hidden="true">
            <div className="p-grid absolute inset-0 rounded-panel border border-line bg-[linear-gradient(rgb(var(--line)/0.5)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--line)/0.5)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="p-doc absolute left-[96px] top-[36px] h-[300px] w-[248px] rounded-[12px] border border-line-strong bg-surface shadow-panel">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <span className="rounded-[4px] bg-danger/15 px-1.5 font-mono text-[9px] uppercase text-danger">pdf</span>
                <span className="h-1.5 w-24 rounded-full bg-fg/15" />
              </div>
            </div>
            {[0, 1, 2, 3].map((c) => (
              <div
                key={c}
                className="p-chunkbox absolute h-[60px] w-[172px] rounded-[10px] border border-dashed border-accent/50 bg-accent/[0.04]"
                style={{ left: 30 + (c % 2) * 200, top: 58 + Math.floor(c / 2) * 150 }}
              />
            ))}
            {LINE_WIDTHS.map((_, i) => (
              <span key={i} className="p-bar absolute left-0 top-0 h-[6px] rounded-full bg-fg/30" style={{ width: BAR_W }} />
            ))}
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 440 360">
              {NEAREST.map((i) => (
                <line key={i} className="p-link" x1={QUERY.x} y1={QUERY.y} x2={SCATTER[i].x} y2={SCATTER[i].y} pathLength={1} strokeDasharray="1" stroke="rgb(var(--accent))" strokeWidth="1.5" />
              ))}
            </svg>
            {SCATTER.map((_, i) => (
              <span key={i} className="p-dot absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full bg-fg/40 ring-2 ring-bg">
                <span className="invisible absolute inset-0 rounded-full bg-accent opacity-0" />
              </span>
            ))}
            <span className="p-query absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-bg" style={{ left: QUERY.x, top: QUERY.y }}>
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
            </span>
            <div className="p-answer absolute bottom-[-28px] left-[40px] right-[40px] rounded-[12px] border border-line-strong bg-elevated p-3.5 shadow-pop">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-[58%] rounded-full bg-fg/25" />
                <span className="rounded-[4px] bg-accent/15 px-1 font-mono text-[10px] text-accent-ink">1</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 w-[40%] rounded-full bg-fg/25" />
                <span className="rounded-[4px] bg-accent/15 px-1 font-mono text-[10px] text-accent-ink">2</span>
                <span className="rounded-[4px] bg-accent/15 px-1 font-mono text-[10px] text-accent-ink">3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
