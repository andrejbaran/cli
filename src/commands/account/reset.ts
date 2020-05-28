import Command from '~/base'

export default class AccountReset extends Command {
  public static description = 'Reset your password.'

  async run() {
    try {
      const { tokens } = await this.readConfig()
      const isUserSignedIn =
        Boolean(tokens) && this.user && this.team && this.isTokenValid(tokens)

      await this.services.keycloakService.keycloakResetFlow(isUserSignedIn)
      if (isUserSignedIn) {
        await this.services.analytics.track(
          'Ops CLI Reset',
          {
            username: this.user.username,
          },
          this.state.config,
        )
      }
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
