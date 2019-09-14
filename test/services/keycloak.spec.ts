import axios from 'axios'

import { KeycloakService } from '~/services/Keycloak'
import { OpsGrant, Tokens } from '~/types'

jest.mock('axios')

const mockAccessToken = 'test-access-token'
const mockRefreshToken = 'test-refresh-token'
const mockIdToken = 'test-id-token'
const mockSessionState = '11111111-1111-1111-111111111111'

describe('KeycloakService', () => {
  it('_buildStandardFlowParams should build valid query string params', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.CALLBACK_URL = 'test-client'

    const params = keycloakService._buildStandardFlowParams()
    expect(params).toBeTruthy()
  })

  it('_formatGrantToTokens should consume a grant and return a Tokens object', () => {
    const keycloakService = new KeycloakService()

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

  it('getTokenFromPasswordGrant should call the UAA API and return a valid token object', async () => {
    const keycloakService = new KeycloakService()

    const mockUserCredentials = {
      user: 'username',
      password: 'password',
    }
    const mockApiResponse = {
      data: {
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        id_token: mockIdToken,
        session_state: mockSessionState,
      },
    }

    axios.post = jest.fn().mockReturnValue(mockApiResponse)

    const expectedTokenObject: Tokens = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      idToken: mockIdToken,
      sessionState: mockSessionState,
    }

    const result = await keycloakService.getTokenFromPasswordGrant(
      mockUserCredentials,
    )

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expectedTokenObject)
    ;(axios as any).mockClear()
  })

  it('refreshAccessToken should call the UAA API and return a valid token object', async () => {
    const keycloakService = new KeycloakService()

    const newAccessToken = 'test-new-access-token'
    const newRefreshToken = 'test-new-refresh-token'
    const newIdToken = 'test-new-id-token'
    const newSessionState = 'test-new-session-state'

    const mockPreviousConfig = {
      tokens: {
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        idToken: mockIdToken,
        sessionState: mockSessionState,
      },
      team: {
        id: 'test-123',
        name: 'test-abcd',
      },
      user: {
        username: 'test-user',
        email: 'test-email@email.com',
        id: 'test-id-12345',
      },
    }

    const mockApiResponse = {
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        id_token: newIdToken,
        session_state: newSessionState,
      },
    }

    const expectedTokenObject: Tokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      idToken: newIdToken,
      sessionState: mockSessionState,
    }

    axios.post = jest.fn().mockReturnValue(mockApiResponse)

    const result = await keycloakService.refreshAccessToken(
      mockPreviousConfig,
      mockRefreshToken,
    )

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expectedTokenObject)
    ;(axios as any).mockClear()
  })

  it('_buildAuthorizeUrl should build a valid url', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.CALLBACK_URL = 'test-url'
    keycloakService.KEYCLOAK_REALM = 'test-realm'

    const url = keycloakService._buildAuthorizeUrl()
    expect(url).toBeTruthy()
  })

  it('_buildRegisterUrl should build a valid url', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.KEYCLOAK_REALM = 'test-realm'

    const url = keycloakService._buildRegisterUrl()
    expect(url).toBeTruthy()
  })

  it('_buildResetUrl should build a valid url', () => {
    const keycloakService = new KeycloakService()
    keycloakService.CLIENT_ID = 'test-client'
    keycloakService.KEYCLOAK_REALM = 'test-realm'

    const url = keycloakService._buildResetUrl()
    expect(url).toBeTruthy()
  })
})
