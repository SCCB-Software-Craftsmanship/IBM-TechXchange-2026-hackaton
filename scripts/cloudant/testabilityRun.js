/**
 * TestabilityRun — document schema and state machine for Cloudant.
 *
 * Each document represents one run of the testability-prep skill on an
 * approved PR. Downstream agents query by state to discover work to do.
 *
 * Database: testability-runs
 * Label convention (GitHub Issues mirror): testability-run
 */

import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * All valid states for a TestabilityRun, in transition order.
 *
 * @enum {string}
 */
export const RunState = Object.freeze({
  /** testability-prep completed; test generation not yet started */
  TESTS_NOT_YET_IMPLEMENTED: 'tests_not_yet_implemented',

  /** A test-generation agent has claimed this run and is writing tests */
  TESTS_IN_PROGRESS: 'tests_in_progress',

  /** All test layers written; test PR opened or committed */
  TESTS_IMPLEMENTED: 'tests_implemented',

  /** Tests pass in CI and the coverage gate is satisfied */
  TESTS_VERIFIED: 'tests_verified',
});

/** Allowed forward transitions — prevents backwards/illegal state moves */
export const VALID_TRANSITIONS = {
  [RunState.TESTS_NOT_YET_IMPLEMENTED]: [RunState.TESTS_IN_PROGRESS],
  [RunState.TESTS_IN_PROGRESS]: [RunState.TESTS_IMPLEMENTED],
  [RunState.TESTS_IMPLEMENTED]: [RunState.TESTS_VERIFIED],
  [RunState.TESTS_VERIFIED]: [],
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new TestabilityRun document ready to be saved to Cloudant.
 *
 * @param {object} params
 * @param {string}        params.prLink            - URL of the original approved PR
 * @param {string|null}   params.testabilityPrLink - URL of the child testability PR, or null
 * @param {string[]}      params.barriersResolved  - barrier IDs fixed (e.g. ['B2','B3']), or []
 * @param {string}        params.summary           - prose summary produced by testability-prep
 * @param {object}        [params.meta]            - any extra key/value pairs to store
 * @returns {TestabilityRunDoc}
 */
export function createTestabilityRun({
  prLink,
  testabilityPrLink = null,
  barriersResolved = [],
  summary = '',
  meta = {},
}) {
  const now = new Date().toISOString();
  return {
    // Cloudant document ID — the stable UUID for this run
    _id: uuidv4(),

    // Human-readable type discriminator for queries
    type: 'testability-run',

    // State machine
    state: RunState.TESTS_NOT_YET_IMPLEMENTED,

    // Links
    pr_link: prLink,
    testability_pr_link: testabilityPrLink,

    // Barriers
    barriers_resolved: barriersResolved,

    // Summary text from testability-prep output
    summary,

    // Audit timestamps
    created_at: now,
    updated_at: now,

    // Arbitrary extra metadata (model used, skill version, etc.)
    meta,
  };
}

// ---------------------------------------------------------------------------
// Transition helper
// ---------------------------------------------------------------------------

/**
 * Return an updated copy of a run document advanced to the next state.
 * Throws if the transition is invalid.
 *
 * @param {TestabilityRunDoc} doc   - existing Cloudant document (must have `_rev`)
 * @param {string}            state - target RunState value
 * @returns {TestabilityRunDoc}
 */
export function transitionRun(doc, state) {
  const allowed = VALID_TRANSITIONS[doc.state] ?? [];
  if (!allowed.includes(state)) {
    throw new Error(
      `Invalid transition: ${doc.state} → ${state}. ` +
      `Allowed: [${allowed.join(', ') || 'none'}]`
    );
  }
  return { ...doc, state, updated_at: new Date().toISOString() };
}
