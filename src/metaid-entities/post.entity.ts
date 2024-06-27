const groupMessageSchema = {
  name: 'group-message',
  nodeName: 'SimpleGroupChat',
  versions: [
    {
      version: '1.0.3',
      body: [{ name: 'groupID' }, { name: 'content' }, { name: 'channelId' }],
    },
  ],
}

export default groupMessageSchema
