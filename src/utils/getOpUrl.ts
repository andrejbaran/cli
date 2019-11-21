/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 26th April 2019 4:03:30 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 29th April 2019 9:59:13 am
 * @copyright (c) 2019 CTO.ai
 */

export const PUBLIC_OPS_PREFIX = 'public.'

export const getOpUrl = (registryHost: string, opImageTag: string) => {
  const host = registryHost.replace(/https:\/\//, '')

  return `${host}/${opImageTag}`
}
// opIdentifier is either the op.name for buils or op.id for published ops
export const getOpImageTag = (
  teamName: string,
  opIdentifier: string,
  tag: string,
  isPublic: boolean = false,
) => {
  return `${
    isPublic ? PUBLIC_OPS_PREFIX : ''
  }${teamName}/${opIdentifier}:${tag}`
}
