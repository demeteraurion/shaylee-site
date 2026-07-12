import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const required = ["index.html", "404.html", "robots.txt", "sitemap.xml", "CNAME"];
const errors = [];
const warnings = [];

for (const file of required) {
  try { await stat(join(root, file)); } catch { errors.push(`Missing required file: ${file}`); }
}

const htmlFiles = (await readdir(root, { recursive: true })).filter(file => extname(file) === ".html");
for (const file of htmlFiles) {
  const html = await readFile(join(root, file), "utf8");
  if (!/<html[^>]+lang=/i.test(html)) errors.push(`${file}: missing html lang`);
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) errors.push(`${file}: missing viewport metadata`);
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${file}: missing title`);
  if (!/<h1(?:\s|>)/i.test(html)) errors.push(`${file}: missing h1`);
  if (!html.includes("G-C715D5HQ28")) errors.push(`${file}: missing Google Analytics measurement ID`);
  for (const match of html.matchAll(/<img\b([^>]+)>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(match[1])) errors.push(`${file}: image missing alt text`);
    if (!/\bwidth=["']?\d+/i.test(match[1]) || !/\bheight=["']?\d+/i.test(match[1])) warnings.push(`${file}: image missing explicit width or height`);
  }
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/i.test(target)) continue;
    const clean = target.split("#")[0].split("?")[0];
    const local = clean.startsWith("/") ? join(root, clean.slice(1)) : join(root, file, "..", clean);
    try { await stat(local); } catch { errors.push(`${file}: missing local target ${target}`); }
  }
}

const imageDir = join(root, "images");
for (const file of await readdir(imageDir)) {
  const info = await stat(join(imageDir, file));
  if (info.isFile() && info.size > 750_000) warnings.push(`images/${file}: ${(info.size / 1_000_000).toFixed(2)} MB`);
}

for (const warning of [...new Set(warnings)]) console.warn(`WARNING: ${warning}`);
for (const error of [...new Set(errors)]) console.error(`ERROR: ${error}`);
console.log(`Checked ${htmlFiles.length} HTML files: ${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length) process.exitCode = 1;
