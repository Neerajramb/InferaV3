import { create } from 'zustand'

import { Button } from './Button'
import { Dialog } from './Overlay'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (value: boolean) => void
}

const useConfirmStore = create<ConfirmState>(() => ({ open: false, title: '' }))

/** Promise-based replacement for window.confirm. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ ...options, open: true, resolve }))
}

export function ConfirmHost() {
  const state = useConfirmStore()
  const close = (value: boolean) => {
    state.resolve?.(value)
    useConfirmStore.setState({ open: false, resolve: undefined })
  }
  return (
    <Dialog
      open={state.open}
      onClose={() => close(false)}
      title={state.title}
      description={state.description}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button variant={state.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
            {state.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <span className="sr-only">{state.description}</span>
    </Dialog>
  )
}
