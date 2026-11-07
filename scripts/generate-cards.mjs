import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read public language metadata only. No stargazers connection or private metrics.
export const QUERY = `
query Languages($login: String!, $after: String) {
  user(login: $login) {
    repositories(first: 100, after: $after, ownerAffiliations: OWNER,
                 privacy: PUBLIC, isFork: false, orderBy: {field: NAME, direction: ASC}) {
      nodes {
        name
        languages(first: 100) {
          edges { size node { name color } }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

export async function collectLanguages(request) {
  const totals = new Map();
  let after = null;
  let repositories = 0;
  const cursors = new Set();
  do {
    const body = await request(after);
    if (body.errors?.length) throw new Error(body.errors.map(e => e.message).join('; '));
    const connection = body.data?.user?.repositories;
    if (!connection?.nodes || !connection.pageInfo) throw new Error('Missing public repository data');
    for (const repo of connection.nodes) {
      if (!repo?.languages?.edges || !repo.languages.pageInfo) throw new Error('Missing language data');
      if (repo.languages.pageInfo.hasNextPage) throw new Error('Language list exceeds 100 entries; refusing partial data');
      repositories++;
      for (const {size, node} of repo.languages.edges) {
        if (!Number.isFinite(size) || size < 0 || !node?.name) throw new Error('Invalid language size or name');
        const previous = totals.get(node.name);
        totals.set(node.name, {name: node.name, color: node.color || '#94A3B8', size: size + (previous?.size || 0)});
      }
    }
    if (!connection.pageInfo.hasNextPage) break;
    after = connection.pageInfo.endCursor;
    if (!after || cursors.has(after)) throw new Error('Invalid pagination cursor');
    cursors.add(after);
  } while (true);
  const languages = [...totals.values()].filter(l => l.size > 0).sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  return {languages, repositories};
}

const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
const safeColor = color => /^#[0-9a-f]{6}$/i.test(color) ? color : '#94A3B8';

export function renderLanguages({languages, repositories}, compact = false) {
  const total = languages.reduce((sum, l) => sum + l.size, 0);
  const displayed = languages.slice(0, 12);
  const width = compact ? 450 : 900;
  const columns = compact ? 2 : 3;
  const gap = compact ? 200 : 282;
  const barWidth = width - 64;
  const rows = Math.ceil(displayed.length / columns);
  const height = Math.max(220, 150 + rows * 38);
  let x = 32;
  const segments = displayed.map(l => {
    const segmentWidth = l.size / total * barWidth;
    const rect = `<rect x="${x.toFixed(3)}" y="78" width="${segmentWidth.toFixed(3)}" height="10" fill="${safeColor(l.color)}"/>`;
    x += segmentWidth;
    return rect;
  }).join('');
  const entries = displayed.map((l, i) => {
    const cx = 32 + (i % columns) * gap;
    const cy = 122 + Math.floor(i / columns) * 38;
    const percent = (l.size / total * 100).toFixed(1);
    return `<g><circle cx="${cx + 5}" cy="${cy - 4}" r="4" fill="${safeColor(l.color)}"/><text x="${cx + 19}" y="${cy}" class="name">${escapeXml(l.name)}</text><text x="${cx + (compact ? 180 : 244)}" y="${cy}" text-anchor="end" class="value">${percent}%</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Most Used Languages</title>
  <desc id="desc">Language bytes in ${repositories} public, owned, non-fork repositories. ${displayed.map(l => escapeXml(l.name) + ' ' + (l.size / total * 100).toFixed(1) + '%').join(', ')}. Percentages include all languages.</desc>
  <defs><linearGradient id="edge"><stop stop-color="#A78BFA" stop-opacity=".5"/><stop offset="1" stop-color="#67E8F9" stop-opacity=".2"/></linearGradient><clipPath id="bar"><rect x="32" y="78" width="${barWidth}" height="10" rx="5"/></clipPath></defs>
  <style>text{font-family:'Segoe UI',Arial,sans-serif}.name{fill:#CDD5E3;font-size:14px}.value{fill:#97A4BA;font-size:13px;font-variant-numeric:tabular-nums}</style>
  <rect x=".5" y=".5" width="${width-1}" height="${height-1}" rx="20" fill="#101522" stroke="url(#edge)"/>
  <text x="32" y="40" fill="#EDE9FE" font-size="20" font-weight="600">Most Used Languages</text>
  ${compact ? '' : '<text x="868" y="40" fill="#92A1B8" font-size="11" text-anchor="end">PUBLIC REPOSITORIES</text>'}
  <g clip-path="url(#bar)"><rect x="32" y="78" width="${barWidth}" height="10" fill="#334155"/>${segments}</g>
  ${total ? entries : '<text x="32" y="126" class="name">No language data yet.</text>'}
  <text x="32" y="${height-24}" fill="#8190A8" font-size="11">${repositories} repositories · ${languages.length} languages · By code size${languages.length > 12 && !compact ? ' · Top 12 shown; remaining languages in gray' : ''}</text>
</svg>`;
}

export async function generate(request, output = resolve('assets/top-langs.svg')) {
  // Collect and validate the full response BEFORE touching the last good asset.
  const data = await collectLanguages(request);
  const svg = renderLanguages(data);
  const mobile = renderLanguages(data, true);
  for (const image of [svg, mobile]) {
    if (!image.startsWith('<svg ') || !image.endsWith('</svg>') || /NaN|Infinity/.test(image)) throw new Error('Invalid SVG output');
  }
  await mkdir(dirname(output), {recursive: true});
  const mobileOutput = output.replace(/\.svg$/, '-mobile.svg');
  await writeFile(output + '.tmp', svg + '\n', 'utf8');
  await writeFile(mobileOutput + '.tmp', mobile + '\n', 'utf8');
  await rename(output + '.tmp', output);
  await rename(mobileOutput + '.tmp', mobileOutput);
  return data;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const token = process.env.GITHUB_TOKEN;
  const login = process.env.PROFILE_USERNAME || 'pu-007';
  if (!token) throw new Error('GITHUB_TOKEN is required. Use the repository Actions workflow.');
  const data = await generate(async after => {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type':'application/json', 'User-Agent':'profile-language-card'},
      body: JSON.stringify({query: QUERY, variables: {login, after}}),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
    return response.json();
  });
  console.log(`Updated language card: ${data.repositories} repositories, ${data.languages.length} languages.`);
}
