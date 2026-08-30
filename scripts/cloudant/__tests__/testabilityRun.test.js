/**
 * testabilityRun.test.js
 *
 * Unit tests for the TestabilityRun schema, factory, and state machine.
 * Pure logic — no network, no Cloudant, no env vars required.
 *
 * Run: node --test scripts/cloudant/__tests__/testabilityRun.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  RunState,
  VALID_TRANSITIONS,
  createTestabilityRun,
  transitionRun,
} from '../testabilityRun.js';

// ---------------------------------------------------------------------------
// RunState enum
// ---------------------------------------------------------------------------
describe('RunState', () => {
  it('exposes all four state values', () => {
    assert.equal(RunState.TESTS_NOT_YET_IMPLEMENTED, 'tests_not_yet_implemented');
    assert.equal(RunState.TESTS_IN_PROGRESS,         'tests_in_progress');
    assert.equal(RunState.TESTS_IMPLEMENTED,         'tests_implemented');
    assert.equal(RunState.TESTS_VERIFIED,            'tests_verified');
  });

  it('is frozen — values cannot be mutated', () => {
    assert.throws(() => { RunState.NEW_VALUE = 'x'; }, TypeError);
  });
});

// ---------------------------------------------------------------------------
// VALID_TRANSITIONS map
// ---------------------------------------------------------------------------
describe('VALID_TRANSITIONS', () => {
  it('defines a forward-only chain covering all states', () => {
    assert.deepEqual(
      VALID_TRANSITIONS[RunState.TESTS_NOT_YET_IMPLEMENTED],
      [RunState.TESTS_IN_PROGRESS]
    );
    assert.deepEqual(
      VALID_TRANSITIONS[RunState.TESTS_IN_PROGRESS],
      [RunState.TESTS_IMPLEMENTED]
    );
    assert.deepEqual(
      VALID_TRANSITIONS[RunState.TESTS_IMPLEMENTED],
      [RunState.TESTS_VERIFIED]
    );
    assert.deepEqual(
      VALID_TRANSITIONS[RunState.TESTS_VERIFIED],
      []
    );
  });
});

// ---------------------------------------------------------------------------
// createTestabilityRun factory
// ---------------------------------------------------------------------------
describe('createTestabilityRun', () => {
  it('sets initial state to tests_not_yet_implemented', () => {
    const doc = createTestabilityRun({ prLink: 'https://github.com/org/repo/pull/1' });
    assert.equal(doc.state, RunState.TESTS_NOT_YET_IMPLEMENTED);
  });

  it('generates a UUID _id', () => {
    const doc = createTestabilityRun({ prLink: 'https://github.com/org/repo/pull/1' });
    assert.match(doc._id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('each call produces a different _id', () => {
    const a = createTestabilityRun({ prLink: 'https://github.com/org/repo/pull/1' });
    const b = createTestabilityRun({ prLink: 'https://github.com/org/repo/pull/1' });
    assert.notEqual(a._id, b._id);
  });

  it('sets type discriminator to testability-run', () => {
    const doc = createTestabilityRun({ prLink: 'https://x' });
    assert.equal(doc.type, 'testability-run');
  });

  it('stores pr_link correctly', () => {
    const url = 'https://github.com/org/repo/pull/42';
    const doc = createTestabilityRun({ prLink: url });
    assert.equal(doc.pr_link, url);
  });

  it('defaults testability_pr_link to null', () => {
    const doc = createTestabilityRun({ prLink: 'https://x' });
    assert.equal(doc.testability_pr_link, null);
  });

  it('stores provided testability_pr_link', () => {
    const doc = createTestabilityRun({
      prLink: 'https://x',
      testabilityPrLink: 'https://github.com/org/repo/pull/43',
    });
    assert.equal(doc.testability_pr_link, 'https://github.com/org/repo/pull/43');
  });

  it('defaults barriers_resolved to empty array', () => {
    const doc = createTestabilityRun({ prLink: 'https://x' });
    assert.deepEqual(doc.barriers_resolved, []);
  });

  it('stores provided barriers', () => {
    const doc = createTestabilityRun({ prLink: 'https://x', barriersResolved: ['B2', 'B3'] });
    assert.deepEqual(doc.barriers_resolved, ['B2', 'B3']);
  });

  it('stores summary', () => {
    const doc = createTestabilityRun({ prLink: 'https://x', summary: 'Two barriers removed.' });
    assert.equal(doc.summary, 'Two barriers removed.');
  });

  it('sets created_at and updated_at to the same ISO timestamp', () => {
    const before = new Date().toISOString();
    const doc = createTestabilityRun({ prLink: 'https://x' });
    const after = new Date().toISOString();
    assert.equal(doc.created_at, doc.updated_at);
    assert.ok(doc.created_at >= before);
    assert.ok(doc.created_at <= after);
  });

  it('stores extra meta fields', () => {
    const doc = createTestabilityRun({ prLink: 'https://x', meta: { model: 'granite-3' } });
    assert.deepEqual(doc.meta, { model: 'granite-3' });
  });
});

// ---------------------------------------------------------------------------
// transitionRun
// ---------------------------------------------------------------------------
describe('transitionRun', () => {
  function makeDoc(state) {
    return { ...createTestabilityRun({ prLink: 'https://x' }), state, _rev: '1-abc' };
  }

  it('advances tests_not_yet_implemented → tests_in_progress', () => {
    const doc = makeDoc(RunState.TESTS_NOT_YET_IMPLEMENTED);
    const updated = transitionRun(doc, RunState.TESTS_IN_PROGRESS);
    assert.equal(updated.state, RunState.TESTS_IN_PROGRESS);
  });

  it('advances tests_in_progress → tests_implemented', () => {
    const doc = makeDoc(RunState.TESTS_IN_PROGRESS);
    const updated = transitionRun(doc, RunState.TESTS_IMPLEMENTED);
    assert.equal(updated.state, RunState.TESTS_IMPLEMENTED);
  });

  it('advances tests_implemented → tests_verified', () => {
    const doc = makeDoc(RunState.TESTS_IMPLEMENTED);
    const updated = transitionRun(doc, RunState.TESTS_VERIFIED);
    assert.equal(updated.state, RunState.TESTS_VERIFIED);
  });

  it('updates updated_at timestamp on transition', () => {
    const doc = makeDoc(RunState.TESTS_NOT_YET_IMPLEMENTED);
    const before = new Date().toISOString();
    const updated = transitionRun(doc, RunState.TESTS_IN_PROGRESS);
    assert.ok(updated.updated_at >= before);
  });

  it('does not mutate the original document', () => {
    const doc = makeDoc(RunState.TESTS_NOT_YET_IMPLEMENTED);
    const originalState = doc.state;
    transitionRun(doc, RunState.TESTS_IN_PROGRESS);
    assert.equal(doc.state, originalState);
  });

  it('throws on backward transition (tests_in_progress → tests_not_yet_implemented)', () => {
    const doc = makeDoc(RunState.TESTS_IN_PROGRESS);
    assert.throws(
      () => transitionRun(doc, RunState.TESTS_NOT_YET_IMPLEMENTED),
      /Invalid transition/
    );
  });

  it('throws on skip transition (tests_not_yet_implemented → tests_implemented)', () => {
    const doc = makeDoc(RunState.TESTS_NOT_YET_IMPLEMENTED);
    assert.throws(
      () => transitionRun(doc, RunState.TESTS_IMPLEMENTED),
      /Invalid transition/
    );
  });

  it('throws when already at terminal state (tests_verified)', () => {
    const doc = makeDoc(RunState.TESTS_VERIFIED);
    assert.throws(
      () => transitionRun(doc, RunState.TESTS_NOT_YET_IMPLEMENTED),
      /Invalid transition.*none/
    );
  });

  it('throws on unknown state string', () => {
    const doc = makeDoc(RunState.TESTS_NOT_YET_IMPLEMENTED);
    assert.throws(
      () => transitionRun(doc, 'totally_invalid'),
      /Invalid transition/
    );
  });
});
