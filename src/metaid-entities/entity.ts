export type EntitySchema = {
  name: string
  nodeName: string
  path: string
  versions: {
    version: number
    id: string
    body: any[]
  }[]
}
