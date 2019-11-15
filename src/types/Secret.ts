import { Config } from './Config'
import { ApiService } from './ApiService'

export interface SecretListInputs {
  api: ApiService
  config: Config
  secrets: string[]
  selectedSecret: string
}
