#!/usr/bin/env bash
# Stop: 応答を終える前に、変更のあるディレクトリの型チェック・テストを実行する
#   - frontend: npm run type-check と vitest run
#   - backend:  ./mvnw test（コンパイルも含む）
# 失敗したら decision: block を返し、Claude に結果を伝えて続きの作業をさせる。
# 前回成功したときから変更がなければ、もう一度は実行しない。
set -uo pipefail

input=$(cat)
project="$CLAUDE_PROJECT_DIR"
cd "$project"

# 前回成功したときの変更内容のハッシュを置く場所（git の管理外）
state_dir="$project/.git/claude-stop-check"
mkdir -p "$state_dir"

# ディレクトリの「今の変更内容」をハッシュにする（コミット済みとの差分 + 未追跡ファイル）
changes_hash() {
  local dir=$1
  {
    git diff HEAD -- "$dir"
    git ls-files --others --exclude-standard -z -- "$dir" | xargs -0 -r shasum
  } | shasum | cut -d' ' -f1
}

has_changes() {
  [ -n "$(git status --porcelain -- "$1")" ]
}

failures=""

# run_check <ディレクトリ> <表示名> <コマンド...>
run_check() {
  local dir=$1 label=$2
  shift 2
  has_changes "$dir" || return 0

  local hash
  hash=$(changes_hash "$dir")
  [ "$(cat "$state_dir/$dir" 2>/dev/null)" = "$hash" ] && return 0

  local log
  if log=$(cd "$project/$dir" && "$@" 2>&1); then
    echo "$hash" >"$state_dir/$dir"
  else
    rm -f "$state_dir/$dir"
    # 出力が長いと読みにくいので、末尾だけを渡す
    failures+="### $dir: $label が失敗しました"$'\n'"$(tail -n 60 <<<"$log")"$'\n\n'
  fi
}

run_check frontend "型チェック・テスト" bash -c 'npm run type-check && npx vitest run'
run_check backend "テスト（./mvnw test）" ./mvnw -q test

[ -z "$failures" ] && exit 0

# 直してもまだ失敗するときに止まり続けないよう、2回目は block しないで知らせるだけにする
if [ "$(jq -r '.stop_hook_active // false' <<<"$input")" = "true" ]; then
  jq -n '{systemMessage: "型チェック・テストがまだ失敗しています。結果を確認してください。"}'
  exit 0
fi

reason="型チェック・テストが失敗しました。原因を調べて直してください。
ただし backend のビジネスロジック（service など）が原因なら、自分で実装を直さず、原因と直し方のヒントをユーザーに伝えてください。

$failures"
jq -n --arg r "$reason" '{decision: "block", reason: $r}'
