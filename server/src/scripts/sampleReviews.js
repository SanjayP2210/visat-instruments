// Adds 10 clearly tagged SAMPLE reviews for local testing of the reviews carousel and page.
// They are approved + published so they show on the website. Never use on production.
// Usage: npm run reviews:sample             (adds the samples; skips if already present)
//        npm run reviews:sample -- --remove (deletes every sample review again)
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { loadConfig } from '../config/env.js'
import { Testimonial } from '../models/index.js'

const MARKER = 'SAMPLE REVIEW (testing only)' // stored in `company`, used to find and remove them

const SAMPLES = [
  ['Ramesh P.', 5, 'Installation', 'The team completed the weighbridge installation on time and explained how to use the indicator and software clearly.'],
  ['Suresh K.', 4, 'Service & Maintenance', 'Called them for a weighing problem and the engineer visited the next day. The issue was found and fixed quickly.'],
  ['Hitesh M.', 5, 'Annual Maintenance Contract (AMC)', 'We have an AMC with them. Regular visits keep our weighbridge running and they respond fast when we call.'],
  ['Kiran B.', 5, 'Sales', 'Helpful guidance while choosing the right setup for our yard. They answered all our questions patiently.'],
  ['Jignesh R.', 4, 'Service & Maintenance', 'Good service and fair pricing. The technician was polite and checked the full system before leaving.'],
  ['Mehul D.', 5, 'Installation', 'Neat wiring and proper setup of the platform and display. Everything has worked smoothly since installation.'],
  ['Pravin S.', 3, 'Sales', 'Product is fine and support is good. Delivery took a little longer than we expected, but they kept us informed.'],
  ['Nilesh T.', 5, 'Annual Maintenance Contract (AMC)', 'Reliable support under the AMC. They always pick up the phone and arrange a visit when needed.'],
  ['Vipul G.', 4, 'Service & Maintenance', 'Quick response for a load cell issue at our site. The weighing is accurate again and work is running normally.'],
  ['Ashok V.', 5, 'Installation', 'Very professional team. They installed the system, trained our operator and left the site clean.'],
]

async function main() {
  const config = loadConfig()
  if (!config.db.configured) throw new Error('MONGODB_URI is not set in server/.env.')
  // Sample reviews are allowed only in local development/test databases, never preview or production.
  if (!/_(dev|test)$/i.test(config.db.dbName)) throw new Error(`Refusing to touch sample reviews in "${config.db.dbName}".`)
  await connectDatabase(config.db)

  if (process.argv.includes('--remove')) {
    const { deletedCount } = await Testimonial.deleteMany({ company: MARKER })
    console.log(`Removed ${deletedCount} sample review(s) from "${config.db.dbName}".`)
    return
  }
  if (await Testimonial.exists({ company: MARKER })) {
    console.log(`Sample reviews already exist in "${config.db.dbName}". Use --remove first to recreate them.`)
    return
  }
  const now = Date.now()
  await Testimonial.insertMany(
    SAMPLES.map(([name, rating, serviceReceived, message], i) => ({
      name,
      rating,
      serviceReceived,
      message,
      company: MARKER,
      source: 'other',
      consentConfirmed: true,
      status: 'approved',
      moderatedAt: new Date(now),
      published: true,
      createdAt: new Date(now - i * 86400000),
    })),
  )
  console.log(`Added ${SAMPLES.length} approved + published sample reviews to "${config.db.dbName}".`)
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase().catch(() => {}))
