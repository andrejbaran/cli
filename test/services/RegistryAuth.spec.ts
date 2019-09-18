import { RegistryAuthService } from '~/services/RegistryAuth'
import { FeathersClient } from '~/services/Feathers'
import { UserUnauthorized } from '~/errors/CustomErrors'
import { RegistryCreateResponse } from '~/types'
import { OPS_REGISTRY_HOST } from '~/constants/env'

describe('create', () => {
  it('it should return a one use registry auth credetials', async () => {
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockOpName = 'FAKE_OP_NAME'
    const mockOpVersion = 'FAKE_OP_VERSION'
    const mockPullAccess = true
    const mockPushAccess = true
    const mockRobotAccountName = 'FAKE_ROBOT_ACCOUNT_NAME'
    const mockToken = 'FAKE_TOKEN'
    const mockRobotID = 1234
    const mockFeathersService = new FeathersClient()
    const projectFullName = `${OPS_REGISTRY_HOST}/${mockTeamName}`
    mockFeathersService.create = jest.fn().mockReturnValue({
      data: {
        teamName: mockTeamName,
        robotAccountName: mockRobotAccountName,
        token: mockToken,
        robotID: mockRobotID,
      },
    } as RegistryCreateResponse)

    const registryAuthService = new RegistryAuthService(mockFeathersService)

    const response = await registryAuthService.create(
      mockAccessToken,
      mockTeamName,
      mockOpName,
      mockOpVersion,
      mockPullAccess,
      mockPushAccess,
    )
    expect(mockFeathersService.create).toHaveBeenCalledWith(
      'registry/token',
      {
        teamName: mockTeamName,
        opName: mockOpName,
        opVersion: mockOpVersion,
        pullAccess: mockPushAccess,
        pushAccess: mockPushAccess,
      },
      { headers: { Authorization: mockAccessToken } },
    )
    expect(response).toEqual({
      authconfig: {
        username: mockRobotAccountName,
        password: mockToken,
        serveraddress: `https://${projectFullName}`,
      },
      projectFullName,
      robotID: mockRobotID,
    })
  })

  it('it should throw an error if it was unable to create the registry auth credentials', async () => {
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockRejectedValue(new Error())

    const registryAuthService = new RegistryAuthService(mockFeathersService)
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockOpName = 'FAKE_OP_NAME'
    const mockOpVersion = 'FAKE_OP_VERSION'
    const mockPullAccess = true
    const mockPushAccess = true

    await expect(
      registryAuthService.create(
        mockAccessToken,
        mockTeamName,
        mockOpName,
        mockOpVersion,
        mockPullAccess,
        mockPushAccess,
      ),
    ).rejects.toThrow(new UserUnauthorized(''))
  })
})

describe('delete', () => {
  it('it should resolve successfully after deleting the registry auth credentials', async () => {
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockReturnValue('')

    const registryAuthService = new RegistryAuthService(mockFeathersService)
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockID = 12345
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockOpName = 'FAKE_OP_NAME'
    const mockOpVersion = 'FAKE_OP_VERSION'

    await registryAuthService.delete(
      mockAccessToken,
      mockID,
      mockTeamName,
      mockOpName,
      mockOpVersion,
    )
    expect(mockFeathersService.remove).toHaveBeenCalledWith(
      'registry/token/',
      mockID.toString(),
      {
        query: {
          teamName: mockTeamName,
          opName: mockOpName,
          opVersion: mockOpVersion,
        },
        headers: { Authorization: mockAccessToken },
      },
    )
  })

  it('it should throw an error if it was unable to delete the registry auth credentials', async () => {
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockRejectedValue(new Error())

    const registryAuthService = new RegistryAuthService(mockFeathersService)
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockID = 12345
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockOpName = 'FAKE_OP_NAME'
    const mockOpVersion = 'FAKE_OP_VERSION'

    await expect(
      registryAuthService.delete(
        mockAccessToken,
        mockID,
        mockTeamName,
        mockOpName,
        mockOpVersion,
      ),
    ).rejects.toThrow(new UserUnauthorized(''))
  })
})
