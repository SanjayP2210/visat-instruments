// Drafts: one cloud draft per form, updated in place (optimistic revision check).
import { callApi } from '../api/client'
import { normalizeForm } from '../model/form'
import { toBusinessRecord } from './businessService'
import { toProductRecords } from './productService'
import { toServiceRecords } from './serviceService'

export const EDITABLE_STATUSES = ['DRAFT', 'CHANGES_REQUESTED']

// The full document sent to storage. Section services own their field shapes.
export function toStoredForm(form) {
  return {
    ...form,
    business: toBusinessRecord(form.business),
    products: toProductRecords(form.products),
    services: toServiceRecords(form.services),
  }
}

export const draftService = {
  list: () => callApi('draft.list'),

  async get(formId) {
    const draft = await callApi('draft.get', { formId })
    return { ...draft, data: normalizeForm(draft.data) }
  },

  /** Saves the form; resolves with the server-confirmed { revision, updatedAt, status }. */
  save: (formId, baseRevision, form, requestId) =>
    callApi('draft.save', { formId, baseRevision, data: toStoredForm(form) }, { requestId }),
}
