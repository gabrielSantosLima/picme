import type { ProviderSettings, StoredProviderSettings } from '../../entities/provider'
import { CryptoService } from './CryptoService'
import { idbGet, idbPut, openDatabase } from './idb'

const DB_NAME = 'picme'
const DB_VERSION = 1
const STORE = 'settings'
const SETTINGS_KEY = 'provider-settings'
const CRYPTO_KEY = 'crypto-key'

export interface ProviderSettingsRepository {
  load(): Promise<ProviderSettings | null>
  save(settings: ProviderSettings): Promise<void>
}

export class IndexedDbProviderSettingsRepository implements ProviderSettingsRepository {
  private database: Promise<IDBDatabase> | null = null

  private db(): Promise<IDBDatabase> {
    if (!this.database) this.database = openDatabase(DB_NAME, DB_VERSION, [STORE])
    return this.database
  }

  private async crypto(): Promise<CryptoService> {
    const db = await this.db()
    const existing = await idbGet<CryptoKey>(db, STORE, CRYPTO_KEY)
    if (existing) return CryptoService.fromKey(existing)
    const service = await CryptoService.create()
    await idbPut(db, STORE, CRYPTO_KEY, service.getKey())
    return service
  }

  async load(): Promise<ProviderSettings | null> {
    const db = await this.db()
    const stored = await idbGet<StoredProviderSettings>(db, STORE, SETTINGS_KEY)
    if (!stored) return null
    let apiKey = ''
    if (stored.encryptedApiKey) {
      try {
        apiKey = await (await this.crypto()).decrypt(stored.encryptedApiKey)
      } catch {
        apiKey = ''
      }
    }
    return {
      providerId: stored.providerId,
      baseUrl: stored.baseUrl,
      model: stored.model,
      apiKey,
      reasoningEffort: stored.reasoningEffort ?? 'default',
      sendCanvasImage: stored.sendCanvasImage ?? true,
    }
  }

  async save(settings: ProviderSettings): Promise<void> {
    const db = await this.db()
    const cryptoService = await this.crypto()
    const encryptedApiKey = settings.apiKey ? await cryptoService.encrypt(settings.apiKey) : null
    const stored: StoredProviderSettings = {
      providerId: settings.providerId,
      baseUrl: settings.baseUrl,
      model: settings.model,
      reasoningEffort: settings.reasoningEffort,
      sendCanvasImage: settings.sendCanvasImage,
      encryptedApiKey,
    }
    await idbPut(db, STORE, SETTINGS_KEY, stored)
  }
}
