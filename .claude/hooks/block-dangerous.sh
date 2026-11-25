#!/usr/bin/env bash
# PreToolUse: 危険な操作を止める
#   - Bash: 強制 push、広い範囲の rm -rf → 拒否
#           git reset --hard、git clean、git checkout/restore で変更を捨てる → 確認を出す
#   - Read/Edit/Write: .env ファイル → 拒否
set -euo pipefail

input=$(cat)
tool=$(jq -r '.tool_name' <<<"$input")

# permissionDecision（deny / ask）と理由を JSON で返す
decide() {
  jq -n --arg d "$1" --arg r "$2" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: $d,
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

if [ "$tool" = "Bash" ]; then
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input")

  # 強制 push（--force-with-lease も含めて止める）
  if grep -Eq 'git[[:space:]]+push\b.*(--force|[[:space:]]-[a-zA-Z]*f)' <<<"$cmd"; then
    decide deny "強制 push は hooks で禁止しています。必要ならユーザーが自分で実行してください。"
  fi

  # rm -rf でルート・ホーム・カレント・親・ワイルドカードを消す
  if grep -Eq '(^|[^[:alnum:]_-])rm[[:space:]]+(.*[[:space:]])?-[a-zA-Z]*[rR]' <<<"$cmd" &&
    grep -Eq '[[:space:]](/|/\*|~|~/|\$HOME|\$HOME/|\.|\./|\.\.|\.\./|\*|\./\*)([[:space:];&|]|$)' <<<"$cmd"; then
    decide deny "広い範囲を消す rm -r は hooks で禁止しています。消す対象を具体的なパスで指定してください。"
  fi

  # コミットしていない変更を捨てる git コマンド
  if grep -Eq 'git[[:space:]]+(reset[[:space:]]+.*--hard|clean[[:space:]]+-[a-zA-Z]*f|checkout[[:space:]]+(--[[:space:]]+)?\.([[:space:]]|$)|restore[[:space:]]+(.*[[:space:]])?\.([[:space:]]|$))' <<<"$cmd"; then
    decide ask "コミットしていない変更が消える git コマンドです。実行してよいか確認してください。"
  fi

  exit 0
fi

# .env ファイルの読み書き（.env.example などのサンプルは許可）
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
base=$(basename "$file")
case "$base" in
  .env.example | .env.sample) exit 0 ;;
  .env | .env.*) decide deny ".env には秘密情報が入るため、Claude からの読み書きを禁止しています。" ;;
esac

exit 0
