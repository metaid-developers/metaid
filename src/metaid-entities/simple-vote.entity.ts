import type { EntitySchema } from './entity.js'

const simpleVoteSchema: EntitySchema = {
  name: 'simple-vote',
  nodeName: 'SimpleVote',
  path: '/protocols/simple-vote',
  versions: [
    {
      version: 1,
      body: [
        {
          name: 'symbol',
          type: 'string',
        },
        {
          name: 'voteTo',
          type: 'array',
        },
        { name: 'voteToOptionIdxs', type: 'array' },
        { name: 'voteComment', type: 'string' },
        { name: 'digest', type: 'any' },
        { name: 'signatures', type: 'any' },
        { name: 'voteTime', type: 'any' },
      ],
    },
  ],
}

export default simpleVoteSchema

// [NodeName.SimpleVote]: {
//   brfcId: '206cbf182ee1',
//   path: '/Protocols/SimpleVote',
//   version: '1.0.1',
// },
