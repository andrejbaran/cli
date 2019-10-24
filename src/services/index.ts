import { OPS_SEGMENT_KEY } from '~/constants/env'
import { FeathersClient } from './Feathers'
import { AnalyticsService } from './Analytics'
import { Publish } from './Publish'
import { BuildSteps } from './BuildSteps'
import { ImageService } from './Image'
import { WorkflowService } from './Workflow'
import { OpService } from './Op'
import { KeycloakService } from './Keycloak'
import { RegistryAuthService } from './RegistryAuth'

export {
  FeathersClient,
  AnalyticsService,
  Publish,
  BuildSteps,
  ImageService,
  WorkflowService,
  OpService,
  KeycloakService,
  RegistryAuthService,
}

export const defaultServicesList = {
  api: new FeathersClient(),
  publishService: new Publish(),
  buildStepService: new BuildSteps(),
  imageService: new ImageService(),
  analytics: new AnalyticsService(OPS_SEGMENT_KEY),
  workflowService: new WorkflowService(),
  opService: new OpService(),
  keycloakService: new KeycloakService(),
  registryAuthService: new RegistryAuthService(),
}
