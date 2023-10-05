import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { GITHUB_TOKEN } = process.env;

export default axios.create({
  baseURL: 'https://api.github.com/',
  headers: {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28'
  }
});
