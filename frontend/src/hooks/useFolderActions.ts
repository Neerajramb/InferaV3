import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { confirm } from '../components/ui/Confirm'
import { api, errorMessage } from '../lib/api'
import type { FolderNode } from '../lib/types'
import type { Space } from './queries'

/** Create, rename and delete folders in a space, keeping caches fresh. */
export function useFolderActions(space: Space, onDeleted?: (id: number) => void) {
  const queryClient = useQueryClient()
  const [renaming, setRenaming] = useState<FolderNode | null>(null)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['folders'] })
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
    void queryClient.invalidateQueries({ queryKey: ['notes'] })
  }

  const create = async (name: string, parent: number | null) => {
    try {
      await api.post('/folders/', { name, parent, project: typeof space === 'number' ? space : null })
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
      throw error
    }
  }

  const rename = async (folder: FolderNode, name: string) => {
    try {
      await api.patch(`/folders/${folder.id}/`, { name })
      refresh()
      setRenaming(null)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const remove = async (folder: FolderNode) => {
    const ok = await confirm({
      title: `Delete "${folder.name}"?`,
      description: 'Subfolders are deleted too. Files and notes inside move to the top level of this space.',
      confirmLabel: 'Delete folder',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/folders/${folder.id}/`)
      onDeleted?.(folder.id)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return { create, rename, remove, renaming, setRenaming }
}
