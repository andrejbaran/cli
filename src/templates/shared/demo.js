const { ux, sdk } = require('@cto.ai/sdk')
const { LOGO, USERS, COLORS } = require('./constants')
const {
  inputPrompts,
  listPrompts,
  confirmPrompts,
  continuePrompts,
  fuzzySearchPrompts,
  datePickerPrompts,
} = require('./prompts')
const { coloredTreeString, getColor, getArgs } = require('./utils/helpers')

const main = async () => {
  const argv = process.argv
  const arguments = argv && argv.length ? getArgs(argv) : []

  const res = await sdk.user().catch(err => sdk.log(err))
  const person = res && res.me ? `, ${res.me.username}` : ' there'
  const greeting = `\n👋  ${ux.colors.bgRed(
    'Welcome to the CTO.ai CLI SDK Demo',
  )} 👋\n\nHi${person}! This is a demo for CTO.ai CLI SDK that will take you through a tour of the user interactions that are included.\nUse these elements to customize your own Ops!`

  await ux.print(LOGO)
  await ux.print(greeting)
  await ux.prompt(continuePrompts)

  const promptsDescription = [
    `\nℹ️  Create prompts to capture information or details.`,
    ` Press enter for examples, type anything when asked, it's just for fun.`,
    `\n\n💬 ${ux.colors.bold(
      ux.colors.primary('Ask for information through a form:'),
    )}`,
  ].join('')

  // Trigger prompt
  // https://github.com/SBoudrias/Inquirer.js/#examples-run-it-and-see-it
  await ux.print(ux.colors.bold.underline('\n⭐ Prompts '))
  await ux.print(promptsDescription)

  // INPUT
  const { email, password } = await ux.prompt(inputPrompts)

  // LIST
  await ux.print(
    `\n💬 ${ux.colors.bold(
      ux.colors.primary('Create lists for users to select from:'),
    )}`,
  )
  const { list } = await ux.prompt(listPrompts)

  // CONFIRM
  await ux.print(
    `\n💬 ${ux.colors.bold(
      ux.colors.primary('Create boolean yes/no prompts:'),
    )}`,
  )
  const { confirm } = await ux.prompt(confirmPrompts)

  // FUZZY SEARCH
  await ux.print(
    `\n💬 ${ux.colors.bold(
      ux.colors.primary(
        'Add a fuzzy search feature to your lists! Try typing and using the arrow keys.',
      ),
    )}`,
  )
  const { autocomplete } = await ux.prompt(fuzzySearchPrompts)

  // DATE PICKER
  await ux.print(
    `\n💬 ${ux.colors.bold(ux.colors.primary('And specify times:'))}`,
  )
  const { datepicker } = await ux.prompt(datePickerPrompts)

  // Trigger logs
  const logsSection = [
    `\nℹ️  Create logs of events to easily share through the CLI.`,
    `\nFor example, here's the ${ux.colors.bold('Current User')}:\n`,
  ].join('\n')
  await ux.print(ux.colors.bold.underline('\n\n⭐ Logs '))
  await ux.print(logsSection)

  const currentUser = await sdk.user().catch(err => {
    ux.print('unable to retrieve current user')
  })
  await ux.print(currentUser)
  sdk.track(['demo', 'track'], {
    currentUser,
    answers: { email, password, list, autocomplete, datepicker },
  })
  await ux.prompt(continuePrompts)

  // Trigger spinner and progress bar
  const progressIndicatorsSection = [
    '\nℹ️  Add spinners & progress bars to your Op',
    ' to keep your users informed that a process is taking place.\n',
  ].join('')
  await ux.print(ux.colors.bold.underline('\n⭐ Progress Indicators '))
  await ux.print(progressIndicatorsSection)

  await ux.spinner.start(ux.colors.blue(' Computing UX'))
  // Wait
  // https://github.com/oclif/cli-ux#clitable
  await ux.wait(2000)
  await ux.spinner.stop(ux.colors.green('Done!'))

  // Progress Bar
  // https://github.com/AndiDittrich/Node.CLI-Progress#usage
  await ux.print(ux.colors.white('\n Downloading Progress Bar'))
  const bar1 = ux.progress.init()
  await bar1.start(200, 0)
  for (let i = 0; i < 100; i++) {
    await bar1.update((i + 1) * 2)
    await ux.wait(25)
  }
  await bar1.stop()
  await ux.prompt(continuePrompts)

  // Url
  // https://github.com/oclif/cli-ux#cliurltext-uri
  await ux.print(ux.colors.bold.underline('\n⭐ Url '))
  await ux.print(
    `\nℹ️  Link users to relevant data directly from the command line for users to click.\n`,
  )
  await ux.print(ux.url('cto.ai', 'https://cto.ai'))
  await ux.prompt(continuePrompts)

  // Table
  // https://github.com/oclif/cli-ux#clitable
  await ux.print(ux.colors.bold.underline('\n⭐ Table '))
  await ux.print(
    `\nℹ️  Add tables to display information in a neat and organized way.\n`,
  )
  await ux.table(USERS, {
    name: { header: '🙎‍ Name' },
    company: {
      header: '🏢 Company',
      get: row => row.company && row.company.name,
    },
    id: { header: '🆔' },
  })
  await ux.prompt(continuePrompts)

  // Tree && Colors
  // https://github.com/chalk/chalk
  // https://github.com/oclif/cli-ux#clitree
  let tree = ux.tree()
  tree.insert(coloredTreeString())
  COLORS.forEach(color => {
    tree.nodes[Object.keys(tree.nodes)[0]].insert(getColor(color))
  })
  await ux.print(ux.colors.bold.underline('\n⭐ Colors & Tree Structures '))
  await ux.print(
    `\nℹ️  Add colors to customizable text to indicate importance and/or action.\n`,
  )
  await tree.display()

  await ux.prompt(continuePrompts)
  await ux.print(
    `🏁 That's it! All these components can be found within the demo.js folder of the op.\n`,
  )
}

main()
