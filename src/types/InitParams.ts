import { OpTypes } from '../constants/opConfig'

export interface InitParams {
  name: string | undefined
  description: string | undefined
  template: OpTypes
  help?: void
}
