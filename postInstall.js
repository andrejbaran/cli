const { ux } = require('@cto.ai/sdk')

const postInstall = async () => {
  console.log(
    `\n🎨  ${ux.colors.multiOrange('Pro Tip!')} ${ux.colors.callOutCyan(
      'CTO.ai Ops CLI',
    )} is best used with a dark background.\n${ux.colors.multiOrange(
      'We recommend adjust your CLI background to get the best experience.\n',
    )}`,
  )

  console.log(
    `\n💻  Next, you'll need to sign up for an account by running ${ux.colors.italic.dim(
      'ops account:signup',
    )}\n\n`,
  )
}

postInstall()
