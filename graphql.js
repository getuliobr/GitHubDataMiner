import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { GITHUB_TOKEN } = process.env;

export default (query) => axios.post(
  'https://api.github.com/graphql',
  { query },
  {
    headers: {
      'Authorization': `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
);