import type { EntitySchema } from './entity.js'

const buzzSchema: EntitySchema = {
  name: 'buzz',
  nodeName: 'simplebuzz',
  path: '/protocols/simplebuzz',
  versions: [
    {
      version: 1,
      body: [
        {
          name: 'content',
          type: 'string',
        },
        {
          name: 'contentType',
          type: 'string',
        },
        {
          name: 'quotePin',
          type: 'string',
        },
        {
          name: 'attachments',
          type: 'array',
        },
      ],
    },
  ],
}

export default buzzSchema
