// Lists every Cloudinary public ID referenced by the database, to find unused (orphaned) files.
import { Brand } from '../models/Brand.js'
import { BusinessProfile } from '../models/BusinessProfile.js'
import { GalleryItem, Product, Service } from '../models/catalog.js'
import { SiteAsset } from '../models/media.js'
import { SeoSetting } from '../models/site.js'

export async function referencedPublicIds() {
  const ids = new Set()
  const add = (img) => img?.publicId && ids.add(img.publicId)
  for (const p of await BusinessProfile.find().lean()) p.owners?.forEach((o) => add(o.photo))
  for (const b of await Brand.find().lean()) add(b.logo)
  for (const p of await Product.find().lean()) {
    p.images?.forEach(add)
    add(p.seo?.ogImage)
  }
  for (const s of await Service.find().lean()) {
    add(s.image)
    add(s.seo?.ogImage)
  }
  for (const g of await GalleryItem.find().lean()) add(g.image)
  for (const a of await SiteAsset.find().lean()) add(a.image)
  for (const s of await SeoSetting.find().lean()) add(s.ogImage)
  return ids
}

/** Public IDs stored in Cloudinary (under this site's folder) that nothing references. */
export async function findOrphans(storage) {
  const referenced = await referencedPublicIds()
  const orphans = []
  let nextCursor
  do {
    const page = await storage.list({ nextCursor })
    orphans.push(...page.publicIds.filter((id) => !referenced.has(id) && !id.includes('/_healthcheck/')))
    nextCursor = page.nextCursor
  } while (nextCursor)
  return orphans
}
