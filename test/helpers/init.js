const path = require('path')
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json')
process.env.OPS_CONFIG_DIR = path.resolve(__dirname, '../')
process.env.SEGMENT_URL = 'https://api.segment.io'
process.env.OPS_API_HOST = 'http://localhost:3030'
