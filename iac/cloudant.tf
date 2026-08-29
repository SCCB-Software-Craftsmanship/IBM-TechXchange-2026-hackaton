# Existing Cloudant instance — managed by OpenTofu, not re-created.
# Import command (one-time):
#   tofu import ibm_resource_instance.cloudant \
#     crn:v1:bluemix:public:cloudantnosqldb:us-south:a/beef8ba3575242f39db50a9a0e242fe8:94c67872-c7c2-45bd-b9fe-61337b69f4b3::
resource "ibm_resource_instance" "cloudant" {
  name              = "watsonx-Hackathon Cloudant"
  service           = "cloudantnosqldb"
  plan              = "lite"
  location          = var.region
  resource_group_id = data.ibm_resource_group.vibebobbing.id

  parameters = {
    legacyCredentials = false
  }
}
