/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 2:54:44 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 9th September 2019 12:15:02 pm
 * @copyright (c) 2019 CTO.ai
 */

export const defaultApiHost = 'https://cto.ai/'

export const OPS_API_HOST = process.env.OPS_API_HOST || defaultApiHost

export const OPS_API_PATH = process.env.OPS_API_PATH || 'api/v1'

export const OPS_SEGMENT_KEY =
  process.env.OPS_SEGMENT_KEY || 'sRsuG18Rh9IHgr9bK7GsrB7BfLfNmhCG'

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

export const OPS_CLIENT_SECRET =
  process.env.OPS_CLIENT_SECRET || '860d0973-dd17-423f-823c-34c2a661976f'
