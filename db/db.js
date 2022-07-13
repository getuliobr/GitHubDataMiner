import { MongoClient } from 'mongodb'

export const MongoHelper = {
  async connect (uri) {
    this.client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
  },

  async disconnect () {
    await this.client.close()
  },

  getCollection (name) {
    return this.client.db().collection(name)
  },
}