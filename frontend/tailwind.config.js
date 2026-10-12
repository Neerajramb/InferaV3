/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        elevated: token('elevated'),
        sunken: token('sunken'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        muted: token('fg-muted'),
        subtle: token('fg-subtle'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        'on-accent': token('on-accent'),
        danger: token('danger'),
        warning: token('warning'),
        success: token('success'),
        chart: token('chart'),
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Radius rule: controls 10px, panels 16px, chips 6px, avatars are squircles (10px).
      borderRadius: {
        chip: '6px',
        control: '10px',
        panel: '16px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      // z-index scale: nav < overlay < modal < toast < grain
      zIndex: {
        nav: '30',
        overlay: '40',
        modal: '50',
        toast: '60',
        grain: '70',
      },
      boxShadow: {
        panel: '0 1px 0 rgb(var(--shadow) / 0.04), 0 8px 24px -12px rgb(var(--shadow) / 0.18)',
        pop: '0 0 0 1px rgb(var(--line-strong) / 0.6), 0 16px 48px -12px rgb(var(--shadow) / 0.45)',
        inset: 'inset 0 1px 0 rgb(255 255 255 / 0.04)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        caret: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        caret: 'caret 1s steps(1) infinite',
      },
    },
  },
  plugins: [],
}
