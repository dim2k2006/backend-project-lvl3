import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import { beforeEach, expect, jest } from '@jest/globals';
import prettier from 'prettier';
import cheerio from 'cheerio';
import loadPage from '../src';

jest.setTimeout(30000);

nock.disableNetConnect();

const getFixturePath = (filename) => path.join('.', '__fixtures__', filename);
const readFile = (filename) => fs.readFile(filename, 'utf-8');
const formatHtml = (htmlString) => prettier.format(htmlString, { parser: 'html' });

let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

const base = 'https://ru.hexlet.io';

test('Loads the page.', async () => {
  const response = await readFile(getFixturePath('ru-hexlet-io-courses.html'));
  const expected = await readFile(getFixturePath('ru-hexlet-io-courses-expected.html'));
  const pathname = '/courses';

  nock(base)
    .get(pathname)
    .reply(200, response);

  const filepath = await loadPage(`${base}${pathname}`, tempDir);

  const actual = await readFile(filepath);

  expect(actual).toBe(formatHtml(expected));
});

test('Loads the pages and all its assets.', async () => {
  const resourceName = 'ru-hexlet-io-courses';
  const filesFolderName = `${resourceName}_files`;
  const page = await readFile(getFixturePath('page-with-assets.html'));
  const expected = await readFile(getFixturePath('page-with-assets-expected.html'));
  const pathname = '/courses';
  const assets = [
    { pathname: '/assets/professions/nodejs.png', file: 'nodejs.png', contentType: 'image/png' },
    { pathname: '/assets/application.css', file: 'application.css', contentType: 'text/css' },
    { pathname: '/packs/js/runtime.js', file: 'runtime.js', contentType: 'application/javascript' },
  ];

  nock(base)
    .get(pathname)
    .reply(200, page);

  assets.forEach((asset) => nock(base)
    .get(asset.pathname)
    .replyWithFile(200, getFixturePath(asset.file), {
      'Content-Type': asset.contentType,
    }));

  const filepath = await loadPage(`${base}${pathname}`, tempDir);

  const filesFolder = await fs.stat(path.join(tempDir, filesFolderName));

  expect(filesFolder.isDirectory()).toBeTruthy();

  const actual = await readFile(filepath);

  expect(formatHtml(actual)).toBe(formatHtml(expected));

  const $ = cheerio.load(actual);

  const images = $('img');

  const promises = images
    .map((idx, image) => {
      const src = $(image).attr('src');
      const imagePath = path.join(tempDir, src);

      return fs.access(path.resolve(imagePath));
    });

  await expect(Promise.all(promises)).resolves.toBeTruthy();
});
