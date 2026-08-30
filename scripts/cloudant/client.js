/**
 * Shared Cloudant client.
 *
 * Reads credentials from environment variables (loaded from .env locally,
 * or from GitHub Actions org secrets in CI):
 *
 *   CLOUDANT_URL     – service endpoint
 *   CLOUDANT_API_KEY – IBM Cloud IAM API key for the GitHub Actions service ID
 */

import 'dotenv/config';
import { CloudantV1 } from '@ibm-cloud/cloudant';
import { IamAuthenticator } from 'ibm-cloud-sdk-core';

const { CLOUDANT_URL, CLOUDANT_API_KEY } = process.env;

if (!CLOUDANT_URL || !CLOUDANT_API_KEY) {
  throw new Error(
    'Missing required env vars: CLOUDANT_URL and CLOUDANT_API_KEY must be set.\n' +
    'Locally: copy .env.example → .env and fill in the values.\n' +
    'CI: ensure the org secrets CLOUDANT_URL and CLOUDANT_API_KEY are set.'
  );
}

const client = CloudantV1.newInstance({
  authenticator: new IamAuthenticator({ apikey: CLOUDANT_API_KEY }),
  serviceUrl: CLOUDANT_URL,
});

export default client;
