export const OPS_API_HOST = process.env.OPS_API_HOST || 'https://cto.ai/'

export const OPS_API_PATH = process.env.OPS_API_PATH || 'api/v1'

export const OPS_SEGMENT_KEY =
  process.env.OPS_SEGMENT_KEY || 'kskyrGqdnuvMZCE0V2kMrzS9Gfrl8J0y'

export const OPS_REGISTRY_HOST: string =
  process.env.OPS_REGISTRY_HOST || 'registry.cto.ai'

export const OPS_KEYCLOAK_HOST: string =
  process.env.OPS_KEYCLOAK_HOST || 'https://cto.ai/auth'

export const NODE_ENV = process.env.NODE_ENV || 'production'

export const DEBUG = process.env.DEBUG

export const OPS_DEBUG = Boolean(process.env.OPS_DEBUG)

export const HOME = process.env.HOME || '~'

export const INTERCOM_EMAIL = process.env.INTERCOM_EMAIL || 'support@cto.ai'

export const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock'

export const SEGMENT_URL = process.env.SEGMENT_URL || 'https://api.segment.io'

export const OPS_CLIENT_SECRET = process.env.OPS_CLIENT_SECRET || ''
