import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import cheerio from 'cheerio';
import prettier from 'prettier';

const genResourceName = (url) => url.replace(/[^a-zA-Z0-9]/g, '-');

const loadPage = (url, dest = process.cwd()) => {
  const resourceLink = new URL(url);
  const base = `${resourceLink.protocol}//${resourceLink.hostname}`;

  const resourceName = genResourceName(`${resourceLink.hostname}${resourceLink.pathname === '/' ? '' : resourceLink.pathname}`);
  const loadedFilename = `${resourceName}.html`;
  const loadedAssetsDirname = `${resourceName}_files`;
  const loadedAssetsPath = path.join(dest, loadedAssetsDirname);
  const destFilepath = path.join(dest, loadedFilename);

  const loadImages = ({ data }) => {
    const $ = cheerio.load(data);

    const images = $('img');

    const requests = images.map((idx, image) => {
      const $image = $(image);
      const imgUrl = new URL($image.attr('src'), base);
      const filepath = path.parse(`${imgUrl.hostname}${imgUrl.pathname}`);
      const newResourceName = genResourceName(`${filepath.dir}/${filepath.name}`);

      $image.attr('src', `${loadedAssetsDirname}/${newResourceName}${filepath.ext}`);

      return new Promise((resolve, reject) => {
        axios
          .get(imgUrl.toString(), { responseType: 'arraybuffer' })
          .then((response) => resolve({ ...response, filename: `${newResourceName}${filepath.ext}` }))
          .catch((error) => reject(error));
      });
    });

    const htmlString = $.html();

    return Promise.all(requests)
      .then((responses) => new Promise((resolve, reject) => {
        fs.access(loadedAssetsPath)
          .then(() => resolve(responses))
          .catch(() => {
            fs.mkdir(loadedAssetsPath)
              .then(() => resolve(responses))
              .catch((error) => reject(error));
          });
      }))
      .then((responses) => {
        const promises = responses.map((response) => {
          const filepath = path.join(loadedAssetsPath, response.filename);
          const buffer = response.data;

          return fs.writeFile(filepath, buffer);
        });

        return Promise.all(promises);
      })
      .then(() => ({ data: htmlString }));
  };

  const promise = axios
    .get(url)
    .then(loadImages)
    .then(({ data }) => fs.writeFile(destFilepath, prettier.format(data, { parser: 'html' }), 'utf-8'))
    .then(() => destFilepath);

  return promise;
};

export default loadPage;
