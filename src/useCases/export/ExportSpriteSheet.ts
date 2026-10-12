import type { Downloader } from '../../services/browser/Downloader'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import type { SpriteSheetExporter, SpriteSheetOptions } from '../../services/export/SpriteSheetExporter'

export class ExportSpriteSheet {
  constructor(
    private readonly document: DocumentRepository,
    private readonly exporter: SpriteSheetExporter,
    private readonly downloader: Downloader,
  ) {}

  async execute(options: SpriteSheetOptions, filename = 'picme-spritesheet.png'): Promise<void> {
    const blob = await this.exporter.export(this.document.getProject(), options)
    this.downloader.download(blob, filename)
  }
}
