function parseEvent(raw: string): string | null {
  const dataLines: string[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('data:')) dataLines.push(trimmed.slice(5).trimStart())
  }
  if (dataLines.length === 0) return null
  return dataLines.join('\n')
}

export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const data = parseEvent(rawEvent)
        if (data !== null) yield data
        boundary = buffer.indexOf('\n\n')
      }
    }
    const data = parseEvent(buffer)
    if (data !== null) yield data
  } finally {
    reader.releaseLock()
  }
}
