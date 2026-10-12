import type { ProviderSettings } from '../../entities/provider'
import type { ProviderSettingsRepository } from '../../services/storage/ProviderSettingsRepository'

export class LoadProviderSettings {
  constructor(private readonly repository: ProviderSettingsRepository) {}

  execute(): Promise<ProviderSettings | null> {
    return this.repository.load()
  }
}
