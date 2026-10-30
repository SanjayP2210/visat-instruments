// Services section ↔ storage records (Services sheet / future `services` collection).
const trim = (v) => String(v ?? '').trim()

export function toServiceRecords(services) {
  return services.map((s) => ({
    id: s.id,
    type: s.type,
    offered: s.offered,
    description: trim(s.description),
    coverageArea: trim(s.coverageArea),
    charges: trim(s.charges),
    turnaround: trim(s.turnaround),
  }))
}
