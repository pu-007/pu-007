import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {collectLanguages, renderLanguages, generate, QUERY} from '../scripts/generate-cards.mjs';

const page = (entries, more = false, cursor = null) => ({data: {user: {repositories: {
  nodes: entries.map(([name, size]) => ({name: 'repo', languages: {edges: [{size, node: {name, color: '#123456'}}], pageInfo: {hasNextPage:false}}})),
  pageInfo: {hasNextPage:more, endCursor:cursor}
}}}});

test('aggregates all repository pages without requesting restricted stargazers', async () => {
  const calls = [];
  const data = await collectLanguages(async cursor => {
    calls.push(cursor);
    return cursor ? page([['Rust', 50], ['Lua', 50]]) : page([['Rust', 100]], true, 'page2');
  });
  assert.deepEqual(calls, [null, 'page2']);
  assert.equal(data.repositories, 3);
  assert.equal(data.languages[0].size, 150);
  assert.match(QUERY, /privacy: PUBLIC, isFork: false/);
  assert.doesNotMatch(QUERY, /stargazers/);
});

test('API errors keep the last good SVG intact', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'profile-card-'));
  const output = join(dir, 'languages.svg');
  try {
    await writeFile(output, '<svg>last good version</svg>');
    await assert.rejects(generate(async () => ({errors:[{message:'Resource not accessible by integration'}]}), output), /not accessible/);
    assert.equal(await readFile(output, 'utf8'), '<svg>last good version</svg>');
  } finally { await rm(dir, {recursive:true, force:true}); }
});

test('empty accounts and escaped text produce valid values', () => {
  assert.doesNotMatch(renderLanguages({languages:[], repositories:0}), /NaN|Infinity/);
  const svg = renderLanguages({languages:[{name:'A&B <test>', size:1, color:'invalid'}], repositories:1});
  assert.match(svg, /A&amp;B &lt;test&gt;/);
  assert.match(svg, /100.0%/);
  assert.match(svg, /#94A3B8/);
});

test('rejects incomplete data and repeating pagination cursors', async () => {
  await assert.rejects(collectLanguages(async () => page([['Rust', -1]])), /Invalid language/);
  await assert.rejects(collectLanguages(async () => page([], true, 'same')), /pagination/);
  await assert.rejects(collectLanguages(async () => ({data:{user:null}})), /Missing public/);
});
