/**
 * bootstrap.js — idempotent setup for the testability-runs database.
 *
 * Creates the database and a Mango index on `state` if they don't exist.
 * Safe to run multiple times.
 *
 * Usage:
 *   npm run cloudant:bootstrap
 *   node scripts/cloudant/bootstrap.js
 */

import client from './client.js';

const DB = 'testability-runs';

async function bootstrap() {
  // 1. Create the database (ignore 412 Precondition Failed = already exists)
  try {
    await client.putDatabase({ db: DB });
    console.log(`✓ Database '${DB}' created.`);
  } catch (err) {
    if (err.status === 412) {
      console.log(`  Database '${DB}' already exists — skipping.`);
    } else {
      throw err;
    }
  }

  // 2. Create a Mango index on `state` for efficient downstream queries
  //    e.g. find all runs with state = 'tests_not_yet_implemented'
  await client.postIndex({
    db: DB,
    index: {
      fields: ['state'],
    },
    name: 'idx-state',
    type: 'json',
  });
  console.log(`✓ Index 'idx-state' on field 'state' ensured.`);

  // 3. Create a compound index on type + state for type-discriminated queries
  await client.postIndex({
    db: DB,
    index: {
      fields: ['type', 'state'],
    },
    name: 'idx-type-state',
    type: 'json',
  });
  console.log(`✓ Index 'idx-type-state' on fields [type, state] ensured.`);

  console.log(`\nBootstrap complete. Database '${DB}' is ready.`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err.message ?? err);
  process.exit(1);
});
