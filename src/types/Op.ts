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
  id: string
  version: string
  name: string
  description: string
  filesystem: boolean
  run: string
  packagePath: string | null
  creatorId: string
  ownerId: string
  createdAt: string
  updatedAt: string
  updaterId: string
  envVariables: string[] | null
  parameters: Parameters[] | null
  tag: string
  src: string[]
  teamID: string
  help: {
    usage: string
    arguments: { [key: string]: string }
    options: { [key: string]: string }
  }
}

// response from ops/get
// { id: 'b8bc6a05-5bba-4db0-9cbf-ce370b311833',
//      version: 'v1',
//      name: 'test-create',
//      description: 'testing',
//      run: 'test',
//      teamID: '9e211160-a4f7-4306-a45a-aba911cb830d',
//      createdAt: '2019-04-26T10:54:39.572834Z',
//      updatedAt: '2019-04-26T10:54:39.572834Z' }

interface Parameters {
  name: string
  shortname: string
  description: string
  default: string
}
