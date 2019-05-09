/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Wednesday, 1st May 2019 5:20:48 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Wednesday, 1st May 2019 5:27:41 pm
 *
 * DESCRIPTION: Interface for Op Api Response
 *
 * @copyright (c) 2019 Hack Capital
 */

// TODO: Rename file to Op.ts
export interface IOp {
  id: string
  version: string
  name: string
  description: string
  run: string
  teamId: string
  createdAt: string
  updatedAt: string
}
