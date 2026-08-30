# Seamwork — presentation site

Interactive presentation for the VibeBobbing testability pipeline. Nuxt 4 + Tailwind 4 + Mermaid.

```bash
cd site
npm install --legacy-peer-deps
npm run dev
```

Opens on <http://localhost:3000>.

## Sections

| Anchor          | What it shows                                                              |
| --------------- | -------------------------------------------------------------------------- |
| `#home`         | Name, catchphrase, description, live run passport, headline numbers          |
| `#how-it-works` | Mermaid workflow + run state machine, and every skill/orchestrator/workflow |
| `#pipeline`     | Board of tracked runs — where each PR sits in the four-state flow           |
| `#metrics`      | Before/after testability and test metrics, per run or aggregated            |
| `#setup`        | Three setup tracks: run the pipeline, provision Cloudant, run this site     |
| `#github`       | Repository, organisation, and the five people who built it                  |

## Data source

`/api/runs` serves `TestabilityRun` documents.

- **Default** — the bundled sample in `server/data/runs.seed.json`, shaped exactly like the
  Cloudant schema in `scripts/cloudant/testabilityRun.js`.
- **Live** — set both variables below and the endpoint reads the `testability-runs`
  database directly (IAM token exchange, then `_find`). If the read fails or the database is
  empty it falls back to the sample and says so in the Pipeline section badge.

```bash
export CLOUDANT_URL=https://<instance>.cloudantnosqldb.appdomain.cloud
export CLOUDANT_API_KEY=<iam-api-key>
export CLOUDANT_DB=testability-runs   # optional, this is the default
```

The site is read-only. Runs are written by `testability-prep`, the
`testability-run-tracker` / `testability-run-query` workflows, and `scripts/cloudant/save.js`.

## Metrics shape

Metrics live under `meta.metrics` on each document, as `before` and `after` snapshots:

```jsonc
"meta": {
  "metrics": {
    "before": {
      "coverage": 0,            // line coverage % on the changed files
      "testable_units": 6,      // behaviour units a test could reach
      "open_barriers": 2,       // barriers still standing, per HEURISTICS.md
      "seams": 0,               // injectable seams available
      "assertions": 0,
      "suite_runtime_s": 0,
      "tests": { "unit": 0, "integration": 0, "e2e": 0 }
    },
    "after": { /* same keys, measured after the seam PR and the layer PRs */ }
  }
}
```

Documents without a `meta.metrics` block render as zeroes rather than breaking — the
normaliser in `server/api/runs.get.ts` fills every field.

## Build

```bash
npm run build
node .output/server/index.mjs
```

## Notes

- `npm install` needs `--legacy-peer-deps` on npm 10.9.x, which hits an arborist bug
  (`Cannot read properties of null (reading 'edgesOut')`) resolving Nuxt's peer graph.
- The Mermaid diagrams re-render on theme change; sources live in `app/data/diagrams.ts`.
