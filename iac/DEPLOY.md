# Build & Deploy the Infrastructure to IBM Cloud (CLI, OpenTofu)

A linear runbook for provisioning VibeBobbing's IBM Cloud infrastructure — the
Cloudant instance and the IAM service key the GitHub Actions workflows use —
entirely from the command line with [OpenTofu](https://opentofu.org).

This is the *how-to-run-it* guide. For what each file does and the design
rationale, see [`README.md`](README.md) in this folder.

> Use `tofu`, never `terraform`. These files target OpenTofu only.

---

## 0. What you'll end up with

| Resource | Managed by |
| --- | --- |
| Cloudant instance (Lite, `us-south`) | `cloudant.tf` — **imported**, not re-created |
| IAM Service ID `vibebobbing-github-actions` | `iam.tf` |
| IAM policy: `Manager` on Cloudant | `iam.tf` |
| IAM API key for the Service ID | `iam.tf` |
| Outputs: `cloudant_url`, `github_actions_api_key` | `outputs.tf` |

The two outputs become the `CLOUDANT_URL` and `CLOUDANT_API_KEY` repository
secrets that CI reads — the last step wires them up.

---

## 1. Install the tools

| Tool | Required | Install |
| --- | --- | --- |
| **OpenTofu** ≥ 1.6 | yes | `brew install opentofu` · [other platforms](https://opentofu.org/docs/intro/install/) |
| **IBM Cloud CLI** | recommended | `curl -fsSL https://clis.cloud.ibm.com/install/linux \| sh` ([macOS/Windows](https://cloud.ibm.com/docs/cli?topic=cli-install-ibmcloud-cli)) |
| **GitHub CLI** (`gh`) | for the last step | `brew install gh` |

Verify:

```sh
tofu version        # >= 1.6
ibmcloud version    # optional but used below for login/verification
```

---

## 2. Get an IBM Cloud API key

The IBM Cloud provider authenticates with a personal (or service) API key.
Create one either way:

**Console:** IBM Cloud → **Manage → Access (IAM) → API keys → Create** → copy
the value (shown once).

**CLI:**

```sh
ibmcloud login --sso                          # or: ibmcloud login -u <email>
ibmcloud iam api-key-create vibebobbing-deploy \
  -d "OpenTofu deploy key" --file deploy-key.json
# the key value is the "apikey" field in deploy-key.json — do not commit it
```

> This key deploys the infrastructure. It's separate from the
> `github_actions_api_key` that OpenTofu *creates* for CI in step 6.

---

## 3. Authenticate the CLI session

The provider reads `IC_API_KEY` from the environment — no credentials go in any
`.tf` file.

```sh
export IC_API_KEY=<your-ibm-cloud-api-key>
```

Optional sanity check that the key and target account are what you expect:

```sh
ibmcloud login --apikey "$IC_API_KEY" -r us-south
ibmcloud resource groups          # confirm the "Default" group exists
```

---

## 4. Build — initialize the working directory

From this folder, download the IBM Cloud provider defined in `versions.tf`:

```sh
cd iac/
tofu init
```

This creates `.terraform/` and the provider lock file (both gitignored). Re-run
`tofu init` whenever provider requirements change.

---

## 5. Deploy

### First time only — import the existing Cloudant instance

The Cloudant instance already exists and is **imported** into state rather than
re-created, so OpenTofu manages it without provisioning a duplicate. Run this
once (skip it if `tofu state list` already shows
`ibm_resource_instance.cloudant`):

```sh
tofu import ibm_resource_instance.cloudant \
  crn:v1:bluemix:public:cloudantnosqldb:us-south:a/beef8ba3575242f39db50a9a0e242fe8:94c67872-c7c2-45bd-b9fe-61337b69f4b3::
```

### Preview, then apply

```sh
tofu plan     # review: after import, only the IAM resources should be created
tofu apply    # type "yes" to confirm
```

`tofu apply` is idempotent — running it again with no config changes reports
"No changes." State is stored **locally** (`terraform.tfstate`, gitignored), so
deploy from a consistent machine or migrate to a remote backend before sharing.

---

## 6. Wire the outputs into GitHub Actions

After a successful apply, publish the two outputs as repository secrets. CI reads
them; they never live on a developer machine.

```sh
gh secret set CLOUDANT_URL     --body "$(tofu output -raw cloudant_url)"
gh secret set CLOUDANT_API_KEY --body "$(tofu output -raw github_actions_api_key)"
```

`github_actions_api_key` is a sensitive output — `-raw` is what prints its value.
Reference the secrets in a workflow as:

```yaml
env:
  CLOUDANT_URL:     ${{ secrets.CLOUDANT_URL }}
  CLOUDANT_API_KEY: ${{ secrets.CLOUDANT_API_KEY }}
```

---

## 7. Day-to-day

```sh
tofu plan               # preview drift or config changes
tofu apply              # apply them
tofu output             # list outputs (sensitive values masked)
tofu state list         # what OpenTofu currently manages
```

### Teardown

```sh
tofu destroy            # CAUTION: deletes the Cloudant instance and its data
```

Because the Cloudant instance was imported, `destroy` **will delete it**. Remove
it from state first (`tofu state rm ibm_resource_instance.cloudant`) if you only
want to tear down the IAM resources.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `No API key set` / auth errors | `export IC_API_KEY=...` in the current shell before running `tofu`. |
| `plan` wants to **create** Cloudant | The import (step 5) hasn't run — you'd provision a duplicate. Import first. |
| `Resource group "Default" not found` | Set the right group: `tofu apply -var resource_group_name=<name>`. |
| Deploying to the wrong region/account | Check `IC_API_KEY`'s account; override region with `-var region=<region>`. |
| Provider version changed | Re-run `tofu init -upgrade`. |
