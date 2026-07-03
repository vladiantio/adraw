// oxlint-disable import/no-nodejs-modules
import { readFileSync, writeFileSync } from "node:fs"

// ng-packagr copies `publishConfig` from the source manifest into the generated
// dist/package.json. publishConfig only governs how *this* package is packed and
// published (pnpm reads it from the source manifest, where `directory: "./dist"`
// makes pack/publish emit this very folder). It's meaningless inside the built
// package a consumer installs, so strip it from the published manifest.
const manifestUrl = new URL("../dist/package.json", import.meta.url)
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"))

delete manifest.publishConfig

writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
