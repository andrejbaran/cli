import { ContainerService } from '~/services/Container'
import http = require('http')

test('containerService:validatePorts should return error since port not configured', async () => {
  expect.assertions(1)
  const containerService = new ContainerService()
  let portMap = null

  try {
    await containerService.validatePorts(portMap)
  } catch (e) {
    expect(e.message).toBe(
      '🤔 Looks like the port configurations are missing. Please check your ops.yml configuration and try again.',
    )
  }
})

test('containerService:validatePorts should return error since ports are duplicated', async () => {
  expect.assertions(1)
  const containerService = new ContainerService()
  let portMap = ['8448:8383', '8338:8383', '8384:8385']
  try {
    await containerService.validatePorts(portMap)
  } catch (e) {
    expect(e.message).toBe(
      '🤔 Looks like there are duplicates in the port configuration. Please check your ops.yml configuration and try again.',
    )
  }
})

test('containerService:validatePorts should return error since port is already allocated', async () => {
  expect.assertions(1)
  const containerService = new ContainerService()
  let server1 = http
    .createServer((req, res) => {
      res.write('Hello World!')
      res.end()
    })
    .listen(8384)

  let server2 = http
    .createServer((req, res) => {
      res.write('Hello World!')
      res.end()
    })
    .listen(8448)
  let portMap = ['8448:8383', '8338:8384', '8384:8385']
  try {
    await containerService.validatePorts(portMap)
  } catch (e) {
    expect(e.message).toBe(
      '🤔 Looks like port(s) 8448, 8384 are already allocated. Please check your ops.yml configuration and try again.',
    )
  } finally {
    server1.close()
    server2.close()
  }
})
