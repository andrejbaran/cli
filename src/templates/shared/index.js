const { sdk } = require('@cto.ai/sdk')

async function main() {
  const res = await sdk.user().catch(err => console.log(err))
  const greeting = res && res.me ? `👋 Hi, ${res.me.username}!` : `👋 Hi there!`

  console.log(greeting)
  console.log(`🏁 Here is a demo of the SDK...`)

  require('./demo')
}

main()
