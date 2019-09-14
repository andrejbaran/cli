import KeycloakConfig from 'keycloak-connect/middleware/auth-utils/config'
import GrantManager from 'keycloak-connect/middleware/auth-utils/grant-manager'
import { Server } from '@hapi/hapi'
import uuid from 'uuid/v1'
import querystring from 'querystring'
import path from 'path'
import inert from '@hapi/inert'
import open from 'open'
import Debug from 'debug'
import { getFirstActivePort } from '~/utils'
import { ux } from '@cto.ai/sdk'
import axios from 'axios'
import { SSOError } from '~/errors/CustomErrors'
import { UserCredentials, Tokens, OpsGrant, Config } from '~/types'
import { OPS_KEYCLOAK_HOST, OPS_CLIENT_SECRET } from '~/constants/env'
import jwt from 'jsonwebtoken'

const debug = Debug('ops:KeycloakService')

const KEYCLOAK_CONFIG = {
  realm: 'ops',
  'auth-server-url': OPS_KEYCLOAK_HOST,
  'ssl-required': 'external',
  resource: 'ops-cli',
  'public-client': true,
  'confidential-port': 0,
}

/**
 * The token endpoint which provides fresh tokens
 * e.g.
 * http://localhost:8080/auth/realms/ops/protocol/openid-connect/token
 *
 * for more info see: https://uaa.prod-platform.hc.ai/auth/realms/ops/.well-known/openid-configuration
 */
const keycloakTokenEndpoint = `${KEYCLOAK_CONFIG['auth-server-url']}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`

const accountUrl = `${KEYCLOAK_CONFIG['auth-server-url']}/realms/${KEYCLOAK_CONFIG.realm}/account/password`

type KeycloakRefreshTokenInterfaces = {
  access_token: string
  expires_in: string
  refresh_expires_in: string
  refresh_token: string
  token_type: string
  id_token: string
  'not-before-policy': string
  session_state: string
  scope: string
}

export class KeycloakService {
  KEYCLOAK_SIGNIN_FILEPATH = path.join(
    __dirname,
    '../keycloakPages/signinRedirect.html',
  )
  KEYCLOAK_SIGNUP_FILEPATH = path.join(
    __dirname,
    '../keycloakPages/signupRedirect.html',
  )
  KEYCLOAK_ERROR_FILEPATH = path.join(
    __dirname,
    '../keycloakPages/errorRedirect.html',
  )
  KEYCLOAK_REALM = 'ops'
  CALLBACK_HOST = 'localhost'
  CALLBACK_ENDPOINT = 'callback'
  CLIENT_ID = 'ops-cli'
  CONFIDENTIAL_CLIENT_ID = 'ops-cli-confidential'
  CALLBACK_PORT: number | null = null
  CALLBACK_URL: string | null = null
  POSSIBLE_PORTS = [10234, 28751, 38179, 41976, 49164]
  hapiServer: Server = {} as Server

  constructor(
    protected grantManager = new GrantManager(
      new KeycloakConfig(KEYCLOAK_CONFIG),
    ),
  ) {}

  // Needs to be in an `init` function because of the async call to get active port
  async init() {
    const CALLBACK_PORT = await getFirstActivePort(this.POSSIBLE_PORTS)
    if (!CALLBACK_PORT) throw new Error('Cannot find available port')

    this.CALLBACK_PORT = CALLBACK_PORT
    this.hapiServer = new Server({
      port: CALLBACK_PORT,
      host: this.CALLBACK_HOST,
    })
    this.CALLBACK_URL = `http://${this.CALLBACK_HOST}:${CALLBACK_PORT}/${this.CALLBACK_ENDPOINT}`
  }

  /**
   * Generates the required query string params for standard flow
   */
  _buildStandardFlowParams = (): string => {
    const data = {
      client_id: this.CLIENT_ID,
      redirect_uri: this.CALLBACK_URL,
      response_type: 'code',
      scope: 'openid token',
      nonce: uuid(),
      state: uuid(),
    }
    return querystring.stringify(data)
  }

  /**
   * Generates the initial URL with qury string parameters fire of to Keycloak
   * e.g.
   * http://localhost:8080/auth/realms/ops/protocol/openid-connect/auth?
   *  client_id=cli&
   *  redirect_uri=http%3A%2F%2Flocalhost%3A10234%2Fcallback&
   *  response_type=code&
   *  scope=openid%20token&
   *  nonce=12345678-1234-1234 -1234-12345678&
   *  state=12345678-1234-1234-1234-12345678
   */
  _buildAuthorizeUrl = () => {
    const params = this._buildStandardFlowParams()

    return `${KEYCLOAK_CONFIG['auth-server-url']}/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/auth?${params}`
  }

  /**
   * Converts the Keycloak Grant object to Tokens
   */
  _formatGrantToTokens = (grant: OpsGrant): Tokens => {
    if (
      !grant ||
      !grant.access_token ||
      !grant.refresh_token ||
      !grant.id_token ||
      !grant.access_token.content ||
      !grant.access_token.content.session_state
    ) {
      throw new SSOError()
    }

    const accessToken = grant.access_token.token
    const refreshToken = grant.refresh_token.token
    const idToken = grant.id_token.token
    const sessionState = grant.access_token.content.session_state

    if (!accessToken || !refreshToken || !idToken) throw new SSOError()

    return {
      accessToken,
      refreshToken,
      idToken,
      sessionState,
    }
  }

  /**
   * Opens the signin URL and sets up the server for callback
   */
  keycloakSignInFlow = async (): Promise<Tokens> => {
    open(this._buildAuthorizeUrl())
    const grant = await this._setupCallbackServerForGrant('signin')
    return this._formatGrantToTokens(grant)
  }

  /**
   * Generates the initial URL with qury string parameters fire of to Keycloak
   * e.g.
   *   http://localhost:8080/auth/realms/ops/protocol/openid-connect/registrations?
   *     client_id=www-dev
   *     response_type=code
   */
  _buildRegisterUrl = () => {
    const params = this._buildStandardFlowParams()

    return `${KEYCLOAK_CONFIG['auth-server-url']}/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/registrations?${params}`
  }

  /**
   * Opens the signup link in the browser, and listen for it's response
   */
  keycloakSignUpFlow = async (): Promise<Tokens> => {
    const registerUrl = this._buildRegisterUrl()
    open(registerUrl)

    console.log(
      `\n💻  Please follow the prompts in the browser window and verify your email address before logging in`,
    )
    console.log(
      `\n If the link doesn't open, please click the following URL ${ux.colors.dim(
        registerUrl,
      )} \n\n`,
    )

    const grant = await this._setupCallbackServerForGrant('signup')
    return this._formatGrantToTokens(grant)
  }

  /**
   * Generates the initial URL with query string parameters fired off to Keycloak
   * e.g.
   * http://localhost:8080/auth/realms/ops/login-actions/reset-credentials?client_id=cli
   */
  _buildResetUrl = () => {
    const data = {
      client_id: this.CLIENT_ID,
    }
    const params = querystring.stringify(data)

    return `${KEYCLOAK_CONFIG['auth-server-url']}/realms/${this.KEYCLOAK_REALM}/login-actions/reset-credentials?${params}`
  }

  keycloakResetFlow = (isUserSignedIn: boolean) => {
    // open up account page if the user is signed in otherwise open up password reset page
    const url = isUserSignedIn ? accountUrl : this._buildResetUrl()
    open(url)
    console.log(`\n💻  Please follow the prompts in the browser window`)
    console.log(
      `\n If the link doesn't open, please click the following URL: ${ux.colors.dim(
        url,
      )} \n\n`,
    )
  }

  /*
   * this is necessary because we have two clients and one is confidential. Only
   * the confidential client requires a client secret.
   */
  includeClientSecret = (clientName: string) => {
    return clientName === this.CLIENT_ID
      ? {}
      : {
          client_secret: OPS_CLIENT_SECRET,
        }
  }

  refreshAccessToken = async (
    oldConfig: Config,
    refreshToken: string,
  ): Promise<Tokens> => {
    try {
      const decodedToken = jwt.decode(refreshToken)
      /*
       * the refresh token contains the client ID (azp). There are two possible
       * clients, ops-cli-confidential or ops-cli. The client ID in the request params
       * has to match the client ID embedded in the token.
       */
      const clientName: string =
        decodedToken && decodedToken.azp ? decodedToken.azp : this.CLIENT_ID

      /**
       * This endpoint expects a x-form-url-encoded header, not JSON
       */
      const refreshData = querystring.stringify({
        grant_type: 'refresh_token',
        client_id: clientName,
        refresh_token: refreshToken,
        ...this.includeClientSecret(clientName),
      })

      const {
        data,
      }: { data: KeycloakRefreshTokenInterfaces } = await axios.post(
        keycloakTokenEndpoint,
        refreshData,
      )

      if (!data.access_token || !data.refresh_token || !data.id_token)
        throw new SSOError('There are UAA tokens missing.')

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        sessionState: oldConfig.tokens.sessionState,
      }
    } catch (error) {
      debug('%O', error)
      // console.log({ error })
      throw new SSOError()
    }
  }

  getTokenFromPasswordGrant = async ({
    user,
    password,
  }: Pick<UserCredentials, 'user' | 'password'>): Promise<Tokens> => {
    try {
      /**
       * This endpoint expects a x-form-url-encoded header, not JSON
       */
      debug('getting token from password grant')

      const postBody = querystring.stringify({
        grant_type: 'password',
        client_id: this.CONFIDENTIAL_CLIENT_ID,
        client_secret: OPS_CLIENT_SECRET,
        username: user,
        password,
        scope: 'openid',
      })

      const {
        data,
      }: { data: KeycloakRefreshTokenInterfaces } = await axios.post(
        keycloakTokenEndpoint,
        postBody,
      )

      if (
        !data.access_token ||
        !data.refresh_token ||
        !data.id_token ||
        !data.session_state
      )
        throw new SSOError('There are UAA tokens missing.')

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        sessionState: data.session_state,
      }
    } catch (error) {
      debug('%O', error)
      throw new SSOError()
    }
  }

  /**
   * Spins up a hapi server, that listens to the callback from Keycloak
   * Once it receive a response, the promise is fulfilled and data is returned
   */
  _setupCallbackServerForGrant = async (caller): Promise<OpsGrant> => {
    let redirectFilePath =
      caller === 'signin'
        ? this.KEYCLOAK_SIGNIN_FILEPATH
        : this.KEYCLOAK_SIGNUP_FILEPATH
    return new Promise(async (resolve, reject) => {
      try {
        let responsePayload: OpsGrant

        await this.hapiServer.register(inert) // To read from a HTML file and return it
        this.hapiServer.route({
          method: 'GET',
          path: `/${this.CALLBACK_ENDPOINT}`,
          handler: async (req, reply) => {
            try {
              if (req.query.code) {
                await this.grantManager
                  .obtainFromCode(
                    /**
                     * The following code is a hack to get the authentication token
                     * to authorization token excahnge working.
                     *
                     * Keycloak expects a redirect_uri to be exactly the same
                     * as the redirect_uri found when obtaining the authentication
                     * token in the first place, but the keycloak_connect package
                     * expects the variable to be stored in a specific way, as such:
                     *
                     * node_modules/keycloak-connect/middleware/auth-utils/grant-manager.js Line 98
                     */
                    {
                      session: {
                        auth_redirect_uri: this.CALLBACK_URL,
                      },
                    },
                    req.query.code,
                  )
                  .then((res: OpsGrant) => {
                    responsePayload = res
                  })
              } else {
                redirectFilePath = this.KEYCLOAK_ERROR_FILEPATH
              }
              // Sends the HTML that contains code to close the tab automatically
              return reply.file(redirectFilePath, {
                confine: false,
              })
            } catch (err) {
              debug('%O', err)
              reject(err)
            } finally {
              if (responsePayload) {
                this.hapiServer.stop()
                resolve(responsePayload)
              } else {
                ux.spinner.stop('failed')
                this.hapiServer.stop()
              }
            }
          },
        })

        /**
         * Starts the server and opens the login url
         */
        await this.hapiServer.start()
      } catch (err) {
        debug('%O', err)
        reject(err)
      }
    })
  }

  /**
   * Returns the URL used to invalidate the current user's session
   */
  buildInvalidateSessionUrl = (): string => {
    return `${OPS_KEYCLOAK_HOST}/realms/ops/protocol/openid-connect/logout`
  }

  /**
   * Returns the necessary headers to invalidate the session
   */
  buildInvalidateSessionHeaders = (
    sessionState: string,
    accessToken: string,
  ): { Cookie: string } => {
    return {
      Cookie: `$KEYCLOAK_SESSION=ops/${sessionState}; KEYCLOAK_IDENTITY=${accessToken}`,
    }
  }
}
