/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Thursday, 16th May 2019 10:22:25 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 13th September 2019 1:13:17 pm
 * @copyright (c) 2019 CTO.ai
 */

export { asyncPipe, _trace } from './asyncPipe'
export { validateEmail, validChars, validCharsTeamName } from './validate'
export { onExit } from './onExit'
export { getOpImageTag, getOpUrl } from './getOpUrl'
export { handleMandatory, handleUndefined } from './guards'
export { terminalText } from './terminalText'
export { titleCase, pluralize, appendSuffix } from './stringUtils'
export {
  writeConfig,
  readConfig,
  clearConfig,
  formatConfigObject,
} from './config'
export * from './ports'
