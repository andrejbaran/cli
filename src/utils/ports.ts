import isPortReachable from 'is-port-reachable'

/**
 * Takes in an array of numbers, and returns the first one ith available port.
 * If no ports are available, return null
 */
export const getFirstActivePort = async (
  ports: number[],
): Promise<number | null> => {
  for (let i = 0; i < ports.length; i++) {
    const currentPort = ports[i]
    if (typeof currentPort !== 'number') return null
    if (!(await isPortReachable(currentPort))) {
      return currentPort
    }
  }
  return null
}
