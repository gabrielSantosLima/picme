import type { Downloader } from '../../services/browser/Downloader'
import type { DocumentRepository } from '../../services/document/DocumentRepository'
import type { FrameImagesExporter } from '../../services/export/FrameImagesExporter'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class ExportFrameImages {
  constructor(
    private readonly document: DocumentRepository,
    private readonly exporter: FrameImagesExporter,
    private readonly downloader: Downloader,
  ) {}

  async execute(scale = 1): Promise<void> {
    const images = await this.exporter.export(this.document.getProject(), scale)
    for (const image of images) {
      this.downloader.download(image.blob, image.name)
      await delay(150)
    }
  }
}
