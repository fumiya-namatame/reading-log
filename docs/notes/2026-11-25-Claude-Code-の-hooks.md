# Claude Code の hooks

## 今回のテーマ・やったこと

- Claude Code の hooks を 3 つ作った（`.claude/settings.json` と `.claude/hooks/` のスクリプト）
  - Claude がファイルを編集したら、frontend のファイルに Prettier をかける
  - 危ないコマンドや `.env` の読み書きを止める
  - Claude が応答を終える前に、変更のあるディレクトリの型チェック・テストを実行する
- backend のテストが Java のバージョン違いで動かなかったので、Java 25 を入れて `~/.zshrc` を切り替えた

## 学んだこと

### hooks とは

Claude Code の決まったタイミングで、自動でコマンドを実行する仕組み。
CLAUDE.md に「変更後は必ずテストを実行する」と書くのは Claude へのお願いだが、hooks は Claude Code 本体が実行するので、必ず動く。

- 設定場所: `.claude/settings.json`（チームで共有・コミットする）。個人用は `.claude/settings.local.json`
- 設定の確認・無効化は `/hooks` でできる。成功した hook は画面に何も出ない

### 今回使ったイベント

| イベント      | タイミング                 | 今回の用途                         |
| ------------- | -------------------------- | ---------------------------------- |
| `PreToolUse`  | ツールを実行する前（止められる） | 危ないコマンド・`.env` をブロック |
| `PostToolUse` | ツールが成功した後         | 編集したファイルに Prettier        |
| `Stop`        | Claude が応答を終える前    | 型チェック・テスト                 |

- `matcher` で対象のツールを絞る（例: `"Write|Edit"`、`"Bash|Read|Edit|Write"`）
- コマンドからはプロジェクトのルートを `$CLAUDE_PROJECT_DIR` で参照できる

### hook とのやり取りは JSON

- **入力**: 標準入力に JSON が渡される。`tool_name`、`tool_input.file_path`、`tool_input.command` などを `jq` で取り出す
- **出力**: 標準出力に JSON を返すと、Claude Code の動きを変えられる
  - `PreToolUse`: `hookSpecificOutput.permissionDecision` を `deny`（拒否）か `ask`（ユーザーに確認）にする
    - 強制 push、広い範囲の `rm -r`、`.env` → `deny`
    - `git reset --hard`、`git clean -f` など、コミット前の変更が消えるもの → `ask`
  - `Stop`: `{"decision": "block", "reason": "..."}` を返すと、Claude は止まらず、`reason` を読んで作業を続ける
    - テストが失敗したら結果を `reason` に入れて、Claude に直させる
    - backend のビジネスロジックが原因なら、直さずヒントを伝えるように `reason` に書いた（自分で書く役割分担のため）
  - `systemMessage` はユーザーへの表示だけで、Claude を止めない

### Stop フックの無限ループ対策

`block` すると Claude が作業を続け、また Stop フックが動く。
直せない失敗だと永遠に止まれないので、入力 JSON の `stop_hook_active` が `true`（hook による続きの作業中）のときは `block` せず、`systemMessage` で知らせるだけにした。

### 同じテストを何度も実行しない工夫

Stop は毎回の応答の終わりに動く。質問に答えただけのときも動くので、そのたびに `./mvnw test` が走ると遅い。

- `git diff HEAD` と未追跡ファイルの内容からハッシュを作り、テストが通ったときのハッシュを `.git/claude-stop-check/` に保存
- 次回、ハッシュが同じ（＝変更がない）ならスキップ。実際に約 5 秒が約 0.06 秒になった
- `.git/` の中に置くので、コミットされない

### hook の作り方・確かめ方

1. スクリプトを `.claude/hooks/` に置き、settings.json からはそれを呼ぶ（JSON の中に長いコマンドを書くより読みやすい）
2. 偽の入力 JSON をパイプで流して、単体で試す
   ```bash
   echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf ."}}' | .claude/hooks/block-dangerous.sh
   ```
3. Claude の実際の操作で発火するか試す（書式を崩したファイルを Edit → Prettier で直った、`rm -rf .` → 拒否された）

### Java のバージョンと JAVA_HOME

- `pom.xml` の `java.version` は 25 なのに、Mac には Java 17 しか入っていなかった
- Homebrew の `openjdk@25` は「keg-only」で、入れただけでは使われない。`JAVA_HOME` で場所を指定する
- `/usr/libexec/java_home -v 25` は、25 が登録されていないと**エラーにならず 17 を返す**ので、Homebrew のパスを直接書いた
- 実行中のプログラム（Claude Code も）は、起動したときの環境変数を使い続ける。`~/.zshrc` を変えたら、再起動が必要

## 自分で書いたコードと、その意味

なし（hooks のスクリプトと設定は Claude が作成した）

## つまずいた点・疑問

- **`rm -rf` の判定が効かなかった**
  - 最初の正規表現では、`-rf ` の後ろの空白を先に使ってしまい、対象（`/` など）の前の空白にマッチしなかった
  - 「`rm` に `-r` フラグがある」と「危ない対象がある」の 2 段に分けて判定するように直した
- **hook はコマンド全体を止める**
  - `cat ... && rm テストファイル && rm -rf .` を試したら、危ない部分だけでなく全体が拒否され、テストファイルも消えなかった
- **backend のテストが「リリース・バージョン25はサポートされていません」で失敗した**
  - hook の問題ではなく、Java 17 で Java 25 のコードをコンパイルしようとしていたため
  - `brew install openjdk@25` で入れて、`~/.zshrc` の `JAVA_HOME` を 25 に変えて解決（元のファイルは `~/.zshrc.bak-java17`）
- `vitest` は `npm run test:unit` だと監視モードで終わらないので、hook では `npx vitest run` を使った

## 次にやること・調べたいこと

- Claude Code を再起動して、Java 25 の環境で Stop フックが動くか確かめる
- `.claude/hooks/` と `.claude/settings.json` をコミットして PR を作る
