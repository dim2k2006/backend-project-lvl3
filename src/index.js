import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import cheerio from 'cheerio';
import prettier from 'prettier';

const genResourceName = (url) => url.replace(/[^a-zA-Z0-9]/g, '-');

const sources = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const getTagSourcePropertyName = (tag) => {
  const propertyName = sources[tag];

  if (!propertyName) throw new Error('Invalid tag.');

  return propertyName;
};

const isCanonicalLink = ($element) => $element[0].name === 'link' && $element.attr('rel') === 'canonical';

const isAlternateLink = ($element) => $element[0].name === 'link' && $element.attr('rel') === 'alternate';

const getDomainName = (hostName) => hostName
  .split('.')
  .slice(-2)
  .join('.');

const fetchResource = (resourceUrl, resourceFilename) => new Promise((resolve, reject) => axios
  .get(resourceUrl.toString(), { responseType: 'arraybuffer' })
  .then((response) => resolve({ ...response, filename: resourceFilename }))
  .catch((error) => reject(error)));

const loadPage = (url, dest = process.cwd()) => {
  const pageLink = new URL(url);
  const base = `${pageLink.protocol}//${pageLink.hostname}`;

  const pageName = genResourceName(`${pageLink.hostname}${pageLink.pathname === '/' ? '' : pageLink.pathname}`);
  const loadedPageName = `${pageName}.html`;
  const loadedResourcesDirname = `${pageName}_files`;
  const loadedResourcesPath = path.join(dest, loadedResourcesDirname);
  const loadedPagePath = path.join(dest, loadedPageName);

  const isLocalResource = (resourceUrl) => {
    if (resourceUrl.startsWith('/')) return true;

    const source = new URL(resourceUrl);

    return getDomainName(source.hostname) === getDomainName(pageLink.hostname);
  };

  const processTag = ($element, propName) => {
    const resourceUrl = new URL($element.attr(propName), base);
    const resourcePath = path.parse(`${resourceUrl.hostname}${resourceUrl.pathname}`);
    const resourceName = genResourceName(`${resourcePath.dir}/${resourcePath.name}`);
    const ext = resourcePath.ext || '.html';
    const resourceFilename = `${resourceName}${ext}`;

    $element.attr(propName, `${loadedResourcesDirname}/${resourceFilename}`);

    return { resourceUrl, resourceFilename };
  };

  const tags = {
    img: ($element) => {
      const propName = getTagSourcePropertyName('img');
      const { resourceUrl, resourceFilename } = processTag($element, propName);

      return fetchResource(resourceUrl, resourceFilename);
    },
    link: ($element) => {
      const propName = getTagSourcePropertyName('link');
      const { resourceUrl, resourceFilename } = processTag($element, propName);

      if (isCanonicalLink($element)) return null;

      if (isAlternateLink($element)) return null;

      return fetchResource(resourceUrl, resourceFilename);
    },
    script: ($element) => {
      const propName = getTagSourcePropertyName('script');
      const { resourceUrl, resourceFilename } = processTag($element, propName);

      return fetchResource(resourceUrl, resourceFilename);
    },
  };

  const loadResources = ({ data }) => {
    const $ = cheerio.load(data);

    const elements = Array.from($('img, link, script[src]'));

    const requests = elements
      .map((element) => $(element))
      .filter(($element) => {
        const propertyName = getTagSourcePropertyName($element[0].name);
        const resourceUrl = $element.attr(propertyName);
        const result = isLocalResource(resourceUrl);

        return result;
      })
      .map(($element) => {
        const process = tags[$element[0].name];
        const request = process($element);

        return request;
      })
      .filter((request) => !!request);

    const htmlString = $.html();

    return Promise.all(requests)
      .then((responses) => new Promise((resolve, reject) => {
        fs.access(loadedResourcesPath)
          .then(() => resolve(responses))
          .catch(() => {
            fs.mkdir(loadedResourcesPath)
              .then(() => resolve(responses))
              .catch((error) => reject(error));
          });
      }))
      .then((responses) => {
        const promises = responses.map((response) => {
          const filepath = path.join(loadedResourcesPath, response.filename);
          const buffer = response.data;

          return fs.writeFile(filepath, buffer);
        });

        return Promise.all(promises);
      })
      .then(() => ({ data: htmlString }));
  };

  const promise = axios
    .get(url)
    .then(loadResources)
    .then(({ data }) => fs.writeFile(loadedPagePath, prettier.format(data, { parser: 'html' }), 'utf-8'))
    .then(() => loadedPagePath);

  return promise;
};

export default loadPage;
