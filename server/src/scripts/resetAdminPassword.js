// Resets a user's password from the terminal (e.g. a forgotten Admin password).
// Usage: npm run admin:reset-password            (asks for the email)
//        npm run admin:reset-password -- you@example.com
// The new password is typed hidden and never written to a file or printed.
import { createInterface } from 'node:readline'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { loadConfig } from '../config/env.js'
import { User } from '../models/User.js'
import { isStrongPassword, PASSWORD_RULES } from '../services/passwordService.js'
import { resetUserPassword } from '../services/userService.js'

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (answer) => (rl.close(), resolve(answer.trim()))))
}

// Reads a line without echoing the characters.
function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error('Run this in an interactive terminal.'))
    process.stdout.write(question)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    let value = ''
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(value)
        }
        if (ch === '\u0003') {
          process.stdout.write('\n')
          process.exit(130) // Ctrl+C
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1)
        else value += ch
      }
    }
    process.stdin.on('data', onData)
  })
}

async function main() {
  const config = loadConfig()
  if (!config.db.configured) throw new Error('MONGODB_URI is not set in server/.env.')

  const email = (process.argv[2] || (await ask(`Email${config.initialAdmin.email ? ` [${config.initialAdmin.email}]` : ''}: `)) || config.initialAdmin.email || '').toLowerCase()
  if (!email) throw new Error('Enter an email address.')

  await connectDatabase(config.db)
  const user = await User.findOne({ email })
  if (!user) throw new Error(`No user with email ${email} in database "${config.db.dbName}".`)

  console.log(`Resetting the password for ${user.name} (${user.role}) in "${config.db.dbName}".`)
  console.log(PASSWORD_RULES)
  const password = await askHidden('New password: ')
  if (!isStrongPassword(password)) throw new Error(`Password not changed: ${PASSWORD_RULES}`)
  if ((await askHidden('Repeat new password: ')) !== password) throw new Error('Password not changed: the two entries do not match.')

  await resetUserPassword(user._id, password, config) // also unlocks the account and signs out all sessions
  console.log('Password changed. You can now sign in at /admin with the new password.')
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase().catch(() => {}))
