import dotenv from "dotenv";
import api from './api.js';
import { MongoHelper } from './db/db.js'

dotenv.config();
const { MONGOURI, REPO_OWNER, REPO_NAME } = process.env;

try {
  await MongoHelper.connect(MONGOURI);
} catch (error) {
  console.error('Couldnt connect to db:', error);
}

const issuesCollection = MongoHelper.getCollection('issues')
const params = {
  'q': `repo:${REPO_OWNER}/${REPO_NAME}`,
  'per_page': 100,
  'page': 1,
}

const { data } = await api.get('/search/issues', { params });
const { total_count: totalCount, items } = data;

const pageCount = Math.ceil(totalCount/100);
const promiseArr = [issuesCollection.insertMany(items)];

for(let i = 2; i <= pageCount; i++) {
  params.page = i;

  const { data } = await api.get('/search/issues', { params });
  const { total_count, items } = data;

  const promiseArr = [issuesCollection.insertMany(items)];
}

try {
  await Promise.all(promiseArr);
} catch (error) {
  console.error("err:", error);
}

MongoHelper.disconnect();