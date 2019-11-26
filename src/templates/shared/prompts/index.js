const { ux } = require('@cto.ai/sdk')
const { STATES } = require('../constants')

const { white, reset } = ux.colors

const inputPrompts = [
  {
    type: 'input',
    name: 'email',
    message: `\nYou can prompt the user for input ${reset.green('→')}\n${white(
      'Type input here',
    )}`,
  },
  {
    type: 'password',
    name: 'password',
    message: `\nYou can also prompt the user for a password ${reset.green(
      '→',
    )}\n${white('Enter password here')}`,
  },
]

const listPrompt = {
  type: 'list',
  name: 'list',
  message: `\nWhat impact is the incident having ${reset.green('→')}`,
  choices: [
    'All customers are affected.',
    'Large segment of customers are affected.',
    'Small segment of customers are affected.',
    'Site performance degraded for some customers.',
    'Potential issue, but customers are currently unaware.',
    'All customers are affected.',
    'Large segment of customers are affected.',
    'Small segment of customers are affected.',
    'Site performance degraded for some customers.',
    'All customers are affected.',
    'Large segment of customers are affected.',
    'Small segment of customers are affected.',
    'Site performance degraded for some customers.',
  ],
}

const confirmPrompt = {
  type: 'confirm',
  name: 'confirm',
  message: `\nIs the incident closed ${reset.green('→')}\n\n`,
}

const continuePrompt = {
  type: 'input',
  name: 'continue',
  message: `\nPress enter to continue →`,
}

const fuzzySearchPrompt = {
  type: 'autocomplete',
  name: 'autocomplete',
  message: `\nSelect a state to travel from ${reset.green('→')} `,
  autocomplete: STATES,
}

const datePickerPrompt = {
  type: 'datetime',
  name: 'datepicker',
  message: `\nWhen are you going ${reset.green('→')}`,
  variant: 'datetime',
}

module.exports = {
  inputPrompts,
  listPrompt,
  confirmPrompt,
  continuePrompt,
  fuzzySearchPrompt,
  datePickerPrompt,
}
