/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 26th April 2019 4:03:30 pm
 * @lastModifiedBy: Brett Campbell
 * @lastModifiedTime: Fri Apr 26 2019
 * @copyright (c) 2019 CTO.ai
 */

import * as url from 'url'

export const getOpUrl = (registryHost: string, opImageTag: string) => {
  const host = registryHost.replace(/https:\/\//, '')

  return `${host}/${opImageTag}`
}
// opIdentifier is either the op.name for buils or op.id for published ops
export const getOpImageTag = (
  teamName: string,
  opIdentifier: string,
  tag: string = 'latest',
) => {
  return `${teamName}/${opIdentifier}:${tag}`
}
