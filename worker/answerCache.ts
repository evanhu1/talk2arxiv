// Completed answers are shared by identical model requests at each Cloudflare
// location. The key contains no raw questions, paper text, or API credentials.
const CACHE_VERSION = 'v1'
const encoder = new TextEncoder()

export async function answerCacheKey(modelRequest: string): Promise<Request> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(modelRequest))
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return new Request(`https://cache.talk2arxiv.internal/answer/${CACHE_VERSION}/${hash}`)
}

export async function readAnswer(key: Request): Promise<string | null> {
  try {
    const response = await caches.default.match(key)
    return response ? await response.text() : null
  } catch {
    // A cache failure must not prevent a fresh answer.
    return null
  }
}

export async function writeAnswer(key: Request, answer: string, ttlSeconds: number) {
  try {
    await caches.default.put(key, new Response(answer, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': `public, max-age=${ttlSeconds}` },
    }))
  } catch {
    // The reader has already received the answer. Caching is best effort.
  }
}

// Replay quickly, but across animation frames so the existing streaming UI
// stays responsive. Iterate code points to avoid splitting emoji/surrogates.
export function replayAnswer(answer: string): ReadableStream<Uint8Array> {
  const characters = Array.from(answer)
  const chunkSize = Math.max(64, Math.ceil(characters.length / 120))
  let offset = 0
  let cancelled = false
  return new ReadableStream({
    async pull(controller) {
      if (offset > 0) await new Promise((resolve) => setTimeout(resolve, 12))
      if (cancelled) return
      controller.enqueue(encoder.encode(characters.slice(offset, offset + chunkSize).join('')))
      offset += chunkSize
      if (offset >= characters.length) controller.close()
    },
    cancel() { cancelled = true },
  }, { highWaterMark: 0 })
}
