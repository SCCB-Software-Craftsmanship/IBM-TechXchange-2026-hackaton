export interface SetupStep {
  id: string;
  title: string;
  body: string;
  /** A shell command, shown as a terminal block. */
  code?: string;
  /** Natural language to paste into Bob — not something you run in a shell. */
  prompt?: string;
  note?: string;
}

export interface SetupTrack {
  id: string;
  label: string;
  blurb: string;
  steps: SetupStep[];
}

export const prerequisites = [
  {
    name: "Node.js",
    version: ">= 22",
    why: "Cloudant CLI scripts and this site",
  },
  {
    name: "gh CLI",
    version: "authenticated",
    why: "Every workflow is workflow_dispatch only",
  },
  { name: "Bob", version: "any", why: "Runs the skills and orchestrators" },
  {
    name: "OpenTofu",
    version: ">= 1.6",
    why: "Only if you provision your own Cloudant",
  },
];

export const setupTracks: SetupTrack[] = [
  {
    id: "pipeline",
    label: "Run the pipeline",
    blurb:
      "From a fresh clone to a repository that can prepare and test its own pull requests. Every step is idempotent — running it twice changes nothing.",
    steps: [
      {
        id: "clone",
        title: "Clone and install",
        body: "Install the Node dependencies used by the Cloudant scripts, then confirm the test suite runs.",
        code: `git clone https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton.git
cd IBM-TechXchange-2026-hackaton
npm ci
npm test`,
      },
      {
        id: "auth",
        title: "Authenticate the gh CLI",
        body: "The tracker and query workflows are workflow_dispatch only, so triggering them needs write access on the repository.",
        code: `gh auth login
gh auth status
gh extension install github/gh-actions`,
        note: "main.orchestrate.md blocks on this check before it does anything else. Being authenticated is not the same as having write access — gh auth status can pass while workflow_dispatch still fails with a permission error. If that happens, ask an org owner to add you as a collaborator (or to whichever GitHub Team manages repo access) on SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton.",
      },
      {
        id: "skills",
        title: "Install the Bob skills",
        body: "Copies every skill from SKILLS/ into ~/.bob/skills so Bob can invoke them by name. Re-running updates in place instead of duplicating.",
        code: `bash scripts/install-skills.sh`,
      },
      {
        id: "onboard",
        title: "Run onboarding once",
        body: "Open the main orchestrator as a Bob task. It generates the six knowledge files, then dispatches scan-test-suites and testability-heuristics in parallel.",
        prompt: `Open orchestrate/main.orchestrate.md as a task and run it on [Target repo path]`,
        note: "Produces .bob/ — PROJECT, ARCHITECTURE, TESTING, DEPENDENCIES, CONVENTIONS, GLOSSARY, TEST-SUITES and HEURISTICS. inside the .bob folder generated inside the target repository",
      },
      {
        id: "prep",
        title: "Prepare an approved PR",
        body: "Once a PR is approved, run testability-prep against it. It opens a child PR against the feature branch — with seams if it found barriers, report-only if it did not — and records the run in Cloudant.",
        prompt: `Run testability-prep on PR [PR-URL]`,
      },
      {
        id: "generate",
        title: "Generate the tests",
        body: "The generation orchestrator claims the oldest unimplemented run, reads both diffs, and opens one PR per pyramid layer against the feature branch.",
        prompt: `Open orchestrate/generate-tests.orchestrate.md as a task`,
        note: "Advances the run tests_not_yet_implemented → tests_in_progress → tests_implemented.",
      },
      {
        id: "verify",
        title: "Verify and close the run",
        body: "When CI is green on the layer PRs and the coverage gate is satisfied, move the run to its final state.",
        code: `node scripts/cloudant/save.js transition \
  --id "<run-uuid>" \
  --state tests_verified`,
      },
    ],
  },
  {
    id: "cloud",
    label: "Provision Cloudant",
    blurb:
      "Only needed if you are standing up your own IBM Cloud instance. The team instance is already provisioned and imported into state.",
    steps: [
      {
        id: "ic-auth",
        title: "Export an IBM Cloud API key",
        body: "The IBM Cloud provider reads IC_API_KEY from the environment — no credentials belong in any .tf file.",
        code: `export IC_API_KEY=<your-ibm-cloud-api-key>`,
      },
      {
        id: "tofu",
        title: "Initialise and apply with OpenTofu",
        body: "Use tofu, not terraform — these files target OpenTofu only. The existing instance is imported so apply only creates the IAM resources.",
        code: `cd iac/
tofu init
tofu plan
tofu apply`,
      },
      {
        id: "secrets",
        title: "Wire the outputs into repository secrets",
        body: "The workflows read these two secrets. Nothing else is needed for the GitHub Actions path to work.",
        code: `gh secret set CLOUDANT_URL     --body "$(tofu output -raw cloudant_url)"
gh secret set CLOUDANT_API_KEY --body "$(tofu output -raw github_actions_api_key)"`,
      },
      {
        id: "bootstrap",
        title: "Bootstrap the database and indexes",
        body: "Creates the testability-runs database and its indexes. Idempotent — safe to run against an existing database.",
        code: `cp .env.example .env   # fill in CLOUDANT_URL and CLOUDANT_API_KEY
node scripts/cloudant/bootstrap.js`,
      },
    ],
  },
  {
    id: "site",
    label: "Run this site",
    blurb:
      "This presentation is a Nuxt application in site/. It reads the same TestabilityRun documents the agents write.",
    steps: [
      {
        id: "site-install",
        title: "Install and start",
        body: "Nuxt 4 with Tailwind 4 and Mermaid. The dev server runs on port 3000.",
        code: `cd site
npm install
npm run dev`,
      },
      {
        id: "site-live",
        title: "Point it at live Cloudant data",
        body: "With both variables set, /api/runs queries the testability-runs database directly. Without them it serves the bundled sample so the presentation always renders.",
        code: `export CLOUDANT_URL=https://<instance>.cloudantnosqldb.appdomain.cloud
export CLOUDANT_API_KEY=<iam-api-key>
npm run dev`,
        note: "The badge in the Pipeline section tells you which source is live.",
      },
      {
        id: "site-build",
        title: "Build for production",
        body: "Outputs a Nitro server bundle in .output — deployable to Code Engine or any Node host.",
        code: `npm run build
node .output/server/index.mjs`,
      },
    ],
  },
];
