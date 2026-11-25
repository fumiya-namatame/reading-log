#!/usr/bin/env bash
# PreToolUse: 危険な操作を止める
#   - Bash: 強制 push、広い範囲の rm -rf → 拒否
#           git reset --hard、git clean、git checkout/restore で変更を捨てる → 確認を出す
#   - Read/Edit/Write: .env ファイル → 拒否
#
# Bash のコマンドは、文字列全体ではなく「&& ; | などで区切った 1 つ 1 つのコマンド」の
# 先頭を見て判定する。PR 本文やコミットメッセージの中に「rm -rf .」と書いてあるだけで
# 止めてしまう誤検知を防ぐため。
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

# コマンド文字列を、1 行に 1 コマンドずつに分ける
#   1. ヒアドキュメントの本文を消す（<<EOF の行の残りは残す）
#   2. 引用符の中の区切り文字を空白にしてから、引用符を外す
#      → "a; rm -rf ." は 1 つの引数として、前のコマンドに残る
#   3. && || ; & | 改行 ( ) { } ` $( で区切る
split_commands() {
  perl -0777 -ne '
    s/<<-?[ \t]*(["\x27]?)(\w+)\1([^\n]*)\n.*?^[ \t]*\2[ \t]*$/ $3/gsm;
    s{\x27([^\x27]*)\x27|"((?:[^"\\]|\\.)*)"}{
      my $s = defined $1 ? $1 : $2;
      $s =~ s/[;&|\n(){}`]/ /g;
      $s
    }gse;
    print "$_\n" for split /\$\(|&&|\|\||[;&|\n(){}`]/;
  '
}

# コマンドの前に付く sudo、env、変数代入、bash -c などを外して、本体のコマンドにする
strip_prefix() {
  local seg=$1
  seg="${seg#"${seg%%[![:space:]]*}"}"
  local re='^(sudo|command|exec|nohup|time|eval|env|xargs|[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*|[a-z]*sh[[:space:]]+-[a-z]*c|-[a-zA-Z0-9-]+)[[:space:]]+(.*)$'
  while [[ $seg =~ $re ]]; do
    seg=${BASH_REMATCH[2]}
  done
  printf '%s' "$seg"
}

if [ "$tool" = "Bash" ]; then
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input")

  deny_reason=""
  ask_reason=""

  while IFS= read -r seg; do
    seg=$(strip_prefix "$seg")
    [ -z "$seg" ] && continue

    # 強制 push（--force-with-lease も含めて止める）
    if [[ $seg =~ ^git[[:space:]]+push([[:space:]]|$) ]] &&
      [[ $seg =~ [[:space:]](--force[^[:space:]]*|-[a-zA-Z]*f[a-zA-Z]*)([[:space:]]|$) ]]; then
      deny_reason="強制 push は hooks で禁止しています。必要ならユーザーが自分で実行してください。"
    fi

    # rm -r でルート・ホーム・カレント・親・ワイルドカードを消す
    if [[ $seg =~ ^(/[^[:space:]]*/)?rm[[:space:]] ]] &&
      [[ $seg =~ [[:space:]](-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)([[:space:]]|$) ]] &&
      [[ $seg =~ [[:space:]](/|/\*|~|~/|~/\*|\$HOME|\$HOME/|\$\{HOME\}|\$\{HOME\}/|\.|\./|\.\.|\.\./|\*|\./\*)([[:space:]]|$) ]]; then
      deny_reason="広い範囲を消す rm -r は hooks で禁止しています。消す対象を具体的なパスで指定してください。"
    fi

    # コミットしていない変更を捨てる git コマンド
    if [[ $seg =~ ^git[[:space:]]+(reset[[:space:]]+(.*[[:space:]])?--hard|clean[[:space:]]+(.*[[:space:]])?-[a-zA-Z]*f|checkout[[:space:]]+(--[[:space:]]+)?\.([[:space:]]|$)|restore[[:space:]]+(.*[[:space:]])?\.([[:space:]]|$)) ]]; then
      ask_reason="コミットしていない変更が消える git コマンドです。実行してよいか確認してください。"
    fi
  done < <(printf '%s' "$cmd" | split_commands)

  # 拒否を確認より優先する
  [ -n "$deny_reason" ] && decide deny "$deny_reason"
  [ -n "$ask_reason" ] && decide ask "$ask_reason"
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
