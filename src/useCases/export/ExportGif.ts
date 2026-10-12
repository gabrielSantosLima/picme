import type { Downloader } from '../../services/browser/Downloader'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import type { GifExporter } from '../../services/export/GifExporter'

export class ExportGif {
  constructor(
    private readonly document: DocumentRepository,
    private readonly exporter: GifExporter,
    private readonly downloader: Downloader,
  ) {}

  execute(scale = 1, filename = 'picme.gif'): void {
    const blob = this.exporter.export(this.document.getProject(), scale)
    this.downloader.download(blob, filename)
  }
}
