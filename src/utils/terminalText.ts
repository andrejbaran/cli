import { ux } from '@cto.ai/sdk'

const { callOutCyan, successGreen } = ux.colors

export const terminalText = (text: string) => {
  return `${successGreen('$')} ${callOutCyan(text)}`
}
