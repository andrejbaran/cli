/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Wednesday, 3rd April 2019 11:06:39 am
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Wednesday, 3rd April 2019 11:06:39 am
 *
 * DESCRIPTION
 *
 */

import { OpCommand, OpWorkflow } from './OpsYml'

export interface Fuzzy {
  original: {
    value: OpCommand | OpWorkflow
    name: string
  }
}
