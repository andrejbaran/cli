import { KeycloakService } from '~/services/Keycloak'
import { OpsGrant } from '~/types'

describe('KeycloakService', () => {
  it('keycloakService:_buildStandardFlowParams should build valid query string params', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.CALLBACK_URL = 'test-client'

    const params = keycloakService._buildStandardFlowParams()
    expect(params).toBeTruthy()
  })

  it('keycloakService:_formatGrantToTokens should consume a grant and return a Tokens object', () => {
    const keycloakService = new KeycloakService()

    const mockAccessToken = 'test-access-token'
    const mockRefreshToken = 'test-refresh-token'
    const mockIdToken = 'test-id-token'
    const mockSessionState = '11111111-1111-1111-111111111111'

    const mockGrant = {
      access_token: {
        token: mockAccessToken,
        content: { session_state: mockSessionState },
      },
      refresh_token: { token: mockRefreshToken },
      id_token: { token: mockIdToken },
    } as OpsGrant

    const tokens = keycloakService._formatGrantToTokens(mockGrant)
    expect(tokens.accessToken).toEqual(mockAccessToken)
    expect(tokens.refreshToken).toEqual(mockRefreshToken)
    expect(tokens.idToken).toEqual(mockIdToken)
  })

  it('keycloakService:_buildAuthorizeUrl should build a valid url', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.CALLBACK_URL = 'test-url'
    keycloakService.KEYCLOAK_REALM = 'test-realm'

    const url = keycloakService._buildAuthorizeUrl()
    expect(url).toBeTruthy()
  })

  it('keycloakService:_buildRegisterUrl should build a valid url', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.KEYCLOAK_REALM = 'test-realm'

    const url = keycloakService._buildRegisterUrl()
    expect(url).toBeTruthy()
  })

  it('keycloakService:_buildResetUrl should build a valid url', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.KEYCLOAK_REALM = 'test-realm'

    const url = keycloakService._buildResetUrl()
    expect(url).toBeTruthy()
  })

  it('keycloakService:_buildRefreshAccessTokenIfExpiredUrl should build a valid url', () => {
    const keycloakService = new KeycloakService()

    const url = keycloakService._buildRefreshAccessTokenUrl()
    expect(url).toBeTruthy()
  })
})
