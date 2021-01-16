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
  const filename = 'ru-hexlet-io-courses.html';
  const expected = await readFile(getFixturePath(filename));
  const pathname = '/courses';

  nock(base)
    .get(pathname)
    .reply(200, expected);

  const filepath = await loadPage(`${base}${pathname}`, tempDir);

  const actual = await readFile(filepath);

  expect(actual).toBe(formatHtml(expected));
});

test('Loads the pages and all its images.', async () => {
  const resourceName = 'ru-hexlet-io-courses';
  const filesFolderName = `${resourceName}_files`;
  const page = await readFile(getFixturePath('page-with-image.html'));
  const expected = await readFile(getFixturePath('page-with-image-expected.html'));
  const pathname = '/courses';
  const imgPathname = '/assets/professions/nodejs.png';

  nock(base)
    .get(pathname)
    .reply(200, page);

  nock(base)
    .get(imgPathname)
    .replyWithFile(200, getFixturePath('nodejs.png'), {
      'Content-Type': 'image/png',
    });

  const filepath = await loadPage(`${base}${pathname}`, tempDir);

  const filesFolder = await fs.stat(path.join(tempDir, filesFolderName));

  expect(filesFolder.isDirectory()).toBeTruthy();

  const actual = await readFile(filepath);

  expect(formatHtml(actual)).toBe(formatHtml(expected));

  const $ = cheerio.load(actual);

  const images = $('img');

  images.each(async (idx, image) => {
    const $image = $(image);

    const source = $image.attr('src');

    const imgFilePath = path.resolve(source);

    expect(await fs.access(imgFilePath)).not.toThrow();
  });
});
