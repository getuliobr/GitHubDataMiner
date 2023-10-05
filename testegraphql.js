import { getLinkedPR, rateLimit } from './graphqlQuery.js'

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

// console.log(await getLinkedPR('neovim', 'neovim', 12487))
console.log(await getPullRequestNumberList('jabref', 'jabref'))