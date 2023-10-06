import dotenv from 'dotenv';
import api from './api.js';
import fs from 'fs/promises';
import parse from 'parse-git-patch';
const parseGitPatch = parse.default;

import { MongoHelper } from './db.js'
import { getLinkedPR } from './graphqlQuery.js';


// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep?page=1&tab=scoredesc#tab-top
const sleep = s => new Promise(r => setTimeout(r, s * 1000));

dotenv.config();
const { MONGO_URI, REPO_OWNER, REPO_NAME, GFI_NAME } = process.env;

try {
  await MongoHelper.connect(MONGO_URI);
} catch (error) {
  console.log('Couldnt connect to db:', error);
}

const pullCollection = MongoHelper.getCollection('reduced_pr');
const firstCollection = MongoHelper.getCollection('firstcontribution');

const SEARCH_RATE_LIMIT = 60/29; // it's 30 requests per minute, but we do 28 just to be safe

const paramPRPage = (date='2000-01-01T00:00:00Z') => ({
  'q': `repo:${REPO_OWNER}/${REPO_NAME} is:pr created:>${date}`,
  'sort': 'created',
  'order': 'asc',
  'per_page': 100,
  'page': 1
});

const paramGFIPage = (date='2000-01-01T00:00:00Z') => ({
  'q': `repo:${REPO_OWNER}/${REPO_NAME} is:issue label:"${GFI_NAME}" created:>${date}`,
  'sort': 'created',
  'order': 'asc',
  'per_page': 100,
  'page': 1
});

const get = async (location, data) => {
  try {
    return await api.get(location, data);
  } catch (error) {
    console.log(`Got error ${error}, waiting ${SEARCH_RATE_LIMIT} before trying again`);
    await sleep(SEARCH_RATE_LIMIT);
    return await get(location, data);
  }
}

const fetchGFI = async () => {
  const { data } = await get(`/search/issues`, { params: paramGFIPage() });
  const { total_count: issueCount, items: issueList } = data;
  console.log(`Total gfi count: ${issueCount}`);

  await sleep(SEARCH_RATE_LIMIT);

  while(issueList.length != issueCount) {
    const lastIssue = issueList[issueList.length - 1];
    const { created_at } = lastIssue;

    const { data } = await get(`/search/issues`, { params: paramGFIPage(created_at) });
    const { items } = data;

    issueList.push(...items);

    console.log(`Total gfi fetched: ${issueList.length}`);

    await sleep(SEARCH_RATE_LIMIT);
  }

  let now = new Date(issueList[0].created_at);

  for(let i = 1; i < issueList.length; i++) {
    if (issueList[i] < now) {
      console.log('Somehow GFI fetch out of order');
      break;
    }

    now = new Date(issueList[i].created_at);
  }

  return issueList
}

const fetchPR = async () => {
  const issueList = await fetchGFI();
  const firstDate = new Date(issueList[0].created_at);
  const lastDate = new Date(issueList[issueList.length - 1].created_at);

  const { data } = await get(`/search/issues`, { params: paramPRPage() });
  const { total_count: prCount, items: prList } = data;
  console.log(`Total pull count: ${prCount}`);

  await sleep(SEARCH_RATE_LIMIT);

  while(prList.length != prCount) {
    const lastPR = prList[prList.length - 1];
    const { created_at } = lastPR;

    const { data } = await get(`/search/issues`, { params: paramPRPage(created_at) });
    const { items } = data;

    prList.push(...items);

    console.log(`Total pull fetched: ${prList.length}`);

    await sleep(SEARCH_RATE_LIMIT);
  }
  
  let now = new Date(prList[0].created_at);

  for(let i = 0; i < prList.length; i++) {
    if (prList[i] < now) {
      console.log('Somehow pull requests fetch out of order');
      break;
    }

    now = new Date(prList[i].created_at);
  }

  console.log([... new Set(prList.map((el) => (el.user.login)))].length, 'unique users')

  for await (const pr of prList) {
    console.log(pr.created_at, pr.number)

    const pullrequest = {
      number: pr.number,
      user: pr.user.login,
      state: pr.pull_request.merged_at ? 'merged' : (pr.closed_at ? 'closed' : 'open'),
      gfi: false,
      gfiRange: firstDate <= new Date(pr.created_at) && new Date(pr.created_at) <= lastDate
    }

    const { user } = pullrequest;
  
    const userFirst = await firstCollection.findOne({ user });
    if (!userFirst) {
      await firstCollection.insertOne(pullrequest);
    }
  }

  console.log('Marking prs linked to gfi')

  for await (const gfi of issueList) {
    const { number } = gfi;

    const linkedPRs = await getLinkedPR(REPO_OWNER, REPO_NAME, number);

    if (linkedPRs.length == 0) continue;
    console.log(`Issue ${number} marking pr: ${linkedPRs}`);
    for await (const pr of linkedPRs) {
      await firstCollection.findOneAndUpdate({ 'number': pr }, { '$set': {'gfi': true} });
    }
  }

  console.log('Done');

  await MongoHelper.disconnect()
}

await fetchPR();