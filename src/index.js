import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';

const genFileName = (url) => {
  const { hostname, pathname } = new URL(url);
  const fileName = `${hostname}${pathname}`.replace(/[^a-zA-Z0-9]/g, '-');

  return `${fileName}.html`;
};

const loadPage = (url, dest) => axios
  .get(url)
  .then(({ data }) => fs.writeFile(path.join(dest, genFileName(url)), data, 'utf-8'));

export default loadPage;