variable "resource_group_name" {
  description = "Name of the IBM Cloud Resource Group used for all VibeBobbing resources."
  type        = string
  default     = "Default"
}

variable "region" {
  description = "IBM Cloud region for all regional resources."
  type        = string
  default     = "us-south"
}
