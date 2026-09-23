# Contributing

## Local loop

```bash
npm test                              # node bin/trimhook.mjs check && node --test
node evals/local.mjs                  # what the cut would have saved on your own transcripts
node bin/trimhook.mjs doctor          # harness, data dir, config, the harness's own cap
npm run backlog                       # BACKLOG lint + ROADMAP in step
npm run build:site && open site/dist/index.html
```

No dependency, no build: every file that matters is under `bin/`, and `check` on Node 18
is the floor CI holds.

## Benchmark protocol

Two measurements, both without a key and without a network:

1. **Transcripts** — `node evals/local.mjs [--cap N] [--json]` reads Claude Code's
   transcripts and Codex's sessions, keeps sizes only, and prints the cap sweep the README
   table shows. The transcripts hold what the harness gave the model after its own flat
   cut, so the saving is what trimhook adds on top of `BASH_MAX_OUTPUT_LENGTH`, not
   instead of it. Commit the JSON with the table; the table carries its date.
2. **Live** — install the checkout, work for a week, then `trimhook report`: results,
   `trimmed` count, characters saved, top commands. The second number that matters is how
   often the model went and read a spill file — grep the transcripts for `spill/` in
   `Read` tool inputs. A cap that is never followed by a read can drop; one that is read
   often is too low.

The default cap moves only with both numbers in the README.

## Backlog, roadmap, issues

`BACKLOG.md` is the single source of truth; `ROADMAP.md` is generated from it and the
GitHub issues are synced from it one way on every push to `main` that touches the file.
Ticking an item ships it; closing an issue on GitHub changes nothing. Items carry a
stable `TH-n` id and a trailing `<!-- th: prio= size= labels= [ver=] -->` comment.

## Pull requests

- `main` is protected: pull request, green CI, no direct pushes.
- Conventional subject, `TH-n` in it when the change belongs to an item, a CHANGELOG
  line under `[Unreleased]` — `check` fails without that section.

## Releasing

Releases run from GitHub Actions; pushing the tag is the manual step, and
`release-drift.yml` fails when `main` carries a version with no tag for two hours.

**One-time setup — npm Trusted Publishing.** No npm token lives here; the release job
authenticates over OIDC. npm cannot configure a trusted publisher for a package that
does not exist, so the first version is published by hand (`npm publish --access public`),
then on npmjs.com → package → Settings → Trusted Publisher → GitHub Actions: user
`Allan-Nava`, repository `trimhook` (the name only, not the URL), workflow `release.yml`,
environment empty, "Allow npm publish" ticked. Never give `actions/setup-node` a
`registry-url`; never rename `release.yml`.

**Per release:**

```bash
# 1. bump the version in all four manifests — package.json, .claude-plugin/plugin.json,
#    .claude-plugin/marketplace.json, .codex-plugin/plugin.json
#    rename CHANGELOG's [Unreleased] to [x.y.z] — date, open a new empty [Unreleased]
#    turn every ver=main in BACKLOG.md into ver=x.y.z, regenerate the roadmap
npm test
# 2. land the bump on main through a pull request, then tag that merge commit
git checkout main && git pull
git tag trimhook--v{version} && git push origin trimhook--v{version}
```

The tag triggers `release.yml`: version check, tests, publish, wait for the registry,
GitHub release, close the milestone whose title starts with `v{version}`. Re-run with
`gh workflow run Release -f tag=trimhook--v{version}`; every step is idempotent.
