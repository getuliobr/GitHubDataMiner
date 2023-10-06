import { getLinkedPR, rateLimit, SearchPR } from './graphqlQuery.js'

// const { data } = await graphql(
//   `query {
//     repository(owner: "neovim", name: "neovim") {
//       issue(number: 21058) {
//         number
//         title
//         body
//         createdAt
//         closedAt
//         labels(first: 100) {
//           nodes {
//             name
//           }
//         }
//         comments(first: 100) {
//           nodes {
//             body
//             author {
//               login
//             }
//           }
//         }
//         timelineItems(first: 100) {
//           nodes {
//             ... on CrossReferencedEvent {
//               source {
//                 ... on PullRequest {
//                   number
//                   title
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//     rateLimit {
//       cost
//     }
//   }`
// );

console.log(JSON.stringify(await rateLimit()))

const { MONGO_URI, REPO_OWNER, REPO_NAME, GFI_NAME } = process.env;

// console.log(await getLinkedPR('neovim', 'neovim', 12487))

let prs = [];
let lastFetch = -1;

while(lastFetch) {
    let prlist
    if (lastFetch < 0) prlist = await SearchPR(REPO_OWNER, REPO_NAME, GFI_NAME);
    else prlist = await SearchPR(REPO_OWNER, REPO_NAME, GFI_NAME, prs[prs.length - 1].node.createdAt);
    prs.push(...prlist)
    lastFetch = prlist.length
    console.log(prs.length)

}

console.log('fim', prs.length)