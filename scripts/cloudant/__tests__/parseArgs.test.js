/**
 * parseArgs.test.js
 *
 * Unit tests for the parseArgs function exported from save.js.
 * No network, no Cloudant, no env vars required — client.js is never
 * imported because save.js is now guarded by an import check.
 *
 * NOTE: save.js imports client.js at module load time even when not executing
 * as CLI. We mock CLOUDANT_URL + CLOUDANT_API_KEY in the env so client.js
 * initialises without throwing, but no actual HTTP calls are made.
 *
 * Run: node --test scripts/cloudant/__tests__/parseArgs.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// Provide dummy credentials so client.js doesn't throw on import
process.env.CLOUDANT_URL = 'https://dummy.cloudantnosqldb.appdomain.cloud';
process.env.CLOUDANT_API_KEY = 'dummy-key-for-tests';

const { parseArgs } = await import('../save.js');

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------
describe('parseArgs', () => {
  it('parses the command as _command', () => {
    const args = parseArgs(['create']);
    assert.equal(args._command, 'create');
  });

  it('parses a flag with a value', () => {
    const args = parseArgs(['create', '--pr-link', 'https://x']);
    assert.equal(args['pr-link'], 'https://x');
  });

  it('parses multiple flags', () => {
    const args = parseArgs([
      'create',
      '--pr-link', 'https://x',
      '--barriers', 'B2,B3',
      '--summary', 'All good.',
    ]);
    assert.equal(args['pr-link'], 'https://x');
    assert.equal(args['barriers'], 'B2,B3');
    assert.equal(args['summary'], 'All good.');
  });

  it('treats a flag with no following value as boolean true', () => {
    const args = parseArgs(['list', '--verbose']);
    assert.equal(args['verbose'], true);
  });

  it('treats an empty string as a valid flag value (fix for CI blank inputs)', () => {
    const args = parseArgs(['create', '--testability-pr-link', '', '--barriers', '']);
    assert.equal(args['testability-pr-link'], '');
    assert.equal(args['barriers'], '');
  });

  it('does not corrupt _command when empty string flags are present', () => {
    const args = parseArgs([
      'create',
      '--testability-pr-link', '',
      '--barriers', '',
    ]);
    assert.equal(args._command, 'create');
  });

  it('parses --state flag', () => {
    const args = parseArgs(['transition', '--id', 'abc-123', '--state', 'tests_in_progress']);
    assert.equal(args['id'], 'abc-123');
    assert.equal(args['state'], 'tests_in_progress');
  });

  it('handles flag immediately followed by another flag', () => {
    // --verbose with no value, then --state with a value
    const args = parseArgs(['list', '--verbose', '--state', 'tests_verified']);
    assert.equal(args['verbose'], true);
    assert.equal(args['state'], 'tests_verified');
  });

  it('returns empty object for empty argv', () => {
    const args = parseArgs([]);
    assert.deepEqual(args, {});
  });

  it('last occurrence of a duplicate flag wins', () => {
    const args = parseArgs(['list', '--state', 'first', '--state', 'second']);
    assert.equal(args['state'], 'second');
  });
});
