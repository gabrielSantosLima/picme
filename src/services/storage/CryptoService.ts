import type { EncryptedValue } from '../../entities/provider'

export class CryptoService {
  constructor(private readonly key: CryptoKey) {}

  static async create(): Promise<CryptoService> {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
    return new CryptoService(key)
  }

  static fromKey(key: CryptoKey): CryptoService {
    return new CryptoService(key)
  }

  getKey(): CryptoKey {
    return this.key
  }

  async encrypt(plainText: string): Promise<EncryptedValue> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const data = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.key,
        new TextEncoder().encode(plainText),
      ),
    )
    return { iv, data }
  }

  async decrypt(value: EncryptedValue): Promise<string> {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: value.iv },
      this.key,
      value.data,
    )
    return new TextDecoder().decode(plain)
  }
}
