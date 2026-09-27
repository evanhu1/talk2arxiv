// fetch() that waits and retries when the server rate-limits (429). bioRxiv
// limits bursts of requests, even from Cloudflare, and usually clears within
// seconds.
const RETRY_DELAYS_MS = [2000, 5000]
const MAX_RETRY_AFTER_MS = 8000

export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, init)
    if (response.status !== 429 || attempt >= RETRY_DELAYS_MS.length) return response
    const retryAfter = Number(response.headers.get('Retry-After')) * 1000
    const delay = retryAfter > 0 ? Math.min(retryAfter, MAX_RETRY_AFTER_MS) : RETRY_DELAYS_MS[attempt]
    await response.body?.cancel()
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}
