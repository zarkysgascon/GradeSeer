const w = console.warn
const l = console.log
const e = process.emitWarning
const r = console.error
const sw = process.stdout.write.bind(process.stdout)
const ew = process.stderr.write.bind(process.stderr)
const f = (m) => typeof m === 'string' && m.includes('[baseline-browser-mapping]')
console.warn = (...a) => { if (f(a[0])) return; w(...a) }
console.log = (...a) => { if (f(a[0])) return; l(...a) }
process.emitWarning = (...a) => { if (f(a[0])) return; e(...a) }
console.error = (...a) => { if (f(a[0])) return; r(...a) }
process.stdout.write = (chunk, encoding, cb) => {
  if (typeof chunk === 'string' && f(chunk)) return true
  return sw(chunk, encoding, cb)
}
process.stderr.write = (chunk, encoding, cb) => {
  if (typeof chunk === 'string' && f(chunk)) return true
  return ew(chunk, encoding, cb)
}
