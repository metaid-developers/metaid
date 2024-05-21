import { useMvc } from './use.js'

test('run', async () => {
  const Buzz = await useMvc('buzz')
  expect(Buzz.name).toBe('buzz')
})

test('can useMvc entity with multi-word name', async () => {
  const Metaid = await useMvc('metaid-root')
  expect(Metaid.name).toBe('metaid')
})

test.todo('can load entity schema from nested folders')
