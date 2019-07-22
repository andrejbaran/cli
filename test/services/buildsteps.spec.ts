import { BuildSteps } from '~/services/BuildSteps'

describe('BuildStep', () => {
  it('should identify an OP steps', () => {
    const buildStepService = new BuildSteps()
    expect(buildStepService.isOpRun('ops run')).toBeTruthy()
  })

  it('should identify an OP steps with mixed casing & spacing', () => {
    const buildStepService = new BuildSteps()
    expect(
      buildStepService.isOpRun('     oPs     run   my-MockOP -param '),
    ).toBeTruthy()
  })

  it('should identify NON op step', () => {
    const buildStepService = new BuildSteps()
    expect(buildStepService.isOpRun("let non-op = 'javascript';")).toBeFalsy()
  })

  it('should identify a Glue Code step', () => {
    const buildStepService = new BuildSteps()
    expect(
      buildStepService.isGlueCode("let non-op = 'javascript';"),
    ).toBeTruthy()
  })

  it('should identify invalid step as NON Glue Code', async () => {
    const buildStepService = new BuildSteps()
    expect(await buildStepService.isGlueCode('')).toBeFalsy()
  })

  it('should identify NON Glue Code', () => {
    const buildStepService = new BuildSteps()
    expect(buildStepService.isOpRun('ops run')).toBeTruthy()
  })
})
