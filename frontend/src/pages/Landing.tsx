import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon, GithubLogoIcon } from '@phosphor-icons/react'

import { Logo } from '../components/app/Logo'
import { AccessBento } from '../components/landing/AccessBento'
import { gsap, ScrollTrigger, scrollToSection, startSmoothScroll, useGSAP } from '../components/landing/gsap'
import { HeroDemo } from '../components/landing/HeroDemo'
import { LocalSection } from '../components/landing/LocalSection'
import { Pipeline } from '../components/landing/Pipeline'
import { useAuth } from '../store/auth'

const REPO_URL = 'https://github.com/Neerajramb/InferaV2'
const HEADLINE = [['Ask', 'your', 'documents.'], ['Keep', 'them', 'in-house.']]

function PrimaryCta({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const signedIn = useAuth((s) => !!s.access)
  return (
    <Link
      to={signedIn ? '/dashboard' : '/login'}
      className={`group inline-flex items-center gap-2 rounded-control bg-accent font-medium text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-[transform,background-color] duration-150 hover:bg-accent/90 active:scale-[0.97] ${size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-10 px-4 text-sm'}`}
    >
      {signedIn ? 'Open workspace' : 'Sign in'}
      <ArrowRightIcon weight="bold" className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
    </Link>
  )
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => startSmoothScroll(), [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
        tl.from('.h-word', { yPercent: 110, duration: 1.1, stagger: 0.06 })
          .from('.h-fade', { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.1 }, '-=0.7')
          .from('.h-demo', { autoAlpha: 0, y: 40, scale: 0.98, duration: 1.2 }, '-=0.9')

        gsap.to('.h-demo', {
          yPercent: -6,
          ease: 'none',
          scrollTrigger: { trigger: '.h-hero', start: 'top top', end: 'bottom top', scrub: true },
        })

        gsap.from('.cta-line', {
          yPercent: 100,
          duration: 1,
          stagger: 0.08,
          ease: 'power4.out',
          scrollTrigger: { trigger: '.cta', start: 'top 80%', once: true },
        })
      })

      ScrollTrigger.create({
        start: 24,
        end: 'max',
        onEnter: () => document.querySelector('.l-nav')?.setAttribute('data-scrolled', 'true'),
        onLeaveBack: () => document.querySelector('.l-nav')?.setAttribute('data-scrolled', 'false'),
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="grain min-h-[100dvh] overflow-x-clip bg-bg">
      <header className="l-nav group fixed inset-x-0 top-0 z-nav transition-[background-color,border-color] duration-300 data-[scrolled=true]:border-b data-[scrolled=true]:border-line data-[scrolled=true]:bg-bg/80 data-[scrolled=true]:backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8" aria-label="Main">
          <Link to="/" aria-label="Infera home"><Logo /></Link>
          <div className="hidden items-center gap-1 md:flex">
            {[
              ['pipeline', 'How it works'],
              ['access', 'Access'],
              ['local', 'Self-hosted'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => scrollToSection(id)} className="rounded-control px-3 py-2 text-sm text-muted transition-colors hover:text-fg">
                {label}
              </button>
            ))}
          </div>
          <PrimaryCta />
        </nav>
      </header>

      <main>
        <section className="h-hero relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_85%_30%,rgb(var(--accent)/0.09),transparent_70%)]" />
          <div className="relative mx-auto grid min-h-[100dvh] max-w-[1200px] items-center gap-14 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:pt-24">
            <div>
              <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[56px]">
                {HEADLINE.map((line, l) => (
                  <span key={l} className="block">
                    {line.map((word, w) => (
                      <span key={w} className="inline-block overflow-hidden pb-[0.08em] align-top">
                        <span className={`h-word inline-block ${l === 1 ? 'text-muted' : ''}`}>{word}&nbsp;</span>
                      </span>
                    ))}
                  </span>
                ))}
              </h1>
              <p className="h-fade mt-6 max-w-[42ch] text-[17px] leading-7 text-muted">
                Infera indexes files on your own hardware and answers with citations, limited to what each person may see.
              </p>
              <div className="h-fade mt-9 flex flex-wrap items-center gap-3">
                <PrimaryCta size="lg" />
                <button onClick={() => scrollToSection('pipeline')} className="inline-flex h-12 items-center rounded-control px-4 text-[15px] font-medium text-muted transition-colors hover:text-fg">
                  How it works
                </button>
              </div>
            </div>
            <div className="h-demo">
              <HeroDemo />
            </div>
          </div>
        </section>

        <Pipeline />
        <AccessBento />
        <LocalSection />

        <section className="cta mx-auto max-w-[1200px] px-5 py-28 sm:px-8 md:py-40">
          <h2 className="text-5xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-7xl">
            <span className="block overflow-hidden pb-[0.06em]"><span className="cta-line block">Your documents</span></span>
            <span className="block overflow-hidden pb-[0.06em]"><span className="cta-line block text-muted">already have the answers.</span></span>
          </h2>
          <div className="mt-10">
            <PrimaryCta size="lg" />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-8 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>A self-hosted knowledge workspace for small teams.</p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-fg">
            <GithubLogoIcon className="h-4 w-4" /> Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
