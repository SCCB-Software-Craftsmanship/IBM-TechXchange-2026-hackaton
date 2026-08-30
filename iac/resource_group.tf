# Look up the existing IBM Cloud Resource Group — no new group is created.
# To use a different group, set var.resource_group_name.
data "ibm_resource_group" "vibebobbing" {
  name = var.resource_group_name
}
