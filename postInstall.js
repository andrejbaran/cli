const { ux } = require('@cto.ai/sdk')

const postInstall = async () => {
  console.log(
    `\n🎨 ${ux.colors.multiOrange('Pro Tip!')} ${ux.colors.callOutCyan(
      'CTO.ai Ops CLI',
    )} is best used with a dark background.\n${ux.colors.multiOrange(
      'We recommend adjust your CLI background to get the best experience.\n',
    )}`,
  )
}

postInstall()
