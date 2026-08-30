# VibeBobbing — Cloudant Infrastructure as Code

OpenTofu configuration that manages the IBM Cloud Cloudant instance and IAM resources for VibeBobbing.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| **OpenTofu** | >= 1.6 | `brew install opentofu` or [opentofu.org](https://opentofu.org/docs/intro/install/) |
| **IBM Cloud account API key** | — | IBM Cloud → Manage → Access (IAM) → API keys |
| `ibmcloud` CLI | optional | `curl -fsSL https://clis.cloud.ibm.com/install/linux | sh` |

> **Note:** Use `tofu` everywhere — not `terraform`. These files target OpenTofu only.

## Environment setup

```sh
export IC_API_KEY=<your-ibm-cloud-api-key>
```

No other credentials are needed in `.tf` files. The IBM Cloud provider reads `IC_API_KEY` automatically.

## First-time bootstrap

```sh
cd iac/

# 1. Download the IBM Cloud provider
tofu init

# 2. Import the existing Cloudant instance (one-time — already provisioned)
tofu import ibm_resource_instance.cloudant \
  crn:v1:bluemix:public:cloudantnosqldb:us-south:a/beef8ba3575242f39db50a9a0e242fe8:94c67872-c7c2-45bd-b9fe-61337b69f4b3::

# 3. Preview changes (should show only IAM resources to create)
tofu plan

# 4. Apply
tofu apply
```

## Day-to-day operations

```sh
# Preview changes without applying
tofu plan

# Apply changes
tofu apply

# Destroy all managed resources (caution: deletes the Cloudant instance!)
tofu destroy
```

## Reading outputs

```sh
# Cloudant external endpoint
tofu output cloudant_url

# GitHub Actions API key (sensitive — printed in plain text only with -raw)
tofu output -raw github_actions_api_key
```

## Wiring outputs into GitHub Actions secrets

After `tofu apply`, copy the outputs into repository secrets:

```sh
gh secret set CLOUDANT_URL      --body "$(tofu output -raw cloudant_url)"
gh secret set CLOUDANT_API_KEY  --body "$(tofu output -raw github_actions_api_key)"
```

In your workflow, reference them as:

```yaml
env:
  CLOUDANT_URL:     ${{ secrets.CLOUDANT_URL }}
  CLOUDANT_API_KEY: ${{ secrets.CLOUDANT_API_KEY }}
```

## File layout

```
iac/
├── .gitignore         # Ignores .terraform/, *.tfstate — NOT *.tfvars
├── README.md          # This file
├── versions.tf        # OpenTofu >= 1.6 + IBM Cloud provider (loose version)
├── provider.tf        # ibm provider, us-south, IC_API_KEY env-var auth
├── variables.tf       # resource_group_name = "Default", region = "us-south"
├── resource_group.tf  # data source: Default resource group
├── cloudant.tf        # ibm_resource_instance — Lite plan, IAM-only (imported)
├── iam.tf             # Service ID + Manager policy + API key for GitHub Actions
└── outputs.tf         # cloudant_url (plain) + github_actions_api_key (sensitive)
```

## Design decisions

| Decision | Value |
|---|---|
| IaC tool | **OpenTofu** (`tofu` CLI — no Terraform required) |
| Region | `us-south` (Dallas) |
| Cloudant plan | Lite (existing instance — imported, not re-created) |
| Auth | IAM-only (`legacyCredentials = false`) |
| IAM role | `Manager` (app creates databases at runtime) |
| Provider version | Loose constraint (no upper bound — acceptable for hackathon) |
| State | Local, gitignored |
| Resource group | `Default` (existing IBM Cloud group) |
