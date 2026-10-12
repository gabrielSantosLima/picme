export function openDatabase(name: string, version: number, stores: string[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

export function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readonly')
    const request = transaction.objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error ?? new Error('Failed to read from IndexedDB'))
  })
}

export function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite')
    transaction.objectStore(store).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to write to IndexedDB'))
  })
}
