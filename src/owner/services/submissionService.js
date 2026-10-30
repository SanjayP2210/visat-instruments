// Submissions and the review workflow.
import { callApi } from '../api/client'
import { normalizeForm } from '../model/form'
import { toStoredForm } from './draftService'

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
}

// Developer review actions allowed from each status (mirrors REVIEW_TRANSITIONS on the server).
export const REVIEW_ACTIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'],
  UNDER_REVIEW: ['CHANGES_REQUESTED', 'APPROVED'],
}

export const submissionService = {
  /** Saves and submits atomically; resolves with { reference, version, status } confirmed by the server. */
  submit: (formId, baseRevision, form, requestId) =>
    callApi('submission.submit', { formId, baseRevision, data: toStoredForm(form) }, { requestId }),

  list: () => callApi('submission.list'),

  async get(formId) {
    const submission = await callApi('submission.get', { formId })
    return { ...submission, data: normalizeForm(submission.data) }
  },

  // Not retried automatically: a review decision should be applied exactly once.
  setStatus: (formId, status, note = '') => callApi('submission.setStatus', { formId, status, note }, { retries: 0 }),
}
