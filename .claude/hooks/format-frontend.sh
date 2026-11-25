#!/usr/bin/env bash
# PostToolUse（Write|Edit）: Claude が編集した frontend のファイルに Prettier をかける
set -euo pipefail

# stdin の JSON から、編集されたファイルのパスを取り出す
file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[ -z "$file" ] && exit 0

frontend_dir="$CLAUDE_PROJECT_DIR/frontend"

# frontend/src 以下のファイルだけを対象にする
case "$file" in
  "$frontend_dir"/src/*) ;;
  *) exit 0 ;;
esac

# Prettier が扱う拡張子だけを対象にする
case "$file" in
  *.vue | *.ts | *.js | *.css | *.json) ;;
  *) exit 0 ;;
esac

cd "$frontend_dir"
./node_modules/.bin/prettier --write --log-level warn "$file"
