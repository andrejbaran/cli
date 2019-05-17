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
  bind: string[]
  createdAt: string
  creatorId: string
  description: string
  env: string[]
  filesystem?: boolean
  help: {
    usage: string
    arguments: { [key: string]: string }
    options: { [key: string]: string }
  }
  id: string
  image: string | void
  name: string
  network?: string
  ownerId?: string
  packagePath?: string | null
  parameters?: IParameters[] | null
  run: string
  src: string[]
  tag: string
  teamID: string
  updatedAt: string
  updaterId: string
  version: string
  workdir?: string
  mountCwd: boolean
  mountHome: boolean
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

export interface IParameters {
  name: string
  shortname: string
  description: string
  default: string
}
