function extractMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>

  const error = record.error
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    const message = typeof err.message === 'string' ? err.message : null
    const status =
      typeof err.status === 'string'
        ? err.status
        : typeof err.code === 'string' || typeof err.code === 'number'
          ? String(err.code)
          : null
    if (message) return status ? `${message} (${status})` : message
  }

  if (typeof record.message === 'string') return record.message
  return null
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function formatHttpError(status: number, bodyText: string): string {
  const fallback = `Request failed (HTTP ${status})`
  if (!bodyText) return fallback

  try {
    const parsed = JSON.parse(bodyText) as unknown
    const message = extractMessage(parsed)
    if (message) return clean(message).slice(0, 400)
  } catch {
    // not JSON, fall through
  }

  const text = clean(bodyText)
  return text ? `${fallback}: ${text.slice(0, 300)}` : fallback
}
