import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { renderMarkdown } from './markdown.mjs';
import { buildNotes, noteLink, notePage, studies } from './build-notes.mjs';

test('front matter is metadata; headings, prose, lists, tables, and fenced code retain structure', () => {
  const html = renderMarkdown(`---\ntags:\n  - hidden\n---\n# Study\n\nA **bold** and *quiet* recipe with \`clip-path\`.\n\n## Reuse\n## Reuse\n\n1. Color\n2. Geometry\n   - A nested detail\n\n| Cue | Rule |\n| --- | --- |\n| Amber | Keep \\| legible |\n\n> A quote.\n\n\`\`\`js\nconst answer = '<safe>';\n\`\`\`\n`);
  assert.doesNotMatch(html, /tags:|hidden/);
  assert.match(html, /<h1 id="study">Study<\/h1>/);
  assert.match(html, /<h2 id="reuse-2">Reuse<\/h2>/);
  assert.match(html, /<strong>bold<\/strong> and <em>quiet<\/em>/);
  assert.match(html, /<code>clip-path<\/code>/);
  assert.match(html, /<ol><li><p>Color<\/p><\/li><li><p>Geometry<\/p>\n<ul>/);
  assert.match(html, /<th scope="col">Cue<\/th>/);
  assert.match(html, /<td>Keep \| legible<\/td>/);
  assert.match(html, /<blockquote><p>A quote\.<\/p><\/blockquote>/);
  assert.match(html, /class="language-js">const answer = &#39;&lt;safe&gt;&#39;;/);
});

test('raw HTML and unsafe URLs cannot execute; remote media remains an ordinary source link', () => {
  const html = renderMarkdown(`<script>alert('x')</script>\n\n[bad](javascript:alert(1)) [data](data:text/html,secret) [network](//example.org)\n\n![Reference](https://example.org/photo.jpg)\n\n<https://example.org/>`);
  assert.doesNotMatch(html, /<script|<img|href="(?:javascript:|data:|\/\/)/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<a href="https:\/\/example.org\/photo.jpg">Reference<\/a>/);
  assert.match(html, /<a href="https:\/\/example.org\/">https:\/\/example.org\/<\/a>/);
});

test('readable notes resolve project analyses, source revisions, and private references deliberately', () => {
  assert.equal(noteLink('../oxide-header-lab/analysis.md#sources', 'soundscape/analysis.md'), 'oxide.html#sources');
  assert.equal(noteLink('../oxide-header-lab/app.js', 'soundscape/analysis.md'), 'https://github.com/cloverich/artifacts/blob/main/oxide-header-lab/app.js');
  assert.equal(noteLink('/code/artifacts@abc123/soundscape/app.js', 'soundscape/analysis.md'), 'https://github.com/cloverich/artifacts/blob/abc123/soundscape/app.js');
  assert.equal(noteLink('/code/artifacts@abc123', 'soundscape/analysis.md'), 'https://github.com/cloverich/artifacts/tree/abc123');
  assert.equal(noteLink('/notes/private-id', 'soundscape/analysis.md'), null);
  assert.equal(noteLink('clip_path.html', 'clip_path/analysis.md'), '../clip_path/clip_path.html');
  assert.equal(noteLink('../signal-press/index.html?view=1#recipe', 'docs/neuromancer-hermes.md'), '../signal-press/index.html?view=1#recipe');
  assert.equal(noteLink('../index.html', 'docs/neuromancer-hermes.md'), '../index.html');
  assert.equal(noteLink('../../../secret', 'soundscape/analysis.md'), null);
  const html = notePage('# My note\n\n[Prior note](/notes/private-id) and [[private-id]].', studies[1]);
  assert.match(html, /Prior note and <code>private-id<\/code>/);
  assert.doesNotMatch(html, /href="\/notes\//);
  assert.match(html, /prefers-color-scheme:dark/);
  assert.match(html, /width:min\(100% - 3rem,76ch\)/);
  assert.doesNotMatch(html, /<script|<link[^>]*stylesheet/);
});

test('every study produces complete static HTML and a byte-identical raw Markdown companion', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'artifact-notes-'));
  try {
    for (const study of studies) {
      const source = resolve(root, study.source);
      await mkdir(dirname(source), { recursive: true });
      await writeFile(source, `# ${study.slug}\n\nBeginning.\n\n## Final evidence\n\nThe final paragraph is retained.\n`);
    }
    await buildNotes(root);
    for (const study of studies) {
      const [source, raw, html] = await Promise.all([
        readFile(resolve(root, study.source), 'utf8'),
        readFile(resolve(root, `notes/${study.slug}.md`), 'utf8'),
        readFile(resolve(root, `notes/${study.slug}.html`), 'utf8'),
      ]);
      assert.equal(raw, source);
      assert.match(html, /The final paragraph is retained/);
      assert.match(html, new RegExp(`href="${study.slug}.md"`));
      assert.match(html, /<article><h1/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
