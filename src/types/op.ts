/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Thursday, 4th April 2019 2:15:49 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Thursday, 4th April 2019 2:16:00 pm
 *
 * DESCRIPTION
 *
 */

export interface Op {
  id: string,
  version: string,
  name: string,
  description: string,
  filesystem: boolean,
  run: string,
  packagePath: string | null,
  creatorId: string,
  ownerId: string,
  createdAt: string,
  updatedAt: string,
  updaterId: string,
  envVariables: string[] | null,
  parameters: Parameters[] | null,
  tag: string,
  src: string[],
  owner: any,
  _id: any
}

interface Parameters {
  name: string,
  shortname: string,
  description: string,
  default: string
}

export default Op
