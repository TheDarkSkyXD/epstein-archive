#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

FAILURES=0

report_fail() {
  local title="$1"
  echo "[FAIL] $title"
  FAILURES=$((FAILURES + 1))
}

report_pass() {
  local title="$1"
  echo "[PASS] $title"
}

RG_BASE=(
  rg -n --hidden
  --glob '!node_modules/**'
  --glob '!dist/**'
  --glob '!data/**'
  --glob '!src/dev/sqlite/**'
  --glob '!scripts/tech_debt_scan.sh'
  --glob '!scripts/ci_pg_nuclear_gates.sh'
)

run_rg_fail_on_match() {
  local title="$1"
  local pattern="$2"
  shift 2
  if "${RG_BASE[@]}" "$pattern" "$@" >/tmp/tech_debt_scan_match.txt 2>/dev/null; then
    report_fail "$title"
    cat /tmp/tech_debt_scan_match.txt
  else
    report_pass "$title"
  fi
}

echo "== PHASE 5: TECH DEBT ERADICATION GATES =="

# 1) SQLite imports/usages (dev-only exceptions allowed in src/dev/sqlite/*)
run_rg_fail_on_match "SQLite imports" "(import .*better-sqlite3|from ['\"][^'\"]*better-sqlite3['\"]|require\\(['\"][^'\"]*better-sqlite3['\"]\\)|import .*\\bsqlite3\\b|from ['\"][^'\"]*sqlite['\"])" src scripts

# 2) Raw SQL in routes (multiline-aware best-effort)
RAW_SQL_ROUTES="$(mktemp)"
node <<'NODE' >"$RAW_SQL_ROUTES"
const fs = require('fs');
const path = require('path');

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

for (const file of walk('src/server/routes')) {
  const txt = fs.readFileSync(file, 'utf8');
  const patterns = [
    /`[\s\S]{0,400}\b(SELECT|INSERT|UPDATE|DELETE|WITH)\b[\s\S]{0,400}`/g,
    /['"][^'"\n]{0,200}\b(SELECT|INSERT|UPDATE|DELETE|WITH)\b[^'"\n]{0,200}['"]/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(txt)) !== null) {
      const snippet = m[0];
      if (/GET|POST|PUT|PATCH|DELETE\s+\/api\//.test(snippet)) continue; // route docs/comments
      const before = txt.slice(Math.max(0, m.index - 120), m.index);
      if (!/prepare\s*\(|query\s*\(|const\s+\w+\s*=/.test(before + snippet.slice(0, 80))) continue;
      const line = txt.slice(0, m.index).split('\n').length;
      console.log(`${file}:${line}:${snippet.split('\n')[0].slice(0, 120)}`);
    }
  }
}
NODE
if [ -s "$RAW_SQL_ROUTES" ]; then
  report_fail "Raw SQL in routes"
  cat "$RAW_SQL_ROUTES"
else
  report_pass "Raw SQL in routes"
fi

# 3) TODO comments without ticket reference
TODO_ALL="$(mktemp)"
TODO_BAD="$(mktemp)"
trap 'rm -f "$TODO_ALL" "$TODO_BAD" /tmp/tech_debt_scan_match.txt' EXIT
"${RG_BASE[@]}" "TODO" src scripts >"$TODO_ALL" || true
if [ -s "$TODO_ALL" ]; then
  rg -n -v "TODO[^\\n]*(#[0-9]+|[A-Z]{2,}-[0-9]+)" "$TODO_ALL" >"$TODO_BAD" || true
fi
if [ -s "$TODO_BAD" ]; then
  report_fail "TODO comments without ticket reference"
  cat "$TODO_BAD"
else
  report_pass "TODO comments without ticket reference"
fi

# 4) console.log in server
run_rg_fail_on_match "console.log in server" "console\\.log\\(" src/server src/server.ts

# 5) Any file > 1500 lines
BIG_FILES="$(mktemp)"
find src scripts -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.sh' \) \
  -not -path '*/node_modules/*' -not -path '*/dist/*' \
  | while read -r f; do
      lines=$(wc -l <"$f" | tr -d ' ')
      if [ "$lines" -gt 1500 ]; then
        echo "$f:$lines"
      fi
    done >"$BIG_FILES"
if [ -s "$BIG_FILES" ]; then
  report_fail "Any file > 1500 lines (flag for decomposition)"
  cat "$BIG_FILES"
else
  report_pass "Any file > 1500 lines"
fi

# 6) Any route > 300 lines
BIG_ROUTES="$(mktemp)"
find src/server/routes -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null \
  | while read -r f; do
      lines=$(wc -l <"$f" | tr -d ' ')
      if [ "$lines" -gt 300 ]; then
        echo "$f:$lines"
      fi
    done >"$BIG_ROUTES"
if [ -s "$BIG_ROUTES" ]; then
  report_fail "Any route > 300 lines (flag)"
  cat "$BIG_ROUTES"
else
  report_pass "Any route > 300 lines"
fi

# 7) Any repository file > 1000 lines
BIG_REPOS="$(mktemp)"
find src/server/db -type f -name '*Repository*.ts' 2>/dev/null \
  | while read -r f; do
      lines=$(wc -l <"$f" | tr -d ' ')
      if [ "$lines" -gt 1000 ]; then
        echo "$f:$lines"
      fi
    done >"$BIG_REPOS"
if [ -s "$BIG_REPOS" ]; then
  report_fail "Any repository file > 1000 lines (flag)"
  cat "$BIG_REPOS"
else
  report_pass "Any repository file > 1000 lines"
fi

# 8) Any function > 150 lines (best-effort scanner)
FUNC_LONG="$(mktemp)"
node <<'NODE' >"$FUNC_LONG"
const fs = require('fs');
const path = require('path');

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'data') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = [...walk('src'), ...walk('scripts')];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inFn = false;
  let braceDepth = 0;
  let fnStart = 0;
  let fnSig = '';
  let fnBaseDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inFn) {
      const m = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(|^\s*(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/);
      if (m) {
        inFn = true;
        fnStart = i + 1;
        fnSig = m[1] || m[2] || '<anonymous>';
        fnBaseDepth = braceDepth;
      }
    }
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }
    if (inFn && braceDepth <= fnBaseDepth) {
      const len = (i + 1) - fnStart + 1;
      if (len > 150) {
        console.log(`${file}:${fnStart}:${fnSig}:${len}`);
      }
      inFn = false;
      fnSig = '';
    }
  }
}
NODE
if [ -s "$FUNC_LONG" ]; then
  report_fail "Any function > 150 lines (best-effort static scan)"
  cat "$FUNC_LONG"
else
  report_pass "Any function > 150 lines"
fi

# 9) Any useEffect without dependency array + suppressed eslint
USEEFFECT_SCAN="$(mktemp)"
node <<'NODE' >"$USEEFFECT_SCAN"
const fs = require('fs');
const path = require('path');

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

for (const file of walk('src/client')) {
  const txt = fs.readFileSync(file, 'utf8');
  if (/eslint-disable(?:-next-line)?\s+react-hooks\/exhaustive-deps/.test(txt)) {
    console.log(`${file}:eslint-disable react-hooks/exhaustive-deps`);
  }
  const lines = txt.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('useEffect(')) continue;
    let window = lines.slice(i, Math.min(lines.length, i + 12)).join('\n');
    if (!/\],?\s*\)/.test(window) && !/\[\s*\]\s*\)/.test(window)) {
      console.log(`${file}:${i + 1}:useEffect without dependency array (best-effort)`);
    }
  }
}
NODE
if [ -s "$USEEFFECT_SCAN" ]; then
  if rg -n "eslint-disable react-hooks/exhaustive-deps" "$USEEFFECT_SCAN" >/dev/null 2>&1; then
    report_fail "Any useEffect with suppressed eslint"
    rg -n "eslint-disable react-hooks/exhaustive-deps" "$USEEFFECT_SCAN" || true
  else
    report_pass "Any useEffect with suppressed eslint"
  fi
  if rg -n "useEffect without dependency array" "$USEEFFECT_SCAN" >/dev/null 2>&1; then
    report_fail "Any useEffect without dependency array"
    rg -n "useEffect without dependency array" "$USEEFFECT_SCAN" || true
  else
    report_pass "Any useEffect without dependency array"
  fi
else
  report_pass "Any useEffect with suppressed eslint"
  report_pass "Any useEffect without dependency array"
fi

echo
echo "[SUMMARY] tech_debt_scan failures=$FAILURES"
if [ "$FAILURES" -gt 0 ]; then
  exit 1
fi
