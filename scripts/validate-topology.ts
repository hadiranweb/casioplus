import { access, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredDirectories = [
  'apps/app-web',
  'apps/studio-web',
  'services/core-api',
  'services/native-diagnosis-worker',
  'packages/contracts',
  'packages/domain',
  'packages/knowledge-model',
  'migrations',
  'deployment',
  'docs',
];

for (const directory of requiredDirectories) {
  await access(resolve(root, directory));
}

const entries = await readdir(root);
const forbiddenRootEntries = entries.filter((entry) =>
  ['gateway', 'target', 'web', 'dist'].includes(entry),
);
if (forbiddenRootEntries.length > 0) {
  throw new Error(`Unexpected MVP root entries: ${forbiddenRootEntries.join(', ')}`);
}

console.log(JSON.stringify({ status: 'ok', root, requiredDirectories }));
