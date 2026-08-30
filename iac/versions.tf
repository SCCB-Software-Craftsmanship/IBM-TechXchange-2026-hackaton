terraform {
  required_version = ">= 1.6"

  required_providers {
    ibm = {
      # No upper-bound constraint — intentional project decision for hackathon agility.
      # Pin a specific version here before promoting to production.
      source = "IBM-Cloud/ibm"
    }
  }
}
