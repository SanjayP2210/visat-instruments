// Content resources (categories, brands, products, services, gallery, testimonials, enquiries,
// branding assets) and their image handling. Pure business logic: no Express, no Vercel.
import { Brand } from '../models/Brand.js'
import { BusinessProfile } from '../models/BusinessProfile.js'
import { Category, GalleryItem, Product, Service } from '../models/catalog.js'
import { ASSET_SLOTS, SiteAsset } from '../models/media.js'
import { Enquiry, Testimonial } from '../models/site.js'
import { errors } from '../utils/http.js'
import { assertExists, createCrudService } from './crudService.js'

const MAX_PRODUCT_IMAGES = 12

export function createContentServices(media) {
  const categories = createCrudService(Category, {
    label: 'Category',
    searchFields: ['name', 'slug', 'description'],
    filterFields: ['active'],
    async decorateList(items) {
      const counts = await Product.aggregate([{ $match: { category: { $in: items.map((c) => c._id) } } }, { $group: { _id: '$category', n: { $sum: 1 } } }])
      const byId = new Map(counts.map((c) => [String(c._id), c.n]))
      return items.map((c) => ({ ...c.toJSON(), productCount: byId.get(String(c._id)) ?? 0 }))
    },
    async beforeDelete(category) {
      const count = await Product.countDocuments({ category: category._id })
      if (count) throw errors.conflict(`This category still has ${count} product(s). Move or delete them first.`)
    },
  })

  const brands = createCrudService(Brand, {
    label: 'Brand',
    searchFields: ['name', 'slug'],
    filterFields: ['showOnWebsite', 'relationship'],
    async beforeDelete(brand) {
      const products = await Product.countDocuments({ brand: brand._id })
      if (products) throw errors.conflict(`This brand is used by ${products} product(s). Remove it from them first.`)
      if (await BusinessProfile.exists({ primaryBrand: brand._id })) throw errors.conflict('This brand is the business’s primary brand. Change that first.')
    },
    afterDelete: (brand) => media.remove(brand.logo, 'brand deleted'),
  })

  const products = createCrudService(Product, {
    label: 'Product',
    searchFields: ['name', 'slug', 'summary'],
    filterFields: ['category', 'brand', 'kind', 'featured', 'active'],
    populate: { path: 'category', select: 'name slug' },
    async beforeSave(data) {
      await assertExists(Category, data.category, 'category', 'Category')
      await assertExists(Brand, data.brand, 'brand', 'Brand')
    },
    afterDelete: (product) => media.removeMany(product.images, 'product deleted'),
  })

  const services = createCrudService(Service, {
    label: 'Service',
    searchFields: ['title', 'slug', 'summary'],
    filterFields: ['active', 'status'],
    afterDelete: (service) => media.remove(service.image, 'service deleted'),
  })

  const gallery = createCrudService(GalleryItem, {
    label: 'Gallery item',
    searchFields: ['title', 'caption', 'tag', 'location'],
    filterFields: ['type', 'active', 'tag'],
    async beforeSave(data) {
      for (const [i, id] of (data.relatedProducts ?? []).entries()) await assertExists(Product, id, `relatedProducts.${i}`, 'Product')
    },
    afterDelete: (item) => media.remove(item.image, 'gallery item deleted'),
  })

  const testimonials = createCrudService(Testimonial, {
    label: 'Review',
    searchFields: ['name', 'company', 'message', 'serviceReceived'],
    filterFields: ['published', 'source', 'status'],
    beforeSave(data, doc, actor) {
      // Testimonials entered by staff are approved by that staff member.
      if (!doc && !data.status) data.status = 'approved'
      if (data.status && data.status !== doc?.status) {
        data.moderatedBy = actor._id
        data.moderatedAt = new Date()
        if (data.status !== 'approved') data.published = false // pending/rejected reviews never stay public
      }
    },
  })

  const enquiries = createCrudService(Enquiry, {
    label: 'Enquiry',
    searchFields: ['name', 'phone', 'email', 'message', 'interest'],
    filterFields: ['status', 'type'],
    populate: [
      { path: 'product', select: 'name slug' },
      { path: 'service', select: 'title slug' },
    ],
  })

  const assets = createCrudService(SiteAsset, {
    label: 'Asset',
    searchFields: ['title'],
    filterFields: ['slot', 'active'],
    beforeDelete(asset) {
      if (asset.active) throw errors.conflict('This image is in use on the website. Deactivate or replace it before deleting.')
    },
    afterDelete: (asset) => media.remove(asset.image, 'asset deleted'),
  })

  /* ---------- single-image helpers (brand logo, service image, gallery image) ---------- */
  async function replaceImage(service, id, field, file, { folder, alt }, actor) {
    const doc = await service.get(id)
    const previous = doc[field]
    const updated = await media.uploadThen([file], { folder, alt: alt ?? previous?.alt ?? '' }, async ([image]) => {
      doc.set({ [field]: image, updatedBy: actor._id })
      return doc.save()
    })
    await media.remove(previous, `${field} replaced`)
    return updated
  }

  async function removeImage(service, id, field, actor) {
    const doc = await service.get(id)
    const previous = doc[field]
    if (!previous) throw errors.notFound('There is no image to remove.')
    doc.set({ [field]: undefined, updatedBy: actor._id })
    await doc.save()
    await media.remove(previous, `${field} removed`)
    return doc
  }

  return {
    categories,
    brands,
    products,
    services,
    gallery,
    testimonials,
    enquiries,
    assets,

    brandLogo: {
      replace: (id, file, opts, actor) => replaceImage(brands, id, 'logo', file, { folder: 'brands', ...opts }, actor),
      remove: (id, actor) => removeImage(brands, id, 'logo', actor),
    },
    serviceImage: {
      replace: (id, file, opts, actor) => replaceImage(services, id, 'image', file, { folder: 'services', ...opts }, actor),
      remove: (id, actor) => removeImage(services, id, 'image', actor),
    },
    galleryImage: {
      replace: (id, file, opts, actor) => replaceImage(gallery, id, 'image', file, { folder: 'gallery', ...opts }, actor),
    },

    /** Creates a gallery item together with its (required) image. */
    createGalleryItem(data, file, actor) {
      const { alt, ...fields } = data
      return media.uploadThen([file], { folder: 'gallery', alt: alt ?? fields.title }, ([image]) =>
        gallery.create({ ...fields, image }, actor),
      )
    },

    /* ---------- product images (multiple, ordered) ---------- */
    productImages: {
      async add(id, files, { alt }, actor) {
        const product = await products.get(id)
        if (product.images.length + files.length > MAX_PRODUCT_IMAGES) {
          throw errors.validation([{ path: 'images', message: `A product can have at most ${MAX_PRODUCT_IMAGES} images (it has ${product.images.length}).` }])
        }
        return media.uploadThen(files, { folder: 'products', alt: alt ?? product.name }, async (images) => {
          product.images.push(...images)
          product.updatedBy = actor._id
          return product.save()
        })
      },

      async update(id, imageId, changes, actor) {
        const product = await products.get(id)
        const image = product.images.id(imageId)
        if (!image) throw errors.notFound('Image not found.')
        image.set(changes)
        product.updatedBy = actor._id
        return product.save()
      },

      async replace(id, imageId, file, { alt }, actor) {
        const product = await products.get(id)
        const image = product.images.id(imageId)
        if (!image) throw errors.notFound('Image not found.')
        const previous = image.toObject()
        const saved = await media.uploadThen([file], { folder: 'products', alt: alt ?? previous.alt }, async ([next]) => {
          image.set({ ...next, fit: previous.fit })
          product.updatedBy = actor._id
          return product.save()
        })
        await media.remove(previous, 'product image replaced')
        return saved
      },

      async remove(id, imageId, actor) {
        const product = await products.get(id)
        const image = product.images.id(imageId)
        if (!image) throw errors.notFound('Image not found.')
        const previous = image.toObject()
        image.deleteOne()
        product.updatedBy = actor._id
        const saved = await product.save()
        await media.remove(previous, 'product image removed')
        return saved
      },

      async reorder(id, order, actor) {
        const product = await products.get(id)
        const current = product.images.map((img) => String(img._id))
        if (order.length !== current.length || new Set(order).size !== order.length || !order.every((x) => current.includes(x))) {
          throw errors.validation([{ path: 'order', message: 'List every image of this product exactly once.' }])
        }
        product.images = order.map((imgId) => product.images.id(imgId))
        product.updatedBy = actor._id
        return product.save()
      },
    },

    /* ---------- branding & media assets ---------- */
    async createAsset({ slot, alt, ...fields }, file, actor) {
      const single = !ASSET_SLOTS[slot].multiple
      const previous = single ? await SiteAsset.find({ slot }) : []
      const asset = await media.uploadThen([file], { folder: `site/${slot}`, alt: alt ?? fields.title ?? ASSET_SLOTS[slot].label }, ([image]) =>
        assets.create({ ...fields, slot, image }, actor),
      )
      // Single slots (logo, favicon, …) keep only the newest image.
      for (const old of previous) {
        await old.deleteOne()
        await media.remove(old.image, `${slot} replaced`)
      }
      return asset
    },

    replaceAssetImage: (id, file, opts, actor) => replaceImage(assets, id, 'image', file, { folder: 'site', ...opts }, actor),

    async updateAsset(id, { alt, ...fields }, actor) {
      const asset = await assets.get(id)
      asset.set({ ...fields, updatedBy: actor._id })
      if (alt !== undefined) asset.image.alt = alt
      return asset.save()
    },

    async updateEnquiry(id, changes, actor) {
      const enquiry = await enquiries.get(id)
      enquiry.set({ ...changes, handledBy: actor._id })
      await enquiry.save()
      return enquiry
    },
  }
}
