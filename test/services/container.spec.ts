import { ContainerService } from '~/services/Container'
import http = require('http')
import { ux } from '@cto.ai/sdk'
const { white, bold } = ux.colors

describe('ContainerService', () => {
  describe('validatePorts', () => {
    test('should throw if internal ports are duplicated', async () => {
      const containerService = new ContainerService()
      let portMap = ['8448:8383', '8338:8383', '8384:8385']
      await expect(
        containerService.validatePorts(portMap),
      ).rejects.toHaveProperty(
        'message',
        white(
          '🤔 Looks like there are duplicates in the port configuration. Please check your ops.yml configuration and try again.',
        ),
      )
    })

    test('should throw if host ports are duplicated', async () => {
      const containerService = new ContainerService()
      let portMap = ['8448:8383', '8448:8343', '8384:8385']
      await expect(
        containerService.validatePorts(portMap),
      ).rejects.toHaveProperty(
        'message',
        white(
          '🤔 Looks like there are duplicates in the port configuration. Please check your ops.yml configuration and try again.',
        ),
      )
    })

    test('should throw if a host port is already allocated', async () => {
      const containerService = new ContainerService()
      let server1 = http
        .createServer((_, res) => {
          res.write('Hello World!')
          res.end()
        })
        .listen(8384)

      let server2 = http
        .createServer((_, res) => {
          res.write('Hello World!')
          res.end()
        })
        .listen(8448)
      let portMap = ['8448:8383', '8338:8384', '8384:8385']
      try {
        await expect(
          containerService.validatePorts(portMap),
        ).rejects.toHaveProperty(
          'message',
          white(
            `🤔 Looks like port(s) ${ux.colors.bold(
              '8448, 8384',
            )} are already allocated. Please check your ops.yml configuration and try again.`,
          ),
        )
      } finally {
        server1.close()
        server2.close()
      }
    })

    test('should return if everything is fine', async () => {
      const containerService = new ContainerService()
      let portMap = ['8448:8383', '8338:8384', '8384:8385']
      await expect(
        containerService.validatePorts(portMap),
      ).resolves.toBeUndefined()
    })
  })
})
