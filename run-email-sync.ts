import { syncApplicationEmailsForUser } from './src/lib/email-sync'

async function main() {
  const result = await syncApplicationEmailsForUser('default-user-id')
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
