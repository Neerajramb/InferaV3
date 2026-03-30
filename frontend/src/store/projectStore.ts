import { create } from 'zustand'

export type ProjectStatus = 'Synced' | 'Indexing' | 'Needs review'

export interface ProjectSummary {
  id: string
  name: string
  description: string
  status: ProjectStatus
  documents: number
  queries: number
  updatedAt: string
  tags: string[]
}

interface ProjectState {
  activeProjectId: string
  projects: ProjectSummary[]
  setActiveProject: (projectId: string) => void
}

const mockProjects: ProjectSummary[] = [
  {
    id: 'proj-security',
    name: 'Security Knowledge Base',
    description: 'Runbooks, internal policies, and encrypted incident retrospectives.',
    status: 'Synced',
    documents: 42,
    queries: 181,
    updatedAt: '5 min ago',
    tags: ['AES-256', 'Offline', 'Policies'],
  },
  {
    id: 'proj-onboarding',
    name: 'Customer Onboarding',
    description: 'Implementation notes, solution briefs, and launch checklists.',
    status: 'Indexing',
    documents: 18,
    queries: 64,
    updatedAt: '22 min ago',
    tags: ['Guides', 'Playbooks', 'Deployments'],
  },
  {
    id: 'proj-research',
    name: 'Applied AI Research',
    description: 'Experiment logs, benchmark snapshots, and prompt evaluations.',
    status: 'Needs review',
    documents: 27,
    queries: 109,
    updatedAt: '2 hrs ago',
    tags: ['Benchmarks', 'Prompts', 'Notes'],
  },
]

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: mockProjects[0].id,
  projects: mockProjects,
  setActiveProject: (projectId) => {
    set({ activeProjectId: projectId })
  },
}))
