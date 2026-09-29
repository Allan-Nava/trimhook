# TH-9 — Codex replacement, observed live

What is being decided: whether `codex.replace` defaults to `true` (TH-1, D5). The first
shape tried, `decision: block` with the trimmed text as the reason, reached the model on
Codex 0.155.1 (2026-09-23) as a failed call — "Script failed …" followed by
"Script error: " and the trimmed text — so it never becomes the default, whatever these
runs show. The candidate is `continue: false`, selected with `codex.mode: continue`. This
file is the protocol, the rule that judges it, and the record of the runs; the verdict
at the bottom is what the default follows.

## Before you start

- Codex CLI 0.155 or later — `codex --version`.
- A scratch repository nobody else uses: the hook replaces real tool results in it.
- This checkout, with its hook script. `print-hooks` writes the checkout's absolute path
  into the hooks file, so the runs execute whatever the checkout holds at that moment —
  do not switch branches mid-run.

`codex.mode` exists from TH-1 step S8 on; before S8 is merged the key is ignored and every run is `decision: block` — do not record runs before then.

## Protocol

1. A fresh scratch repository:
   `S=$(mktemp -d) && cd "$S" && git init -q && mkdir -p .codex`
2. The hooks, pointed at this checkout:
   `node <checkout>/bin/trimhook.mjs print-hooks > .codex/hooks.json`
3. The configuration, kept out of your own files:
   `printf '{"codex":{"replace":true,"mode":"continue"}}' > "$S/u.json"` — for the
   comparison runs, `"mode":"block"` — then
   `export TRIMHOOK_USER_CONFIG="$S/u.json" TRIMHOOK_DATA="$S/data"`
4. One run (`N` is the run number):
   `codex exec --approve-for-me --dangerously-bypass-hook-trust 'Run the shell command seq 1 6000 and do not pass max_output_tokens. Then reply with only the first and the last line of its output.' < /dev/null 2> "$S/stderr-$N.txt"`
5. The router: `grep -c 'error=' "$S/stderr-$N.txt"` — record the count.
6. The session log. `F=$(ls -t ~/.codex/sessions/*/*/*/*.jsonl | head -1)`, then print
   every `custom_tool_call` input and every `custom_tool_call_output` text — the first
   120 and the last 80 characters:
   `node -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").split("\n")){if(!l)continue;let e;try{e=JSON.parse(l)}catch{continue}const p=e.payload??e;if(p.type==="custom_tool_call")console.log("call  ",JSON.stringify(String(p.input).slice(0,120)));if(p.type==="custom_tool_call_output"){const o=Array.isArray(p.output)?p.output.map(x=>x.text??"").join(" | "):String(p.output);console.log("output",JSON.stringify(o.slice(0,120)),"…",JSON.stringify(o.slice(-80)))}}' "$F"`
   Record whether the output starts with "Script failed" or carries "Script error", and
   whether `trimhook:` is in it. More than one `call` running `seq` is a re-run.
7. The tools that reached the hook:
   `node -e 'const s=new Set(require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>JSON.parse(l).tool));console.log([...s].join(","))' "$S/data/results.jsonl"`
   — every `tool_name` the hook saw. The last record must be `outcome: "trimmed"` with
   `before` about 28,893. If `before` is about 500, the model passed `max_output_tokens`
   and Codex truncated the output before the hook saw it: discard the run and repeat it.
8. The model's reply: does it quote `1` and `6000`?
9. When done: `rm .codex/hooks.json`.

Three runs with `mode: continue` decide; three with `mode: block` are recorded beside them for the README's comparison. Every `tool_name` seen other than `Bash` gets its own rows and is held to the same rule.

## Pass rule

Pass = in 3 of 3 runs with `mode: continue` the session log's `custom_tool_call_output` carries the trimmed text without a "Script failed"/"Script error" prefix, no `error=` line from the router, the model quotes head and tail and does not re-run. Any tool other than `Bash` seen in the runs must pass the same rule. Pass → `codex.replace` defaults `true` with `mode: continue`; fail → it stays `false`, and the README says both shapes were tried and what each did, dated.

## Runs

| Date | Codex version | Mode | Tool names seen | Error prefix | Router error= | Head quoted | Tail quoted | Re-run |
|---|---|---|---|---|---|---|---|---|
| 2026-09-29 | 0.155.1 / gpt-6-luna | continue | Bash | untrimmed | 0 | yes | yes | no |
| 2026-09-29 | 0.155.1 / gpt-6-luna | continue | Bash | untrimmed | 0 | yes | yes | no |
| 2026-09-29 | 0.155.1 / gpt-6-luna | continue | Bash | untrimmed | 0 | yes | yes | no |
| 2026-09-29 | 0.155.1 / gpt-6-luna | block | Bash | Script failed + Script error | 1 | yes | yes | no |
| 2026-09-29 | 0.155.1 / gpt-6-luna | block | Bash | Script failed + Script error | 1 | yes | yes | no |
| 2026-09-29 | 0.155.1 / gpt-6-luna | block | Bash | Script failed + Script error | 1 | yes | yes | no |

One row per run; dates as `2026-MM-DD`, Mode `continue` or `block`.

**Verdict:** fail — 2026-09-29, Codex 0.155.1 (gpt-6-luna): continue 0 of 3 passed — runs 1-3: untrimmed, Codex logged "hook: PostToolUse Stopped" yet gave the model the whole 28,893-character output, no marker, and the turn went on; block 3 of 3 prefixed "Script failed", router error= in 3 of 3, head and tail quoted in 3 of 3; tools seen: Bash; runs discarded for max_output_tokens: 0.
