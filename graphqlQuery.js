import graphql from './graphql.js';

export const getLinkedPR = async (owner, name, number) => {
  const query = `query {
    repository(owner: "${owner}", name: "${name}") {
      issue(number: ${number}) {
        timelineItems(first: 100) {
          nodes {
            ... on CrossReferencedEvent {
              source {
                ... on PullRequest {
                  number
                }
              }
            }
          }
        }
      }
    }
  }`
  const { data } = await graphql(query);
  if(data.errors) return [];
  try {
    const { nodes: prs } = data.data.repository.issue.timelineItems;

    return prs.filter(value => value && Object.keys(value).length !== 0 ).map((x) => x.source.number);
  } catch (error) {
    console.log(JSON.stringify(data))
  }
}

export const SearchPR = async (owner, name, label, date='2000-01-01T00:00:00Z') => {
  const query = `query {
    search(query: "repo:${owner}/${name} is:pr created:>${date} sort:created-asc", type: ISSUE, first: 100) {
      
      edges {
        node {
          ... on PullRequest {
            number
            title
            createdAt
          }
        }
      }
    }
    rateLimit {
      cost
    }
  }`

  const { data } = await graphql(query);
  try {
    return data.data.search.edges;
  } catch (error) {
    console.log(error, data);
  }
}

export const rateLimit = async () => {
  const query = `query {
    viewer {
      login
    }
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  }
  `
  const { data } = await graphql(query);
  return data
}