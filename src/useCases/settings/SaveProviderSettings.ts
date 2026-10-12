import type { ProviderSettings } from '../../entities/provider'
import type { ProviderSettingsRepository } from '../../services/storage/ProviderSettingsRepository'

export class SaveProviderSettings {
  constructor(private readonly repository: ProviderSettingsRepository) {}

  execute(settings: ProviderSettings): Promise<void> {
    return this.repository.save(settings)
  }
}
