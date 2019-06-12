import { ux } from '@cto.ai/sdk'
import commander from 'commander'
import Command from '~/base'
import { Question } from '~/types'
import {
  validateCpassword,
  validateEmail,
  validatePasswordFormat,
} from '~/utils/validate'

const checkEmail = (input: string) => {
  return (
    validateEmail(input) ||
    '🤔 That email format is invalid. Please check your email and try again.'
  )
}

const emailPrompt: Question = {
  type: 'input',
  name: 'email',
  message: 'Enter an email address to reset your password: ',
  validate: checkEmail,
}

const passwordPrompts: Question[] = [
  {
    type: 'password',
    name: 'password',
    message: 'Enter a new password: ',
    validate: validatePasswordFormat,
    mask: '*',
  },
  {
    type: 'password',
    name: 'passwordConfirm',
    message: 'Confirm your password: ',
    validate: validateCpassword,
    mask: '*',
  },
]

const tokenErr = {
  consumed: 'Token already used',
  expired: 'Token already expired',
  postMessage: `Please request a new token by running ${ux.colors.italic.dim(
    'ops account:reset.',
  )}`,
}

export default class AccountReset extends Command {
  static description = 'Reset your password.'

  startSpinner() {
    this.log('')
    ux.spinner.start(`${ux.colors.white('Working on it')}`)
  }

  async run() {
    const {
      args: [_, token],
    } = commander.parse(process.argv)

    if (!token) {
      const { email } = await ux.prompt<{ email: string }>(emailPrompt)
      this.startSpinner()
      const res = await this.createToken(email)

      if (res.data) {
        ux.spinner.stop(`${ux.colors.green('Done!\n')}`)
        this.log(`Go to ${ux.colors.italic.dim(email)} to reset your password.`)
        process.exit()
      }

      ux.spinner.stop('❗️\n')
      this.log(
        `Uh-oh, we couldn't find any user associated with that email address.\nCheck your email and try again.\n`,
      )
      return this.run()
    }

    const { password } = await ux.prompt<{ password: string }>(passwordPrompts)
    this.startSpinner()
    const res = await this.resetPassword(token, password)

    if (res.data) {
      ux.spinner.stop(`${ux.colors.green('Done!\n')}`)
      this.log(
        `${ux.colors.bold.green(
          '✓',
        )} Password reset successful.\n\nTo continue, please sign in by running ${ux.colors.italic.dim(
          'ops account:signin',
        )}.`,
      )
      process.exit()
    }

    ux.spinner.stop('❗️\n')

    if (res.message) {
      switch (true) {
        case res.message.includes(tokenErr.consumed):
          return this.log(`${tokenErr.consumed}. ${tokenErr.postMessage}`)
        case res.message.includes(tokenErr.expired):
          return this.log(`${tokenErr.expired}. ${tokenErr.postMessage}`)
      }
    }

    this.log(`Sorry, we're unable to complete your request at this time.`)
    process.exit(1)
  }
}
