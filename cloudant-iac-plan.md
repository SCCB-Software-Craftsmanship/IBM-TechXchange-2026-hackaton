# Cloudant IaC Plan — VibeBobbing

## Overview

Provision an IBM Cloud Cloudant instance for the VibeBobbing project using Terraform / OpenTofu.
The infrastructure lives under a new `iac/` top-level directory.
State is stored locally (gitignored).
All sensitive outputs (API key) are written as Terraform outputs and consumed by GitHub Actions via the IBM Cloud provider's env-var authentication pattern.

**Scope:**
- IBM Cloud region: `us-south` (Dallas)
- Cloudant plan: Standard, IAM-only authentication
- Terraform tool: **OpenTofu** (explicit choice — `tofu` CLI used everywhere; no Terraform CLI required)
- State: local (`.terraform/` and `terraform.tfstate` gitignored inside `iac/`)

**Out of scope:**
- Creating Cloudant databases at the infra layer (done by the app at runtime)
- Remote state backend

---

## Feasibility

The IBM Cloud Terraform provider (`IBM-Cloud/ibm`, published at registry.terraform.io) is fully compatible with OpenTofu 1.6+. OpenTofu mirrors the Terraform Registry, so the same provider block works unchanged. The IBM Cloud provider is driven by a single environment variable (`IC_API_KEY`) — no secrets need to live in `.tf` files, which makes GitHub Actions integration straightforward.

**All commands throughout this plan use `tofu` (OpenTofu CLI), not `terraform`.**

---

## Sub-Tasks

---

### Sub-Task 1 — Scaffold the `iac/` directory and provider configuration

**Status:** [ ] pending

**Intent**
Create the directory skeleton, provider version pin, and local backend declaration so that `tofu init` succeeds.

**Expected Outcomes**
- `iac/` directory exists with `provider.tf`, `versions.tf`, and `.gitignore`
- Running `tofu init` (OpenTofu) inside `iac/` downloads the IBM Cloud provider without errors
- No secrets committed to git

**Todo List**
1. Create `iac/` directory
2. Create `iac/versions.tf` — pin OpenTofu `required_version` (>= 1.6) and declare the `ibm` provider source (`IBM-Cloud/ibm`) with **no upper-bound version constraint** (leave loose per project decision)
3. Create `iac/provider.tf` — configure the `ibm` provider block with `region = "us-south"`; authentication reads from `IC_API_KEY` env var (no hardcoded credentials)
4. Create `iac/.gitignore` — ignore `.terraform/`, `*.tfstate`, `*.tfstate.backup`, `*.tfvars` (secrets guard)
5. Verify `tofu init` exits 0

**Relevant Context**
- IBM Cloud provider docs: `terraform-provider-ibm` on GitHub / Terraform Registry (`IBM-Cloud/ibm`)
- Provider auth env var: `IC_API_KEY` (IBM Cloud personal API key)

---

### Sub-Task 2 — Resource Group

**Status:** [ ] pending

**Intent**
Create the IBM Cloud Resource Group that will contain all VibeBobbing resources. Keeping it isolated prevents accidental cost leakage into the default group.

**Expected Outcomes**
- `ibm_resource_group.vibebobbing` is declared in `iac/resource_group.tf`
- `tofu plan` shows the resource group will be created
- Resource group name is parameterised via a variable (default: `vibebobbing`)

**Todo List**
1. Create `iac/variables.tf` — add `var.resource_group_name` (string, default `"vibebobbing"`) and `var.region` (string, default `"us-south"`)
2. Create `iac/resource_group.tf` — declare `ibm_resource_group` resource referencing `var.resource_group_name`

**Relevant Context**
- Terraform resource: `ibm_resource_group`
- Required field: `name`

---

### Sub-Task 3 — Cloudant Service Instance

**Status:** [ ] pending

**Intent**
Provision the Cloudant NoSQL DB service instance under the resource group with the Standard plan and IAM-only authentication.

**Expected Outcomes**
- `ibm_resource_instance.cloudant` is declared in `iac/cloudant.tf`
- Instance uses `service = "cloudantnosqldb"`, `plan = "standard"`, `location = var.region`
- IAM-only auth enforced via `parameters = { legacyCredentials = false }`
- `tofu plan` shows the Cloudant instance will be created in the correct resource group

**Todo List**
1. Create `iac/cloudant.tf` — declare `ibm_resource_instance` resource:
   - `service    = "cloudantnosqldb"`
   - `plan       = "standard"`
   - `location   = var.region`
   - `resource_group_id = ibm_resource_group.vibebobbing.id`
   - `parameters = { legacyCredentials = false }`

**Relevant Context**
- Terraform resource: `ibm_resource_instance`
- `legacyCredentials = false` disables username/password auth, leaving only IAM

---

### Sub-Task 4 — IAM Service ID and API Key for GitHub Actions

**Status:** [ ] pending

**Intent**
Create a dedicated IAM Service ID (non-human identity) scoped to the Cloudant instance, generate an API key for it, and bind an IAM policy granting the `Manager` role. The API key will be stored as a GitHub Actions secret.

**Expected Outcomes**
- `ibm_iam_service_id.github_actions` declared in `iac/iam.tf`
- `ibm_iam_service_policy` granting `Manager` role on the Cloudant instance declared in the same file
- `ibm_iam_service_api_key.github_actions` declared (marked `sensitive = true`)
- `tofu plan` shows all three IAM resources

**Todo List**
1. Create `iac/iam.tf`:
   - `ibm_iam_service_id` — name `"vibebobbing-github-actions"`
   - `ibm_iam_service_policy` — subject = service ID above; resource = Cloudant instance; roles = `["Manager"]`
   - `ibm_iam_service_api_key` — linked to the service ID; description = `"VibeBobbing GitHub Actions"`
2. Ensure the API key resource output is marked sensitive so it is never logged

**Relevant Context**
- Terraform resources: `ibm_iam_service_id`, `ibm_iam_service_policy`, `ibm_iam_service_api_key`
- IAM policy roles for Cloudant: `Reader`, `Writer`, `Manager` — using `Manager` (full control, needed since app creates databases at runtime)

---

### Sub-Task 5 — Outputs

**Status:** [ ] pending

**Intent**
Expose the values that GitHub Actions needs: the Cloudant service URL and the IAM API key. These outputs are consumed by a GitHub Actions workflow step that sets repository secrets or environment variables.

**Expected Outcomes**
- `iac/outputs.tf` declares `cloudant_url` and `github_actions_api_key` (sensitive)
- `tofu output -json` after apply produces both values

**Todo List**
1. Create `iac/outputs.tf`:
   - `cloudant_url` — value from `ibm_resource_instance.cloudant.extensions["Credentials:url"]` (or `credentials.url` depending on provider version); non-sensitive
   - `github_actions_api_key` — value from `ibm_iam_service_api_key.github_actions.apikey`; `sensitive = true`

**Relevant Context**
- The IBM Cloud provider exposes Cloudant credentials under `ibm_resource_instance` via the `extensions` or `credentials` attribute — the exact attribute path should be verified against the provider version in use at apply time
- Sensitive outputs are redacted from `tofu plan` / `tofu apply` logs; read with `tofu output -raw github_actions_api_key`

---

### Sub-Task 6 — README and GitHub Actions usage guide

**Status:** [ ] pending

**Intent**
Document how to bootstrap the infrastructure (first-time `tofu apply`) and how to wire the outputs into GitHub Actions secrets so CI jobs can reach Cloudant.

**Expected Outcomes**
- `iac/README.md` covers: prerequisites, first-time init/plan/apply steps, how to read outputs, and how to set GitHub Actions secrets

**Todo List**
1. Create `iac/README.md` with sections:
   - Prerequisites (**OpenTofu >= 1.6** — install via `brew install opentofu` or official binary; IBM Cloud account API key; ibmcloud CLI optional)
   - Environment variable setup (`export IC_API_KEY=...`)
   - First-time run commands: `tofu init`, `tofu plan`, `tofu apply`
   - Reading outputs: `tofu output cloudant_url`, `tofu output -raw github_actions_api_key`
   - GitHub Actions: set `CLOUDANT_URL` and `CLOUDANT_API_KEY` as repository secrets via `gh secret set`

---

## File Layout After All Sub-Tasks

```
iac/
├── .gitignore
├── README.md
├── versions.tf
├── provider.tf
├── variables.tf
├── resource_group.tf
├── cloudant.tf
├── iam.tf
└── outputs.tf
```
