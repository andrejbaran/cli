import { Grant } from 'keycloak-connect'

export type OpsGrant = Grant & {
  access_token: {
    content: {
      session_state: string
    }
  }
}
