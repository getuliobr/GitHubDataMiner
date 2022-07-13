import dotenv from "dotenv";
import api from './api.js';
import { MongoHelper } from './db/db.js'

// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep?page=1&tab=scoredesc#tab-top
const sleep = ms => new Promise(r => setTimeout(r, ms));

dotenv.config();
const { MONGOURI, REPO_OWNER, REPO_NAME } = process.env;

try {
  await MongoHelper.connect(MONGOURI);
} catch (error) {
  console.error('Couldnt connect to db:', error);
}

const issuesCollection = MongoHelper.getCollection('issues')

const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
  'sort': 'created',
  'direction': 'desc',
});

const { number: issueCount } = data[0];

// TODO: calculate rate limit if unauthenticated
// 4900 just to make sure it will fit in rate limit
const rateLimitTimeout = 3600/4900;

for(let i = 1; i <= issueCount; i++) {
  try {
    // TODO: fetch comments, timeline and diff/patch data
    const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${i}`);
    await issuesCollection.insertOne(data);
    await sleep(rateLimitTimeout * 1000);
  } catch (error) {
    console.error(error);
  }
}

MongoHelper.disconnect();