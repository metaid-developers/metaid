const simpleDonateSchema = {
  name: 'simpledonate',
  path: '/protocols/simpledonate',
  versions: [
    {
      version: 1,
      body: [
        {
          name: 'createTime',
          type: 'string',
        },
        {
          name: 'to',
          type: 'string',
        },
        {
          name: 'coinType',
          type: 'string',
        },
        {
          name: 'amount',
          type: 'string',
        },
        {
          name: 'toPin',
          type: 'string',
        },
        {
          name: 'message',
          type: 'string',
        },
      ],
    },
  ],
}

export default simpleDonateSchema
