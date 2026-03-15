import { describe, it } from 'vitest'

// TODO: import recovery functions after Plan 03 creates recovery.ts

describe('Asset priority order (SIM-05)', () => {
  it.todo('db assets are processed before server assets')
  it.todo('server assets are processed before fs assets')
  it.todo('fs assets are processed before ws assets')
})

describe('Data distribution across tape libraries (SIM-06)', () => {
  it.todo('each library receives totalData / libraryCount data')
  it.todo('two libraries each receive half the total data')
})

describe('Uncertainty multiplier scope (SIM-08)', () => {
  it.todo('changing uncertaintyPct changes transfer time but not startup time')
  it.todo('startup time remains 30 minutes regardless of uncertainty setting')
})
