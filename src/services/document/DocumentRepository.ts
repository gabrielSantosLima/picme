import type { Project } from '../../entities/Project'

export type ProjectMutator = (project: Project) => void

export interface DocumentRepository {
  getProject(): Project
  update(mutator: ProjectMutator): void
  commit(mutator: ProjectMutator): void
  beginStroke(): void
  endStroke(): void
  undo(): void
  redo(): void
}
