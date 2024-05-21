import { loadMvc } from './load.js'
import buzzSchema from '@/metaid-entities/buzz.entity.js'

test('run', async () => {
  const Buzz = await loadMvc(buzzSchema)
  expect(Buzz.name).toBe('buzz')
})
