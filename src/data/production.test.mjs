import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { build } from "vite";
import postcss from "postcss";
import { transform } from "lightningcss";

// Resolve inherited custom properties before asking the colour parser to validate
// them: CSS accepts arbitrary token strings in a custom-property declaration.
function resolveVariables(value, tokens, trail = []) {
  const start = value.indexOf("var(");
  if (start < 0) return value.trim();
  let end = start + 4, depth = 1, comma = -1;
  for (; end < value.length && depth; end++) {
    if (value[end] === "(") depth++;
    if (value[end] === ")") depth--;
    if (value[end] === "," && depth === 1 && comma < 0) comma = end;
  }
  assert.equal(depth, 0, `Unclosed CSS variable: ${value}`);
  const name = value.slice(start + 4, comma < 0 ? end - 1 : comma).trim();
  assert.match(name, /^--[\w-]+$/);
  assert.ok(!trail.includes(name), `Circular CSS variable: ${name}`);
  assert.ok(tokens.has(name) || comma >= 0, `Missing CSS variable: ${name}`);
  const replacement = resolveVariables(
    tokens.has(name) ? tokens.get(name) : value.slice(comma + 1, end - 1),
    tokens, [...trail, name],
  );
  return resolveVariables(value.slice(0, start) + replacement + value.slice(end), tokens, trail);
}

function parseColour(value) {
  const declarations = [];
  transform({
    filename: "resolved-colour.css",
    code: Buffer.from(`.probe { color: ${value}; }`),
    visitor: { Declaration(declaration) { declarations.push(declaration); } },
  });
  // Invalid colours can survive transformation as raw tokens without an error.
  assert.equal(declarations.length, 1, `Invalid colour declaration: ${value}`);
  assert.equal(declarations[0].property, "color", `Unparsed colour: ${value}`);
  return declarations[0].value;
}

function themeTokens(css, theme) {
  const tokens = new Map();
  css.walkRules((rule) => {
    const selectors = rule.selectors.map((selector) => selector.replace(/["'\s]/g, ""));
    if (selectors.some((selector) => [":root", "#pillows-workspace", `#pillows-workspace[data-theme=${theme}]`].includes(selector)))
      rule.nodes.filter((node) => node.type === "decl").forEach((node) => {
        if (node.prop.startsWith("--")) tokens.set(node.prop, node.value);
      });
  });
  return tokens;
}

test("colour validation rejects the deployed concatenated-token failure and resolves fallbacks", () => {
  const tokens = new Map([["--paper", "#fff"], ["--alias", "var(--paper)"]]);
  assert.equal(resolveVariables("var(--missing, var(--alias))", tokens), "#fff");
  assert.doesNotThrow(() => parseColour(resolveVariables("var(--missing, rgb(1 2 3))", tokens)));
  assert.throws(() => parseColour("#fff#23221f"), /Unparsed colour/);
  const oldValue = "var(--lightningcss-light, #fff) var(--lightningcss-dark, #23221f)";
  assert.throws(() => parseColour(resolveVariables(oldValue, new Map())), /Unparsed colour/);
});

test("production build preserves usable light/dark colours and GitHub Pages asset paths", async () => {
  const base = "/pillows-inventory/";
  const result = await build({
    root: fileURLToPath(new URL("../..", import.meta.url)),
    base, logLevel: "silent", build: { write: false },
  });
  const output = (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output);
  const styles = output.filter((asset) => asset.fileName.endsWith(".css"));
  assert.ok(styles.length, "The production build must contain a stylesheet");
  const css = postcss.parse(styles.map((asset) => String(asset.source)).join("\n"));
  const palettes = {};
  for (const theme of ["light", "dark"]) {
    const tokens = themeTokens(css, theme);
    for (const required of ["--pw-paper", "--pw-ink", "--pw-canvas", "--pw-wall", "--pw-selected"])
      assert.ok(tokens.has(required), `Missing ${theme} colour: ${required}`);
    palettes[theme] = new Map([...tokens].filter(([name]) => name.startsWith("--pw-")).map(([name, value]) =>
      [name, parseColour(resolveVariables(value, tokens))]));
    // Map colours also depend on inherited theme tokens and colour-mix().
    css.walkRules((rule) => {
      if (!rule.selectors.includes("#pillows-workspace .pw-plan")) return;
      rule.nodes.filter((node) => node.type === "decl" && node.prop.startsWith("--pw-map-")).forEach((node) => {
        parseColour(resolveVariables(node.value, tokens));
      });
    });
    assert.notDeepEqual(palettes[theme].get("--pw-paper"), palettes[theme].get("--pw-ink"));
  }
  assert.notDeepEqual(palettes.light.get("--pw-paper"), palettes.dark.get("--pw-paper"));
  const html = output.find((asset) => asset.fileName === "index.html");
  assert.ok(html, "The production build must contain index.html");
  const links = [...String(html.source).matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1]).filter((url) => url.startsWith("/") && !url.startsWith("//"));
  assert.ok(links.some((url) => url.endsWith(".js")) && links.some((url) => url.endsWith(".css")));
  for (const url of links) {
    assert.ok(url.startsWith(base), `Asset escapes the Pages base: ${url}`);
    const assetName = url.slice(base.length);
    // Vite copies public assets directly; its in-memory build output excludes them.
    const publicAsset = new URL(`../../public/${assetName}`, import.meta.url);
    assert.ok(output.some((asset) => asset.fileName === assetName) || existsSync(publicAsset),
      `Missing built asset: ${url}`);
  }
});
