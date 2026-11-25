#!/usr/bin/env bash
# block-dangerous.sh のテスト。偽の入力 JSON を流して、deny / ask / allow を確かめる
#   実行: bash .claude/hooks/test-block-dangerous.sh
set -uo pipefail

hook="$(cd "$(dirname "$0")" && pwd)/block-dangerous.sh"
pass=0
fail=0

# check <期待値 deny|ask|allow> <ツール名> <コマンド or ファイルパス>
check() {
  local expected=$1 tool=$2 arg=$3 json actual
  if [ "$tool" = "Bash" ]; then
    json=$(jq -n --arg c "$arg" '{tool_name: "Bash", tool_input: {command: $c}}')
  else
    json=$(jq -n --arg t "$tool" --arg f "$arg" '{tool_name: $t, tool_input: {file_path: $f}}')
  fi
  actual=$(printf '%s' "$json" | "$hook" | jq -r '.hookSpecificOutput.permissionDecision // empty')
  actual=${actual:-allow}
  if [ "$actual" = "$expected" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf 'NG: 期待 %s / 結果 %s\n    %s\n' "$expected" "$actual" "$arg"
  fi
}

echo "--- rm: 止める"
check deny Bash 'rm -rf .'
check deny Bash 'rm -rf /'
check deny Bash 'rm -rf ~'
check deny Bash 'rm -fr *'
check deny Bash 'rm -r ..'
check deny Bash 'rm -rf "$HOME"'
check deny Bash 'rm --recursive ./*'
check deny Bash '/bin/rm -rf .'
check deny Bash 'sudo rm -rf /'
check deny Bash 'cd /tmp && rm -rf .'
check deny Bash 'ls; rm -rf .'
check deny Bash 'echo ok | xargs rm -rf .'
check deny Bash 'bash -c "rm -rf ."'
check deny Bash '(cd frontend && rm -rf .)'
check deny Bash $'cat file\nrm -rf .'

echo "--- rm: 許可（誤検知しない）"
check allow Bash 'rm -rf frontend/node_modules'
check allow Bash 'rm -rf ./dist'
check allow Bash 'rm -f .env.local.bak'
check allow Bash 'rm file.txt'
check allow Bash 'git commit -m "rm -rf . を禁止する hook を追加"'
check allow Bash "echo 'rm -rf /'"
check allow Bash 'gh pr create --body "説明: rm -rf . → 拒否; rm -rf / も拒否"'
check allow Bash $'gh pr create --body "$(cat <<\'EOF\'\n- `rm -rf .` → 拒否\nrm -rf /\nEOF\n)"'
check allow Bash 'grep -rn "rm -rf" .claude/hooks'

echo "--- git push"
check deny Bash 'git push --force'
check deny Bash 'git push -f origin main'
check deny Bash 'git push --force-with-lease'
check deny Bash 'git add . && git push -uf origin main'
check allow Bash 'git push -u origin feature/add-hooks'
check allow Bash 'git commit -m "git push --force を禁止"'

echo "--- 変更を捨てる git コマンド"
check ask Bash 'git reset --hard'
check ask Bash 'git reset --hard HEAD~1'
check ask Bash 'git clean -fd'
check ask Bash 'git checkout .'
check ask Bash 'git checkout -- .'
check ask Bash 'git restore .'
check allow Bash 'git reset HEAD file.txt'
check allow Bash 'git checkout -b feature/x'
check allow Bash 'git commit -m "git reset --hard の確認を追加"'
check deny Bash 'git reset --hard && rm -rf .'

echo "--- .env"
check deny Read /Users/x/project/.env
check deny Edit /Users/x/project/backend/.env.local
check allow Read /Users/x/project/.env.example
check allow Write /Users/x/project/README.md

echo
echo "成功: $pass / 失敗: $fail"
[ "$fail" -eq 0 ]
