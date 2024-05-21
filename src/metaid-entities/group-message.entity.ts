const groupMessageSchema = {
  name: 'group-message',
  nodeName: 'SimpleGroupChat',
  versions: [
    {
      version: '1.0.3',
      id: 'a172a0fce1e5',
      body: [{ name: 'groupID' }, { name: 'content' }, { name: 'channelId' }],
    },
  ],
}

export default groupMessageSchema
