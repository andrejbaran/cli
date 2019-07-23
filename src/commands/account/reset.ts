import { ux } from '@cto.ai/sdk'
import Command from '~/base'
import { asyncPipe } from '~/utils'
import {
  NoEmailForReset,
  APIError,
  ResetTokenError,
} from '~/errors/CustomErrors'
import {
  validateCpassword,
  validateEmail,
  validatePasswordFormat,
} from '~/utils/validate'

export interface ResetInputs {
  password: string
  token: string
}

export default class AccountReset extends Command {
  public static description = 'Reset your password.'

  static args = [
    {
      name: 'token',
      description: 'Reset password token.',
    },
  ]

  emailPrompt = async (): Promise<string> => {
    const { email } = await ux.prompt<{ email: string }>({
      type: 'input',
      name: 'email',
      message: 'Enter an email address to reset your password: ',
      validate: (input: string) => {
        return (
          validateEmail(input) ||
          '🤔 That email format is invalid. Please check your email and try again.'
        )
      },
    })
    return email
  }

  createToken = async (email: string): Promise<string> => {
    try {
      const { data } = await this.api.create('reset', { email })
      if (!data) {
        throw new NoEmailForReset(null)
      }
      return email
    } catch (err) {
      this.debug('%O', err)
      throw new NoEmailForReset(err)
    }
  }

  startSpinner = (input: string | ResetInputs): string | ResetInputs => {
    this.log('')
    ux.spinner.start(`${ux.colors.white('Working on it')}`)
    return input
  }

  logEmailMessage = (email: string): void => {
    ux.spinner.stop(`${ux.colors.green('Done!\n')}`)
    this.log(
      `Go to ${ux.colors.italic.dim(
        email,
      )} to retrieve your password reset token.`,
    )
    process.exit()
  }

  passwordPrompt = async (token: string): Promise<ResetInputs> => {
    const { password } = await ux.prompt<{ password: string }>([
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
    ])
    return { password, token }
  }

  resetPassword = async (inputs: ResetInputs): Promise<ResetInputs> => {
    try {
      const { token, password } = inputs
      await this.api.patch('reset', token, {
        password,
      })
      return inputs
    } catch (err) {
      if (!err.error) {
        throw new APIError(err)
      }
      const { message } = err.error[0]
      const consumed = 'Token already used'
      const expired = 'Token already expired'
      this.debug('%O:', err)
      switch (true) {
        case message.includes(consumed):
          throw new ResetTokenError(consumed)
        case message.includes(expired):
          throw new ResetTokenError(expired)
        default:
          throw new APIError(err)
      }
    }
  }

  logResetMessage = (inputs: ResetInputs): void => {
    ux.spinner.stop(`${ux.colors.green('Done!\n')}`)
    this.log(
      `${ux.colors.bold.green(
        '✓',
      )} Password reset successful.\n\nTo continue, please sign in by running ${ux.colors.italic.dim(
        'ops account:signin',
      )}.`,
    )
  }

  async run() {
    try {
      const {
        args: { token },
      } = this.parse(AccountReset)
      if (!token) {
        const resetPipeline = asyncPipe(
          this.emailPrompt,
          this.startSpinner,
          this.createToken,
          this.logEmailMessage,
        )
        await resetPipeline()
      } else {
        const resetPipeline = asyncPipe(
          this.passwordPrompt,
          this.startSpinner,
          this.resetPassword,
          this.logResetMessage,
        )
        await resetPipeline(token)
      }
    } catch (err) {
      ux.spinner.stop(`${ux.colors.errorRed('Failed!')}`)
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
