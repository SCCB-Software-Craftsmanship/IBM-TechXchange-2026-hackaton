provider "ibm" {
  region = var.region
  # Authentication: set IC_API_KEY environment variable — no hardcoded credentials.
}
