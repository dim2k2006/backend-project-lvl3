// import path from 'path';
// import fs from 'fs';
// import genDiff from '../src';
//
// const getFixturePath = (filename) => path.join('.', '__fixtures__', filename);
// const readFile = (filename) => fs.readFileSync(filename, 'utf-8');
//
// const cases = [
//   [
//     'json',
//     'expected-stylish.txt',
//     'stylish',
//   ],
//   [
//     'json',
//     'expected-plain.txt',
//     'plain',
//   ],
//   [
//     'json',
//     'expected-json.txt',
//     'json',
//   ],
//
//   [
//     'yml',
//     'expected-stylish.txt',
//     'stylish',
//   ],
//   [
//     'yml',
//     'expected-plain.txt',
//     'plain',
//   ],
//   [
//     'yml',
//     'expected-json.txt',
//     'json',
//   ],
//
//   [
//     'ini',
//     'expected-stylish.txt',
//     'stylish',
//   ],
//   [
//     'ini',
//     'expected-plain.txt',
//     'plain',
//   ],
//   [
//     'ini',
//     'expected-json.txt',
//     'json',
//   ],
// ];
//
// describe('Should compare files', () => {
//   test.each(cases)(
//     'File extension: %p, Expectedpath: %p, Format: %p',
//     (extension, filename, format) => {
//       const filepath1 = getFixturePath(`before.${extension}`);
//       const filepath2 = getFixturePath(`after.${extension}`);
//       const filepath3 = getFixturePath(filename);
//
//       const expected = readFile(filepath3);
//       const actual = genDiff(filepath1, filepath2, format);
//
//       expect(actual).toEqual(expected);
//     },
//   );
// });
