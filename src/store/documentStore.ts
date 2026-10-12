import { create } from 'zustand'
import { Project } from '../entities/Project'
import type { DocumentRepository, ProjectMutator } from '../services/document/DocumentRepository'

const HISTORY_LIMIT = 100

interface DocumentState extends DocumentRepository {
  project: Project
  past: Project[]
  future: Project[]
}

let strokeSnapshot: Project | null = null

export const useDocumentStore = create<DocumentState>((set, get) => ({
  project: Project.create(),
  past: [],
  future: [],

  getProject: () => get().project,

  update: (mutator: ProjectMutator) => {
    const draft = get().project.clone()
    mutator(draft)
    set({ project: draft })
  },

  commit: (mutator: ProjectMutator) => {
    const previous = get().project
    const draft = previous.clone()
    mutator(draft)
    set({
      project: draft,
      past: [...get().past, previous].slice(-HISTORY_LIMIT),
      future: [],
    })
  },

  beginStroke: () => {
    strokeSnapshot = get().project
  },

  endStroke: () => {
    const snapshot = strokeSnapshot
    strokeSnapshot = null
    if (!snapshot || snapshot === get().project) return
    set({
      past: [...get().past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    })
  },

  undo: () => {
    const { past, future, project } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({
      project: previous,
      past: past.slice(0, -1),
      future: [project, ...future],
    })
  },

  redo: () => {
    const { past, future, project } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      project: next,
      past: [...past, project],
      future: future.slice(1),
    })
  },
}))
