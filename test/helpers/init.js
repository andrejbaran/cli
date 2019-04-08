const path = require('path')
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json')
process.env.OPS_CONFIG_DIR = path.resolve(__dirname, '../')
