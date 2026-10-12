import { useState } from 'react'
import { browserDownloader } from '../services/browser/Downloader'
import { FrameImagesExporter } from '../services/export/FrameImagesExporter'
import { GifExporter } from '../services/export/GifExporter'
import {
  SpriteSheetExporter,
  type SpriteSheetOptions,
} from '../services/export/SpriteSheetExporter'
import { useDocumentStore } from '../store/documentStore'
import { ExportFrameImages } from '../useCases/export/ExportFrameImages'
import { ExportGif } from '../useCases/export/ExportGif'
import { ExportSpriteSheet } from '../useCases/export/ExportSpriteSheet'

export function useExport() {
  const [exporting, setExporting] = useState(false)
  const doc = () => useDocumentStore.getState()

  const run = async (task: () => void | Promise<void>) => {
    setExporting(true)
    try {
      await task()
    } finally {
      setExporting(false)
    }
  }

  return {
    exporting,
    exportGif: (scale: number) =>
      run(() => new ExportGif(doc(), new GifExporter(), browserDownloader).execute(scale)),
    exportSpriteSheet: (options: SpriteSheetOptions) =>
      run(() =>
        new ExportSpriteSheet(doc(), new SpriteSheetExporter(), browserDownloader).execute(options),
      ),
    exportFrameImages: (scale: number) =>
      run(() =>
        new ExportFrameImages(doc(), new FrameImagesExporter(), browserDownloader).execute(scale),
      ),
  }
}
