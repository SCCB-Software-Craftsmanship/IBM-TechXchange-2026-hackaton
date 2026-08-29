locals {
  # The IBM Cloud provider flattens nested extension objects into a single map<string>.
  # For Cloudant the public endpoint is stored under the key "endpoints.public".
  cloudant_host = lookup(ibm_resource_instance.cloudant.extensions, "endpoints.public", "")
}

output "cloudant_url" {
  description = "External HTTPS endpoint for the Cloudant instance (preferred appdomain URL)."
  value       = "https://${local.cloudant_host}"
}

output "github_actions_api_key" {
  description = "IBM Cloud API key for the GitHub Actions service ID. Store as a repository secret."
  value       = ibm_iam_service_api_key.github_actions.apikey
  sensitive   = true
}
