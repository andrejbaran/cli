import Command from '~/base'

export default class AccountReset extends Command {
  public static description = 'Reset your password.'

  async run() {
    try {
      const { tokens } = await this.readConfig()
      const isUserSignedIn =
        !!tokens && this.user && this.team && this.isTokenValid(tokens)

      await this.services.keycloakService.keycloakResetFlow(isUserSignedIn)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
