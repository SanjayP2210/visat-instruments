// Read-only view of the whole form, used for review before submitting and on submission pages.
import { YES_NO } from '../model/form'
import StoredImage from './StoredImage'

const yesNo = (v) => YES_NO.find((o) => o.value === v)?.label ?? ''

function Rows({ rows }) {
  const filled = rows.filter(([, v]) => v)
  if (!filled.length) return <p className="text-sm text-steel-500">Nothing entered.</p>
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
      {filled.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-semibold text-steel-600">{label}</dt>
          <dd className="whitespace-pre-line text-navy-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Section({ title, onEdit, children }) {
  return (
    <section className="rounded-xl border border-steel-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold">{title}</h3>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-sm font-semibold text-accent-600 hover:underline">
            Edit
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export default function FormSummary({ form, onEditStep }) {
  const edit = (key) => (onEditStep ? () => onEditStep(key) : undefined)
  const b = form.business
  const w = form.weighbridge
  const h = form.highlights
  const fb = form.feedback

  return (
    <div className="space-y-4">
      <Section title="Business information" onEdit={edit('business')}>
        <Rows
          rows={[
            ['Business name', b.businessName], ['Contact person', b.contactPerson], ['Mobile', b.phone], ['WhatsApp', b.whatsapp],
            ['Email', b.email], ['Address', [b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ')], ['GSTIN', b.gstin],
            ['Working hours', b.workingHours], ['Areas served', b.serviceAreas], ['About', b.description],
          ]}
        />
      </Section>

      <Section title={`Products (${form.products.length})`} onEdit={edit('products')}>
        {!form.products.length && <p className="text-sm text-steel-500">No products added.</p>}
        <div className="space-y-5">
          {form.products.map((p) => (
            <article key={p.id} className="border-t border-steel-200 pt-4 first:border-0 first:pt-0">
              <h4 className="text-lg font-bold">{p.name || 'Unnamed product'}</h4>
              <p className="mb-3 text-xs font-semibold text-accent-600">{p.category}</p>
              <Rows
                rows={[
                  ['Capacity / range', p.capacity], ['Model', p.modelNumber], ['Brand', p.brand], ['Price', p.priceNote],
                  ['Warranty', p.warranty], ['Uses', p.applications], ['Description', p.description],
                ]}
              />
              {p.specifications.length > 0 && (
                <table className="mt-3 w-full max-w-lg text-sm">
                  <caption className="mb-1 text-left text-xs font-semibold text-steel-500">Specifications</caption>
                  <tbody className="divide-y divide-steel-200">
                    {p.specifications.map((s) => (
                      <tr key={s.id}>
                        <th scope="row" className="py-1.5 pr-4 text-left font-medium text-steel-600">{s.label}</th>
                        <td className="py-1.5 font-semibold">{[s.value, s.unit].filter(Boolean).join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {p.images.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${p.name} photos`}>
                  {p.images.map((img) => (
                    <li key={img.fileId}>
                      <StoredImage fileId={img.fileId} alt={`${p.name} photo ${img.name}`} className="h-20 w-20 rounded-md" />
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </Section>

      <Section title="Services" onEdit={edit('services')}>
        {!form.services.length && <p className="text-sm text-steel-500">No services listed.</p>}
        <div className="space-y-4">
          {form.services.map((s) => (
            <div key={s.id}>
              <h4 className="font-bold">
                {s.type || 'Service'} <span className="font-normal text-steel-500">· {yesNo(s.offered) || 'not answered'}</span>
              </h4>
              <Rows rows={[['Included', s.description], ['Coverage', s.coverageArea], ['Charges', s.charges], ['Turnaround', s.turnaround]]} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Weighbridge solutions" onEdit={edit('weighbridge')}>
        <Rows
          rows={[
            ['Hardware', yesNo(w.offersHardware)], ['Software', yesNo(w.offersSoftware)], ['Platform sizes', w.platformSizes],
            ['Capacities', w.capacities], ['Foundations', w.foundationTypes], ['Load cells', w.loadCells],
            ['Software features', w.softwareFeatures], ['Installation time', w.installationTime], ['Notes', w.notes],
          ]}
        />
      </Section>

      <Section title="Business highlights" onEdit={edit('highlights')}>
        <Rows
          rows={[
            ['Established', h.establishedYear], ['Customers served', h.customersServed], ['Certifications', h.certifications],
            ['Key strengths', h.keyStrengths], ['Notable projects', h.notableProjects],
          ]}
        />
      </Section>

      <Section title="Website feedback" onEdit={edit('feedback')}>
        <Rows
          rows={[
            ['Overall rating', fb.overallRating && `${fb.overallRating} / 5`], ['Content', fb.contentApproval], ['Likes', fb.likes],
            ['Changes', fb.changes], ['Missing info', fb.missingInfo], ['Photos', fb.photosToReplace], ['Other', fb.otherComments],
          ]}
        />
      </Section>
    </div>
  )
}
