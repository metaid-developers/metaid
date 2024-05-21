import type { EntitySchema } from './entity.js'

const buzzSchema: EntitySchema = {
  name: 'metaprotocols',
  nodeName: 'metaprotocols',
  path: '/protocols/metaprotocols',
  versions: [
    {
      version: 1,
      id: 'b17e9e277bd7',
      body: [
        {
          name: 'protocolTitle',
          type: 'string',
        },
        {
          name: 'protocolAuthor',
          type: 'string',
        },
        {
          name: 'protocolVersion',
          type: 'string',
        },
        {
          name: 'protocolName',
          type: 'string',
        },
        {
          name: 'protocolHASHID',
          type: 'string',
        },
        {
          name: 'protocolType',
          type: 'string',
        },
        {
          name: 'protocolEncoding',
          type: 'string',
        },
        {
          name: 'protocolIntroduction',
          type: 'string',
        },
        {
          name: 'protocolIntroductionType',
          type: 'string',
        },
        {
          name: 'protocolContent',
          type: 'string',
        },
        {
          name: 'protocolContentType',
          type: 'string',
        },
        {
          name: 'protocolDescription',
          type: 'string',
        },
        {
          name: 'protocolDescriptionType',
          type: 'string',
        },
        {
          name: 'protocolAttachments',
          type: 'array',
        },
        {
          name: 'relatedProtocols',
          type: 'array',
        },
        {
          name: 'tags',
          type: 'array',
        },
      ],
    },
  ],
}

export default buzzSchema
