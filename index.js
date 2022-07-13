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

const issuesCollection = MongoHelper.getCollection('issues');
const commentsCollection = MongoHelper.getCollection('comments');
const eventsCollection = MongoHelper.getCollection('events');
const timelineCollection = MongoHelper.getCollection('timeline');

const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
  'sort': 'created',
  'direction': 'desc',
});

const { number: issueCount } = data[0];

// TODO: calculate rate limit if unauthenticated
// 4900 just to make sure it will fit in rate limit
const rateLimitTimeout = 3600/1225;

for(let i = 1; i <= issueCount; i++) {
  try {
    // TODO: fetch diff/patch data
    const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${i}`);
    const { id: issue_id, comments_url, events_url, timeline_url } = data;
    await issuesCollection.insertOne(data);

    const { data: comments_data } = await api.get(comments_url);
    await commentsCollection.insertOne( { issue_id, comments_data });
    
    const { data: events_data } = await api.get(events_url);
    await eventsCollection.insertOne( { issue_id, events_data });
        
    const { data: timeline_data } = await api.get(timeline_url);
    await timelineCollection.insertOne( { issue_id, timeline_data });

    await sleep(rateLimitTimeout * 1000);
  } catch (error) {
    console.error(error);
  }
}

MongoHelper.disconnect();