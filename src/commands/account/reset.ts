import Command from '~/base'

export default class AccountReset extends Command {
  public static description = 'Reset your password.'

  async run() {
    try {
      await this.services.keycloakService.keycloakResetFlow()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
