const { ux, sdk } = require('@cto.ai/sdk')
async function main() {
  sdk.track(['demo', 'track'], {
    event: '👋 How are you today?',
  })
  let question = await ux.prompt({
    type: 'input',
    name: 'answer',
    message: '👋 How are you today?',
  })
  sdk.track(['demo', 'track'], {
    event: `👉 Answer: ${question.answer}`,
  })
  await ux.print(`👉 Answer: ${question.answer}`)
}
main()
