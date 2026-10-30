// Simple single-object sections: weighbridge, highlights and website feedback.
import { YES_NO } from '../../model/form'
import { ChoiceGroup, TextArea, TextInput } from '../ui'

const sectionSetter = (setForm, section) => (key) => (value) =>
  setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }))

export function WeighbridgeStep({ form, setForm }) {
  const w = form.weighbridge
  const set = sectionSetter(setForm, 'weighbridge')
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <ChoiceGroup name="wb-hw" label="Do you supply weighbridge hardware (platforms)?" value={w.offersHardware} onChange={set('offersHardware')} options={YES_NO} />
      <ChoiceGroup name="wb-sw" label="Do you supply weighbridge software?" value={w.offersSoftware} onChange={set('offersSoftware')} options={YES_NO} />
      <TextArea id="wb-sizes" label="Platform sizes offered" value={w.platformSizes} onChange={set('platformSizes')} rows={2} hint="e.g. 9 m × 3 m, 18 m × 3 m" />
      <TextArea id="wb-cap" label="Capacities offered" value={w.capacities} onChange={set('capacities')} rows={2} hint="e.g. 40 t, 60 t, 100 t" />
      <TextArea id="wb-found" label="Foundation types" value={w.foundationTypes} onChange={set('foundationTypes')} rows={2} hint="e.g. pit-type, pitless / surface-mounted" />
      <TextArea id="wb-cells" label="Load cells used" value={w.loadCells} onChange={set('loadCells')} rows={2} hint="Types or makes, if you want them mentioned" />
      <TextArea id="wb-soft" label="Software features" value={w.softwareFeatures} onChange={set('softwareFeatures')} rows={4} className="sm:col-span-2" />
      <TextInput id="wb-time" label="Typical installation time" value={w.installationTime} onChange={set('installationTime')} />
      <TextArea id="wb-notes" label="Other notes" value={w.notes} onChange={set('notes')} rows={2} />
    </div>
  )
}

export function HighlightsStep({ form, setForm }) {
  const h = form.highlights
  const set = sectionSetter(setForm, 'highlights')
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <p className="text-sm text-steel-600 sm:col-span-2">
        Only include facts you are happy to show publicly. We will not add any claims you have not confirmed here.
      </p>
      <TextInput id="h-year" label="Year established" value={h.establishedYear} onChange={set('establishedYear')} inputMode="numeric" />
      <TextInput id="h-customers" label="Customers served" value={h.customersServed} onChange={set('customersServed')} hint="e.g. a number or customer types" />
      <TextArea id="h-cert" label="Certifications or approvals" value={h.certifications} onChange={set('certifications')} rows={2} className="sm:col-span-2" hint="e.g. legal metrology licence details" />
      <TextArea id="h-strengths" label="Key strengths" value={h.keyStrengths} onChange={set('keyStrengths')} rows={3} className="sm:col-span-2" />
      <TextArea id="h-projects" label="Notable projects or installations" value={h.notableProjects} onChange={set('notableProjects')} rows={3} className="sm:col-span-2" />
    </div>
  )
}

const RATINGS = ['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }))
const APPROVAL = [
  { value: 'approved', label: 'Content is correct' },
  { value: 'minor', label: 'Small changes needed' },
  { value: 'major', label: 'Major changes needed' },
]

export function FeedbackStep({ form, setForm }) {
  const fb = form.feedback
  const set = sectionSetter(setForm, 'feedback')
  return (
    <div className="grid gap-5">
      <ChoiceGroup name="fb-rating" label="How do you rate the website overall? (1–5)" value={fb.overallRating} onChange={set('overallRating')} options={RATINGS} />
      <ChoiceGroup name="fb-approval" label="Is the current website content correct?" value={fb.contentApproval} onChange={set('contentApproval')} options={APPROVAL} />
      <TextArea id="fb-likes" label="What do you like?" value={fb.likes} onChange={set('likes')} rows={2} />
      <TextArea id="fb-changes" label="What should change?" value={fb.changes} onChange={set('changes')} rows={4} hint="Mention the page and what is wrong or missing." />
      <TextArea id="fb-missing" label="Information missing from the website" value={fb.missingInfo} onChange={set('missingInfo')} rows={2} />
      <TextArea id="fb-photos" label="Photos to replace or add" value={fb.photosToReplace} onChange={set('photosToReplace')} rows={2} />
      <TextArea id="fb-other" label="Other comments" value={fb.otherComments} onChange={set('otherComments')} rows={2} />
    </div>
  )
}
