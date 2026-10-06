const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const { version } = require("../package.json");

function build({ development = false } = {}) {
  const directory = development ? ".dev" : "dist";
  const output = path.join(root, directory);
  // Only these fixed directories inside the repository may be cleared.
  assert.equal(path.dirname(output), root);
  assert.ok(["dist", ".dev"].includes(path.basename(output)));
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  fs.cpSync(path.join(root, "assets"), path.join(output, "assets"), {
    recursive: true,
  });
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(output, "LICENSE"));
  let html = fs
    .readFileSync(path.join(root, "src/index.html"), "utf8")
    .replaceAll("{{VERSION}}", version);
  if (development) {
    fs.cpSync(path.join(root, "dev"), path.join(output, "dev"), {
      recursive: true,
    });
    for (const name of ["balance", "locale"]) {
      const runtime = `<script src="assets/js/${name}.js?v=${version}"></script>`;
      html = html.replace(
        runtime,
        runtime + `<script src="dev/${name}.js?v=${version}"></script>`,
      );
    }
    html = html.replace(
      `<script src="assets/js/main.js?v=${version}"></script>`,
      `<script src="dev/settings.js?v=${version}"></script><script src="assets/js/main.js?v=${version}"></script>`,
    );
    html = html.replace(
      "</head>",
      `<link rel="stylesheet" href="dev/style.css?v=${version}"></head>`,
    );
    html = html.replace(
      '<button id="effects"',
      '<button id="debugEffects" class="small">演出</button><button id="effects"',
    );
    html = html.replace(`v${version}</span>`, `v${version} DEV</span>`);
    const defaults = vm.runInNewContext(
      fs.readFileSync(path.join(root, "assets/js/balance.js"), "utf8") +
        ";JSON.stringify(DEFAULT_BALANCE)",
    );
    fs.writeFileSync(
      path.join(output, "balance.default.json"),
      JSON.stringify({ version: 1, balance: JSON.parse(defaults) }, null, 2) +
        "\n",
    );
  }
  // Content hashes refresh changed assets even while the app version is fixed.
  html = html.replace(
    /(src|href)="((?:assets|dev)\/[^"?]+)\?v=[^"]+"/g,
    (_, attribute, file) => {
      const hash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(output, file)))
        .digest("hex")
        .slice(0, 12);
      return `${attribute}="${file}?v=${version}&amp;h=${hash}"`;
    },
  );
  if (development) {
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(output, "dev/effects-preview.js")))
      .digest("hex")
      .slice(0, 12);
    const preview = html.replace(
      /<script src="assets\/js\/main.js[^"]*"><\/script>/,
      `<script src="dev/effects-preview.js?v=${version}&amp;h=${hash}"></script>`,
    );
    fs.writeFileSync(path.join(output, "effects.html"), preview);
  }
  fs.writeFileSync(path.join(output, "index.html"), html);
  fs.writeFileSync(path.join(output, ".nojekyll"), "");
  for (const match of html.matchAll(
    /(?:src|href)="((?:assets|dev)\/[^" ]+)"/g,
  )) {
    const relative = match[1].split("?")[0];
    assert.ok(
      fs.existsSync(path.join(output, relative)),
      `Missing asset: ${relative}`,
    );
  }
  if (!development) {
    const prohibited =
      /setDebugChips|startDebugWave|debugStart|debugSetChips|balanceForm|BALANCE_FIELDS|debug-controls|debugEffects|previewEffects|数値設定・デバッグ|JSONを読み込む/;
    for (const dir of ["assets/js", "assets/css"]) {
      for (const name of fs.readdirSync(path.join(output, dir))) {
        assert.ok(
          !prohibited.test(
            fs.readFileSync(path.join(output, dir, name), "utf8"),
          ),
          `Developer code in release: ${name}`,
        );
      }
    }
    assert.ok(!fs.existsSync(path.join(output, "dev")));
  }
  return output;
}
module.exports = { build };
if (require.main === module) {
  const development = process.argv.includes("--dev");
  const output = build({ development });
  console.log(
    `NEO//SNAKE v${version}: ${development ? "development" : "production"} site built in ${path.relative(root, output)}/`,
  );
}
