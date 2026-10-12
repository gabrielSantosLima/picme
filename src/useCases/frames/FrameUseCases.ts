import { Frame } from '../../entities/Frame'
import type { DocumentRepository } from '../../services/document/DocumentRepository'

export class AddFrame {
  constructor(private readonly document: DocumentRepository) {}

  execute(): void {
    this.document.commit((project) => {
      const index = project.activeFrameIndex + 1
      project.frames.splice(index, 0, Frame.create(project.width, project.height))
      project.activeFrameIndex = index
    })
  }
}

export class DuplicateFrame {
  constructor(private readonly document: DocumentRepository) {}

  execute(): void {
    this.document.commit((project) => {
      const index = project.activeFrameIndex + 1
      project.frames.splice(index, 0, project.activeFrame.clone())
      project.activeFrameIndex = index
    })
  }
}

export class DeleteFrame {
  constructor(private readonly document: DocumentRepository) {}

  execute(): void {
    this.document.commit((project) => {
      if (project.frames.length <= 1) return
      project.frames.splice(project.activeFrameIndex, 1)
      if (project.activeFrameIndex >= project.frames.length) {
        project.activeFrameIndex = project.frames.length - 1
      }
    })
  }
}

export class SetFrameDuration {
  constructor(private readonly document: DocumentRepository) {}

  execute(index: number, durationMs: number): void {
    this.document.commit((project) => {
      const frame = project.frames[index]
      if (frame) frame.durationMs = Math.max(20, durationMs)
    })
  }
}

export class SetActiveFrame {
  constructor(private readonly document: DocumentRepository) {}

  execute(index: number): void {
    this.document.update((project) => {
      if (index >= 0 && index < project.frames.length) project.activeFrameIndex = index
    })
  }
}
