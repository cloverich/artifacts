// Inline mechanics, app, styles, and the study into one file that opens from
// disk. Also emits the same page as a body fragment for Claude Artifacts,
// whose publisher supplies its own doctype/head skeleton.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("./", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const code = (await read("mechanics.mjs")).replace(/^export /gm, "") + "\n" + (await read("app.js"));
new Script(code); // parse check
const css = await read("style.css");
const analysis = await read("analysis.md");

// Function replacements: `$` sequences in the inlined source stay literal.
const html = (await read("index.html"))
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}</style>`)
  .replace('<script src="app.js"></script>', () => `<script>\n${code.replaceAll("</script", "<\\/script")}</script>`)
  .replace("<!-- RESEARCH -->", () => `<pre class="research">${escape(analysis)}</pre>`);
if (/<(?:script|link)[^>]+(?:src|href)=/i.test(html)) throw Error("Unbundled runtime asset");

await mkdir(new URL("dist/", root), { recursive: true });
await writeFile(new URL("dist/horizon-plate.html", root), html);

// Artifact fragment: <title>, metas and <style> first, then the body content.
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const keep = [...head.matchAll(/<title>[\s\S]*?<\/title>|<meta name="(?:claude:viewport-fit-sides|description)"[^>]*>|<style>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
await writeFile(new URL("dist/artifact.html", root), keep.join("\n") + "\n" + body);
console.log(`Built dist/horizon-plate.html (${(html.length / 1024).toFixed(1)} KB) and dist/artifact.html; script parses; no external assets.`);
