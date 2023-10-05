import dotenv from 'dotenv';
import { getLinkedPR } from './graphqlQuery.js';

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
const pullCollection = MongoHelper.getCollection('pullrequest');
const firstCollection = MongoHelper.getCollection('firstcontribution');

const gfiQuery = {
  "issue_data.labels":   {
    "$exists": true, 
    "$ne": [],
    "$elemMatch": { "name": "good-first-issue" } 
  }
};

const firstGFI = await issuesCollection.findOne(gfiQuery, {
  'sort': {
    'issue_data.created_at': 1
  }
})

const lastGFI = await issuesCollection.findOne(gfiQuery, {
  'sort': {
    'issue_data.created_at': -1
  }
})

const prs = pullCollection.find({}, {sort: {'pr_data.created_at': 1} })

const firstDate = new Date(firstGFI.issue_data.created_at);
const lastDate = new Date(lastGFI.issue_data.created_at);

console.log('Marking first contributors')

for await (const pr of prs) {
  const { user: userData, number, created_at, merged_at, closed_at } = pr.pr_data;
  const state = merged_at ? 'merged' : (closed_at ? 'closed' : 'open');
  const { login: user } = userData;
  
  const userFirst = await firstCollection.findOne({ user });
  console.log(userFirst)
  if (!userFirst) {
    const date = new Date(created_at);
    const gfiRange = firstDate <= date && date <= lastDate;
    
    await firstCollection.insertOne({ user, number, state, gfi: false, gfiRange })
  }
}

console.log('Done marking first contributors')

const gfiList = issuesCollection.find(gfiQuery, {
  'sort': {
    'issue_data.created_at': -1
  }
});

console.log('Marking prs linked to gfi')

for await (const gfi of gfiList) {
  const { number } = gfi.issue_data;

  const linkedPRs = await getLinkedPR(REPO_OWNER, REPO_NAME, number);

  if (linkedPRs.length == 0) continue;
  for (const pr of linkedPRs) {
    await firstCollection.findOneAndUpdate({ 'number': pr }, { '$set': {'gfi': true} });
  }

}

console.log('Done marking prs linked to gfi')

MongoHelper.disconnect();
