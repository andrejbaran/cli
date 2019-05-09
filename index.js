#!/usr/bin/env node --preserve-symlinks

require('@oclif/command')
  .run()
  .then(require('@oclif/command/flush'))
  .catch(require('@oclif/errors/handle'))
