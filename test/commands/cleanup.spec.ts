import { FeathersClient } from '~/services/Feathers'
import { formImageName, getOps } from './../../src/commands/cleanup'

jest.mock('./../../src/services/Feathers')

describe('cleanup', () => {
  const opName = 'test-op'
  const teamId = 'test-id'
  const teamName = 'test-name'
  const accessToken = 'test-token'

  test('formImageName forms the image name correctly', () => {
    const registryHost = 'registry-host'
    const imageName = formImageName(opName, teamName, registryHost)
    expect(imageName).toBe('registry-host/test-name/test-op')
  })

  test('getOps makes api call correctly', async () => {
    const api = new FeathersClient()
    await getOps(opName, teamId, accessToken, api)
    expect(api.find).toHaveBeenCalledTimes(1)
    expect(api.find).toHaveBeenCalledWith('/private/ops', {
      query: {
        name: opName,
        team_id: teamId,
      },
      headers: {
        Authorization: accessToken,
      },
    })
  })

  // TODO: implement removeImage once the docker service is abstracted out
  // TODO: implement run command test once we figure out how to do that
})
