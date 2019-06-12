const fs = require('fs')
const { ux, sdk, log } = require('@cto.ai/sdk')

async function main() {
  const res = await sdk.user().catch(err => console.log(err))
  const greeting = res && res.me ? `👋 Hi, ${res.me.username}!` : `👋 Hi there!`

  console.log(greeting)

  console.log('writing file', process.env.HOME)
  fs.writeFileSync('BRANDNEWFILE.txt', 'this is my brand new file')
}

main()
