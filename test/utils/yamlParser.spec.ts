import { parseYaml } from '~/utils'
import { IncompleteOpsYml } from '~/errors/CustomErrors'

describe('parseYaml', () => {
  test('should return the default values if an empty manifest is passed', () => {
    expect(parseYaml('')).toEqual({
      ops: [],
      workflows: [],
      version: undefined,
    })
  })

  test('should throw an error if the name of a command is invalid', () => {
    ;[`commands: [{}]`, `commands: [{name: true}]`].forEach(manifest => {
      expect(() => parseYaml(manifest)).toThrow(IncompleteOpsYml)
    })
  })

  test('should throw an error if the description field of a command is invalid', () => {
    ;[
      `commands: [{name: "testOp:0.1.0"}]`,
      `commands: [{name: "testOp:0.1.0", description: true}]`,
    ].forEach(manifest => {
      expect(() => parseYaml(manifest)).toThrow(IncompleteOpsYml)
    })
  })

  test('should throw an error if the public field of a command is invalid', () => {
    ;[
      `commands: [{name: "testOp:0.1.0", description: "this is my op"}]`,
      `commands: [{name: "testOp:0.1.0", description: "this is my op", public: "let's do this"}]`,
    ].forEach(manifest => {
      expect(() => parseYaml(manifest)).toThrow(IncompleteOpsYml)
    })
  })

  test('should throw an error if the run field of a command is invalid', () => {
    ;[
      `commands:
  - name: testOp:0.1.0
    description: this is my op
    public: false`,
      `commands:
  - name: testOp:0.1.0
    description: this is my op
    public: false
    run: true`,
    ].forEach(manifest => {
      expect(() => parseYaml(manifest)).toThrow(IncompleteOpsYml)
    })
  })

  test('should split out the version if present', () => {
    expect(
      parseYaml(`commands:
  - name: testOp:0.2.0
    description: this is my op
    public: false
    run: node /ops/index.js`),
    ).toHaveProperty('ops', [
      {
        name: 'testOp',
        version: '0.2.0',
        description: 'this is my op',
        isPublic: false,
        run: 'node /ops/index.js',
        type: 'command',
      },
    ])
  })

  test('should add a default version if it is missing', () => {
    expect(
      parseYaml(`commands:
  - name: testOp
    description: this is my op
    public: false
    run: node /ops/index.js`),
    ).toHaveProperty('ops', [
      {
        name: 'testOp',
        version: '0.1.0',
        description: 'this is my op',
        isPublic: false,
        run: 'node /ops/index.js',
        type: 'command',
      },
    ])
  })

  test('should combine ops and commands in the final result', () => {
    expect(
      parseYaml(`ops:
  - name: testOp:0.2.0
    description: this is my op
    public: false
    run: node /ops/index.js
commands:
  - name: testCommand:0.3.0
    description: another op
    public: true
    run: node /ops/index-2.js`),
    ).toHaveProperty('ops', [
      {
        name: 'testOp',
        version: '0.2.0',
        description: 'this is my op',
        isPublic: false,
        run: 'node /ops/index.js',
        type: 'command',
      },
      {
        name: 'testCommand',
        version: '0.3.0',
        description: 'another op',
        isPublic: true,
        run: 'node /ops/index-2.js',
        type: 'command',
      },
    ])
  })
})
