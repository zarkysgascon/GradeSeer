const path = require('path')
process.env.NODE_OPTIONS = `--require ${path.join(__dirname, 'suppress-baseline.js')}`
require('next/dist/bin/next')
