/**
 * save.js — CLI for creating, updating, and listing TestabilityRun records.
 * Exports parseArgs and command functions for testing.
 *
 * Commands:
 *
 *   Create a new run (initial state = tests_not_yet_implemented):
 *     node scripts/cloudant/save.js create \
 *       --pr-link <url> \
 *       [--testability-pr-link <url>] \
 *       [--barriers B2,B3] \
 *       [--summary "..."] \
 *       [--meta '{"pr_number":42,"pr_title":"...","author":"...","branch":"...",
 *                 "metrics":{"before":{"open_barriers":2},"after":{"open_barriers":0,"seams":2}}}']
 *
 *   Transition an existing run to the next state:
 *     node scripts/cloudant/save.js transition \
 *       --id <doc-id> \
 *       --state tests_in_progress
 *
 *   List all runs (optionally filtered by state):
 *     node scripts/cloudant/save.js list [--state tests_not_yet_implemented]
 *
 *   Get a single run by ID:
 *     node scripts/cloudant/save.js get --id <doc-id>
 */

import { fileURLToPath } from 'url';
import client from './client.js';
import { createTestabilityRun, transitionRun, RunState } from './testabilityRun.js';

const DB = 'testability-runs';

// ---------------------------------------------------------------------------
// Tiny arg parser (no external dep)
// ---------------------------------------------------------------------------
export function parseArgs(argv) {
  const args = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      // Consume next token as value when it exists and isn't itself a flag —
      // including empty strings (""), which are valid explicit values.
      args[key] = (next !== undefined && !next.startsWith('--')) ? (i++, next) : true;
    } else {
      args['_command'] = a;
    }
    i++;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdCreate(args) {
  if (!args['pr-link']) {
    console.error('Error: --pr-link is required for create.');
    process.exit(1);
  }

  // Optional --meta '{"pr_number":42,"metrics":{"before":{...},"after":{...}}}' —
  // arbitrary extra fields (PR identity, testability-prep's own metrics) the site
  // reads to render more than the bare minimum fields.
  let meta = {};
  if (args['meta']) {
    try {
      meta = JSON.parse(args['meta']);
    } catch {
      console.error('Error: --meta must be valid JSON (e.g. \'{"pr_number":42}\')');
      process.exit(1);
    }
  }

  const doc = createTestabilityRun({
    prLink: args['pr-link'],
    testabilityPrLink: args['testability-pr-link'] ?? null,
    barriersResolved: args['barriers'] ? args['barriers'].split(',').map(s => s.trim()) : [],
    summary: args['summary'] ?? '',
    meta,
  });

  const { result } = await client.postDocument({ db: DB, document: doc });
  console.log(JSON.stringify({ id: result.id, state: doc.state, rev: result.rev }, null, 2));
  return result;
}

async function cmdTransition(args) {
  if (!args['id'] || !args['state']) {
    console.error('Error: --id and --state are required for transition.');
    process.exit(1);
  }
  if (!Object.values(RunState).includes(args['state'])) {
    console.error(`Error: invalid state '${args['state']}'. Valid values: ${Object.values(RunState).join(', ')}`);
    process.exit(1);
  }

  // Optional --test-prs '{"unit":"<url>","integration":"<url>"}' — only used when
  // transitioning to tests_implemented to record per-layer test PR links.
  let testPrs = {};
  if (args['test-prs']) {
    try {
      testPrs = JSON.parse(args['test-prs']);
    } catch {
      console.error('Error: --test-prs must be valid JSON (e.g. \'{"unit":"https://..."}\')');
      process.exit(1);
    }
  }

  const { result: doc } = await client.getDocument({ db: DB, docId: args['id'] });
  const updated = transitionRun(doc, args['state'], testPrs);
  const { result } = await client.putDocument({ db: DB, docId: updated._id, document: updated });
  console.log(JSON.stringify({ id: result.id, state: updated.state, test_prs: updated.test_prs, rev: result.rev }, null, 2));
  return result;
}

async function cmdList(args) {
  const selector = { type: { '$eq': 'testability-run' } };
  if (args['state']) {
    selector.state = { '$eq': args['state'] };
  }

  const { result } = await client.postFind({
    db: DB,
    selector,
    limit: 50,
  });

  const rows = result.docs.map(d => ({
    id: d._id,
    state: d.state,
    pr_link: d.pr_link,
    testability_pr_link: d.testability_pr_link,
    barriers_resolved: d.barriers_resolved,
    created_at: d.created_at,
  }));

  console.log(JSON.stringify(rows, null, 2));
  return rows;
}

async function cmdGet(args) {
  if (!args['id']) {
    console.error('Error: --id is required for get.');
    process.exit(1);
  }
  const { result: doc } = await client.getDocument({ db: DB, docId: args['id'] });
  console.log(JSON.stringify(doc, null, 2));
  return doc;
}

export const commands = { create: cmdCreate, transition: cmdTransition, list: cmdList, get: cmdGet };

// ---------------------------------------------------------------------------
// Entry point — only runs when executed directly, not when imported in tests
// ---------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const command = args['_command'];

  if (!command || !commands[command]) {
    console.error(`Usage: node scripts/cloudant/save.js <create|transition|list|get> [options]`);
    console.error(`Valid states: ${Object.values(RunState).join(', ')}`);
    process.exit(1);
  }

  commands[command](args).catch((err) => {
    console.error('Error:', err.message ?? err);
    process.exit(1);
  });
}
