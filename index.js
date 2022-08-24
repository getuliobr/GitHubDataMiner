import dotenv from 'dotenv';
import api from './api.js';
import fs from 'fs/promises';
import { MongoHelper } from './db.js'

// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep?page=1&tab=scoredesc#tab-top
const sleep = s => new Promise(r => setTimeout(r, s * 1000));

dotenv.config();
const { MONGO_URI, REPO_OWNER, REPO_NAME, FETCH_PATCH } = process.env;

try {
  await MongoHelper.connect(MONGO_URI);
} catch (error) {
  console.log('Couldnt connect to db:', error);
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

console.log(`Total issue count: ${issueCount}`);

// TODO: calculate rate limit if unauthenticated
// 5000 actual rate limit, 4900 just to make sure it works

const rateLimitPerRequestTimeout = 3600/4900;

for(let i = 9019; i <= issueCount; i++) {
  console.log(`Fetching issue ${i} from ${REPO_OWNER}/${REPO_NAME}`);
  let issue_data, issue_id;
  try {
    await sleep(rateLimitPerRequestTimeout);
    const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${i}`);
    issue_data = data;
    issue_id = data.id;
    await issuesCollection.updateOne({ issue_id }, { $set: { issue_id, issue_data }}, { upsert: true });
  } catch (error) {
    console.log(`Got an error while fetching issue ${i}, message: ${error.message}`);
    continue;
  }

  const { comments_url, events_url, timeline_url, pull_request } = issue_data;

  try {
    await sleep(rateLimitPerRequestTimeout);
    const { data: comments_data } = await api.get(comments_url);
    await commentsCollection.updateOne({ issue_id }, { $set: { issue_id, comments_data }}, { upsert: true });
  } catch (error) {
    console.log(`Got an error while fetching issue comments ${i}, message: ${error.message}`);
  }

  try {
    await sleep(rateLimitPerRequestTimeout);
    const { data: events_data } = await api.get(events_url);
    await eventsCollection.updateOne({ issue_id }, { $set: { issue_id, events_data }}, { upsert: true });
  } catch (error) {
    console.log(`Got an error while fetching issue events ${i}, message: ${error.message}`);
  }
  
  try {
    await sleep(rateLimitPerRequestTimeout);
    const { data: timeline_data } = await api.get(timeline_url);
    await timelineCollection.updateOne({ issue_id }, { $set: { issue_id, timeline_data }}, { upsert: true });
  } catch (error) {
    console.log(`Got an error while fetching issue timeline ${i}, message: ${error.message}`);
  }

  if(!pull_request) continue;

  const { url: pull_url, patch_url } = pull_request;

  try {
    await sleep(rateLimitPerRequestTimeout);
    const { data: pr_data } = await api.get(pull_url);
    await pullCollection.updateOne({ issue_id }, { $set: { issue_id, pr_data }}, { upsert: true });
  } catch (error) {
    console.log(`Got an error while fetching pull request ${i}, message: ${error.message}`);
  }

  if(FETCH_PATCH !== 'true') continue;

  try {
    await sleep(rateLimitPerRequestTimeout);
    const { data: patch_data } = await api.get(patch_url);
    await fs.writeFile(`./patch/${issue_id}.patch`, patch_data, { flag: 'w+' });
  } catch (error) {
    console.log(`Got an error while fetching pull request ${i} patch, message: ${error.message}`);
  }
}

MongoHelper.disconnect();