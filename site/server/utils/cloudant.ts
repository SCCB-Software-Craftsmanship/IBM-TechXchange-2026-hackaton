/**
 * Minimal Cloudant reader.
 *
 * Deliberately dependency-free: it exchanges the IAM API key for a bearer
 * token and queries `_find`, which is all this presentation needs. The agents
 * write through `scripts/cloudant/` and the GitHub Actions workflows — this
 * side is read-only.
 */

interface TokenCache {
  token: string
  expiresAt: number
}

let cache: TokenCache | null = null

const IAM_ENDPOINT = 'https://iam.cloud.ibm.com/identity/token'

async function getToken(apiKey: string): Promise<string> {
  // Reuse the token until a minute before it lapses.
  if (cache && Date.now() < cache.expiresAt) return cache.token

  const body = new URLSearchParams({
    grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
    apikey: apiKey,
  })

  const res = await $fetch<{ access_token: string; expires_in: number }>(IAM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  cache = {
    token: res.access_token,
    expiresAt: Date.now() + (res.expires_in - 60) * 1000,
  }
  return cache.token
}

/**
 * Fetch every TestabilityRun document from the given database.
 * Throws on any failure — the caller decides whether to fall back to the seed.
 */
export async function fetchRuns(url: string, apiKey: string, db: string): Promise<any[]> {
  const token = await getToken(apiKey)
  const base = url.replace(/\/+$/, '')

  const res = await $fetch<{ docs: any[] }>(`${base}/${encodeURIComponent(db)}/_find`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: {
      selector: { type: 'testability-run' },
      limit: 200,
    },
  })

  return res.docs ?? []
}
