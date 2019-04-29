const { ux, sdk, log } = require('@cto.ai/sdk')

async function main() {
  const { me: user } = await sdk.user().catch(err => console.log(err))

  console.log(`👋 Hi, ${user.username}!`)
  console.log(`🏁 Here is a demo of the SDK...`)

  require('./demo')
}

main()
