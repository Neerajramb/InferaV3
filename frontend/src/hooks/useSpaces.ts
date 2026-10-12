import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { Project } from '../lib/types'
import { useProjects, type Space } from './queries'

/** Space selection synced to the ?space= URL param so links can deep-link into a project. */
export function useSpaceParam(fallback: Space = 'personal') {
  const [params, setParams] = useSearchParams()
  const raw = params.get('space')
  const space: Space = raw === 'personal' || raw === 'all' ? raw : raw && /^\d+$/.test(raw) ? Number(raw) : fallback

  const setSpace = (next: Space) => {
    const copy = new URLSearchParams(params)
    copy.set('space', String(next))
    copy.delete('folder')
    setParams(copy, { replace: true })
  }
  return [space, setSpace] as const
}

export function useSpaceInfo(space: Space) {
  const { data: projects = [] } = useProjects()
  return useMemo(() => {
    const project: Project | undefined = typeof space === 'number' ? projects.find((p) => p.id === space) : undefined
    const name = space === 'personal' ? 'Personal' : space === 'all' ? 'Everything' : (project?.name ?? 'Project')
    const canContribute = space === 'personal' || !!project?.can_contribute
    return { project, projects, name, canContribute }
  }, [projects, space])
}
