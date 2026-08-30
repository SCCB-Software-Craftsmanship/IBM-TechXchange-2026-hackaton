/**
 * Real commit history for a single GitHub PR — public REST API, read-only.
 * Used to show what actually led into a TestabilityRun's PR, beyond what
 * Cloudant itself records.
 */

interface GithubCommit {
  sha: string
  commit: { message: string; author: { name: string; date: string } }
  html_url: string
}

function parsePrUrl(url: string): { owner: string; repo: string; number: string } | null {
  const match = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(url || '')
  if (!match) return null
  return { owner: match[1]!, repo: match[2]!, number: match[3]! }
}

export default defineCachedEventHandler(
  async (event) => {
    const { url } = getQuery(event)
    const parsed = typeof url === 'string' ? parsePrUrl(url) : null

    if (!parsed) {
      return { commits: [], error: 'No valid GitHub PR URL given.' }
    }

    try {
      const commits = await $fetch<GithubCommit[]>(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}/commits`,
        { headers: { Accept: 'application/vnd.github+json' } },
      )

      return {
        commits: commits.map((c) => {
          const [headline, ...rest] = c.commit.message.split('\n\n')
          return {
            sha: c.sha.slice(0, 7),
            headline,
            body: rest.join('\n\n').trim() || null,
            author: c.commit.author.name,
            date: c.commit.author.date,
            url: c.html_url,
          }
        }),
        error: null,
      }
    } catch (e: any) {
      return { commits: [], error: `GitHub read failed (${e?.status ?? e?.message ?? 'unknown error'}).` }
    }
  },
  { maxAge: 300, getKey: (event) => String(getQuery(event).url ?? '') },
)
