/* eslint-disable */
import axios from 'axios';
import dotenv from 'dotenv';

module.exports = async function () {
  dotenv.config({ path: '.env.development' });
  // Configure axios for tests to use.
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';
  axios.defaults.baseURL = `http://${host}:${port}/api`;
};
