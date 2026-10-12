import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { IconContext } from '@phosphor-icons/react'

import App from './App'
import { initTheme } from './store/theme'
import './index.css'

initTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (count, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        return status !== undefined && status < 500 ? false : count < 2
      },
      refetchOnWindowFocus: true,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <IconContext.Provider value={{ size: 18, weight: 'regular' }}>
          <App />
        </IconContext.Provider>
      </MotionConfig>
    </QueryClientProvider>
  </React.StrictMode>,
)
