import type { RGBA } from '../../entities/color'
import type { DocumentRepository } from '../../services/document/DocumentRepository'

export class FillArea {
  constructor(
    private readonly document: DocumentRepository,
    private readonly color: RGBA,
  ) {}

  execute(x: number, y: number): void {
    this.document.commit((project) => {
      const grid = project.activeFrame.activeLayer?.grid
      if (!grid) return
      if (!grid.inBounds(x, y)) return
      const target = grid.get(x, y)
      if (target === this.color) return

      const stack: number[] = [grid.index(x, y)]
      const visited = new Uint8Array(grid.data.length)
      while (stack.length > 0) {
        const index = stack.pop() as number
        if (visited[index]) continue
        visited[index] = 1
        if (grid.data[index] !== target) continue
        grid.data[index] = this.color
        const cx = index % grid.width
        if (cx > 0) stack.push(index - 1)
        if (cx < grid.width - 1) stack.push(index + 1)
        if (index - grid.width >= 0) stack.push(index - grid.width)
        if (index + grid.width < grid.data.length) stack.push(index + grid.width)
      }
    })
  }
}
