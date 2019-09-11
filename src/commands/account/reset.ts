import Command from '~/base'

export default class AccountReset extends Command {
  public static description = 'Reset your password.'

  async run() {
    try {
      const { tokens } = await this.readConfig()
      const isUserSignedIn =
        !!tokens && this.user && this.team && this.isTokenValid(tokens)

      await this.services.keycloakService.keycloakResetFlow(isUserSignedIn)
      if (isUserSignedIn) {
        await this.services.analytics.track(
          {
            userId: this.user.email,
            event: 'Ops CLI Reset',
            properties: {
              email: this.user.email,
              username: this.user.username,
            },
          },
          this.accessToken,
        )
      }
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
