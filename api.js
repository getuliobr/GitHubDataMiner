import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { GITHUB_TOKEN } = process.env;

export default axios.create({
  baseURL: 'https://api.github.com/',
  headers: {
    'Authorization': `token ${GITHUB_TOKEN}`,
  }
});
