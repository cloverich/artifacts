// Render plates from a recipe and its source image, headless, through the
// lab's own pipeline (compute → encode), so the files match the lab's Export.
//
//   node horizon-plate/build.mjs
//   node horizon-plate/render.mjs <image> <recipe.json> <out-dir> [--dark]
//
// Writes plate-wide.png and plate-narrow.png. --dark also writes
// plate-{wide,narrow}-dark.png with the polarity flipped, for a dark theme
// that should read as a print rather than a negative. Needs Playwright with
// a Chromium (a local or global install).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, join } from "node:path";

const args = process.argv.slice(2), dark = args.includes("--dark");
const [image, recipePath, outDir] = args.filter((a) => a !== "--dark").map((a) => resolve(a));
if (!outDir) { console.error("usage: render.mjs <image> <recipe.json> <out-dir> [--dark]"); process.exit(1); }
const lab = new URL("dist/horizon-plate.html", import.meta.url).pathname;
if (!existsSync(lab)) { console.error("Build the lab first: node horizon-plate/build.mjs"); process.exit(1); }

const { chromium } = await import("playwright").catch(() => import(join(execSync("npm root -g").toString().trim(), "playwright/index.mjs")));
const recipe = JSON.parse(readFileSync(recipePath, "utf8"));
const browser = await chromium.launch();
mkdirSync(outDir, { recursive: true });

async function render(r, suffix) {
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + lab);
  await page.setInputFiles("#file", image);
  await page.waitForFunction(() => S.source.kind === "file");
  if (!(await page.evaluate((r) => applyRecipe(r), r))) throw Error("Not a Horizon Plate recipe");
  const out = await page.evaluate(async () => {
    const src = await sourceImage(), res = {};
    for (const which of ["wide", "narrow"]) {
      const c = compute(src, S.plates[which], ALGOS[S.algo].exportScale, false), enc = await encode(c);
      const bytes = new Uint8Array(await enc.blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
      res[which] = { ext: enc.ext, w: c.cw, h: c.ch, b64: btoa(s) };
    }
    return res;
  });
  if (errors.length) throw Error(errors.join("\n"));
  for (const [which, p] of Object.entries(out)) {
    const file = join(outDir, `plate-${which}${suffix}.${p.ext}`), buf = Buffer.from(p.b64, "base64");
    writeFileSync(file, buf);
    console.log(`${file}  ${p.w}×${p.h}  ${(buf.length / 1024).toFixed(1)} KB`);
  }
  await page.close();
}

await render(recipe, "");
if (dark) await render({ ...recipe, inkLight: !recipe.inkLight }, "-dark");
await browser.close();
