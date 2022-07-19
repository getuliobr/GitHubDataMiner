import dotenv from 'dotenv';
import api from './api.js';
import fs from 'fs/promises';
import { MongoHelper } from './db/db.js'

// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep?page=1&tab=scoredesc#tab-top
const sleep = ms => new Promise(r => setTimeout(r, ms));

dotenv.config();
const { MONGO_URI, REPO_OWNER, REPO_NAME, FETCH_PATCH } = process.env;

try {
  await MongoHelper.connect(MONGO_URI);
} catch (error) {
  console.error('Couldnt connect to db:', error);
}

const issuesCollection = MongoHelper.getCollection('issues');
const commentsCollection = MongoHelper.getCollection('comments');
const eventsCollection = MongoHelper.getCollection('events');
const timelineCollection = MongoHelper.getCollection('timeline');
const pullCollection = MongoHelper.getCollection('pullrequest');

const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
  'sort': 'created',
  'direction': 'desc',
});

const { number: issueCount } = data[0];

// TODO: calculate rate limit if unauthenticated
// 5000 actual rate limit, 4900 just to make sure it works

const rateLimitPerRequestTimeout = 3600/4900;

for(let i = 1; i <= issueCount; i++) {
  try {
    console.log(`Fetching issue ${i} from ${REPO_OWNER}/${REPO_NAME}`);

    const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${i}`);
    const { id: issue_id, comments_url, events_url, timeline_url, pull_request } = data;
    await issuesCollection.insertOne({ issue_id, 'issue_data': data });

    const { data: comments_data } = await api.get(comments_url);
    await commentsCollection.insertOne({ issue_id, comments_data });
    
    const { data: events_data } = await api.get(events_url);
    await eventsCollection.insertOne({ issue_id, events_data });
        
    const { data: timeline_data } = await api.get(timeline_url);
    await timelineCollection.insertOne({ issue_id, timeline_data });

    await sleep(4 * rateLimitPerRequestTimeout);

    if(!pull_request) continue;

    const { url: pull_url, patch_url } = pull_request;

    const { data: pr_data } = await api.get(pull_url);
    await pullCollection.insertOne({ issue_id, pr_data });

    if(FETCH_PATCH === 'true') {
      const { data: patch_data } = await api.get(patch_url);

      await fs.writeFile(`./patch/${issue_id}.patch`, patch_data, { flag: 'w+' });
    }

    await sleep(rateLimitPerRequestTimeout);
  } catch (error) {
    console.error(`Got an error while fetching issue ${i}, message: ${error.message}`);
  }
}

MongoHelper.disconnect();