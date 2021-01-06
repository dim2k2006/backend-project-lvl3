import os from 'os';
import path from 'path';
import {promises as fs} from 'fs';
import nock from 'nock';
import {beforeEach, expect} from '@jest/globals';
import loadPage from '../src';

nock.disableNetConnect();

const getFixturePath = (filename) => path.join('.', '__fixtures__', filename);
const readFile = (filename) => fs.readFile(filename, 'utf-8');

let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('Loads the page.', async () => {
  const filename = 'ru-hexlet-io-courses.html';
  const expected = await readFile(getFixturePath(filename));
  const base = 'https://ru.hexlet.io';
  const endpoint = '/courses'

  nock(base)
    .get(endpoint)
    .reply(200, expected);

  const filepath = await loadPage(`${base}${endpoint}`, tempDir);

  const actual = await readFile(filepath);

  expect(actual).toBe(expected);
});
