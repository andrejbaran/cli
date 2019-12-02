import { ApiService } from '.'
import { Publish } from '~/services/Publish'
import { BuildSteps } from '~/services/BuildSteps'
import { ImageService } from '~/services/Image'
import { AnalyticsService } from '~/services/Analytics'
import { WorkflowService } from '~/services/Workflow'
import { OpService } from '~/services/Op'
import { KeycloakService } from '~/services/Keycloak'
import { RegistryAuthService } from 'services/RegistryAuth'
import { SecretService } from '~/services/Secret'

export type Services = {
  api: ApiService
  publishService: Publish
  buildStepService: BuildSteps
  imageService: ImageService
  analytics: AnalyticsService
  workflowService: WorkflowService
  opService: OpService
  keycloakService: KeycloakService
  registryAuthService: RegistryAuthService
  secretService: SecretService
}
