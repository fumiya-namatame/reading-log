# Spring Boot で本の API を作る（一覧・登録・更新・削除・検索）

## 要点（3行）

- Entity → Repository → Service → Controller の4層で、Vue 側の `types` → `bookStorage` → `useBooks` と同じ分け方になっている
- 「毎回同じ道具」はフィールド + コンストラクタ（DI）、「呼ばれるたびに変わるデータ」はメソッドの引数
- `null` と空文字は別物。`null` チェックを先に書かないと、一番よく使う「全件取得」が落ちる

## 今回のテーマ・やったこと

- Spring Boot（Java 25 / Maven）のプロジェクトを作り、本の API を一覧・登録・更新・削除・検索まで作った
- `backend/CLAUDE.md` に「1クラスずつ作って説明する」「Service の中身は自分で書く」という学習用の分担を書いた
- CORS エラーは Vite のプロキシ（`/api` を `localhost:8080` に転送）で解決する方針にした

## 学んだこと

### フロントとの対応

| Spring Boot | 役割 | Vue 側で近いもの |
|---|---|---|
| Entity | DB のテーブル1行を表す入れ物 | `types/book.ts` |
| DTO（`BookRequest`） | API でやりとりするデータの形 | `BookInput`（id なし） |
| Repository | DB とのやりとり | `utils/bookStorage.ts` |
| Service | 判断・ルール・処理の中身 | `composables/useBooks.ts` |
| Controller | API の入口（HTTP の窓口） | なし |

| Vue（npm） | Spring Boot（Maven） |
|---|---|
| `package.json` | `pom.xml` |
| `npm run dev` | `./mvnw spring-boot:run` |
| `npm run test:unit` | `./mvnw test` |
| `node_modules/` | `~/.m2/` |

`pom.xml` の依存関係にバージョンが無いのは、`<parent>` の Spring Boot のバージョンに合わせて自動で決まるため。

### Entity とアノテーション

- `@Entity`：このクラスは DB のテーブルに対応する
- `@Id`：主キー
- `@GeneratedValue(strategy = GenerationType.UUID)`：保存時に ID が自動で振られる（フロントの `crypto.randomUUID()` と同じ形式）
- 引数なしコンストラクタ：JPA が「空の入れ物を作ってから値を詰める」ために必要
- ID に setter が無いのは、あとから書き換えないため
- Entity の getter / setter は「値を読み書きするもの」で、DB の取得・保存は Repository の仕事

### Java ではクラスが型にもなる

`Book book = new Book(...)` の左の `Book` は型、右の `new Book` は設計図から実物を作る指定。TypeScript の型は形の約束だけだが、Java のクラスは型であり設計図でもある。

### Repository：書かなくても使えるメソッド

`extends JpaRepository<Book, UUID>` と書くだけで、`findAll()` `findById()` `save()` `deleteById()` が使える。配列に `filter` が最初からあるのと同じ。

### DI（依存性の注入）

```java
private final BookRepository bookRepository;

public BookService(BookRepository bookRepository) {
    this.bookRepository = bookRepository;
}
```

- `import` は「型（設計図）を持ってくる」だけ。実物は Spring が作って、コンストラクタの引数で渡してくれる
- 差し替えられるので、テストのときだけ偽物の Repository を渡せる（フロントのモックと同じ発想）
- **道具と注文票の違い**：Repository のような毎回同じ道具はフィールド + コンストラクタ。`BookRequest` のように呼ばれるたびに中身が変わるものはメソッドの引数。`BookRequest` をフィールドにすると、Spring が用意できないので起動時にエラーになる

### Service は「判断する場所」

Controller はホール係、Service は料理人、Repository は食材庫の係。今の一覧取得は「呼んで返すだけ」だが、読了日の未来チェックやログイン中の人の本だけを返す、といった判断は Service に書く。

### Controller のアノテーション

- `@RestController` / `@RequestMapping("/api/books")`：API の入口。戻り値は JSON になる
- `@GetMapping` / `@PostMapping` / `@PutMapping("/{id}")` / `@DeleteMapping("/{id}")`：HTTP メソッドごとの受け口
- `@RequestBody`：送られた JSON を `BookRequest` に変換する
- `@Valid`：`BookRequest` のルール（`@NotBlank` など）でチェックし、違反なら呼ばれずに 400
- `@PathVariable`：URL の `{id}` を取り出す。UUID でない値は 400
- `@RequestParam(required = false)`：`?keyword=...` を取り出す。無いときは `null`
- `@ResponseStatus`：成功時のステータス（登録は 201、削除は 204）

削除は「存在しない ID でも 204」にしている。もう無いなら削除したのと同じ結果、という設計判断。

### Optional と 404

- `findById` の戻り値は `Optional<Book>`（`Book | undefined` に近い）
- `.orElseThrow(...)` で「あれば取り出す、空なら例外」
- Service は HTTP を知らない `NoSuchElementException` を投げ、Controller の `@ExceptionHandler` が 404 に変換する
- 注意：このハンドラは Controller 内のすべての `NoSuchElementException` を 404 にするので、別のバグも 404 に見えてしまう。発展先として、専用の例外クラス + `@RestControllerAdvice` がある

### `null` と空文字は別物

| リクエスト | `keyword` |
|---|---|
| `GET /api/books` | `null` |
| `GET /api/books?keyword=` | `""` |
| `GET /api/books?keyword=%20` | `" "` |

- `isBlank()` は「空、または空白だけ」なら `true`（`isEmpty()` はスペースだけだと `false`）
- `null` に `.isBlank()` を呼ぶと `NullPointerException`
- `a == null || a.isBlank()` は左から評価され、左が `true` なら右は実行されない
- TypeScript の `!keyword` のような「まとめて偽扱い」は Java に無いので、別々に書く

### Spring Data JPA のメソッド名規則

`findBy` + 項目名 + 条件で SQL が自動で作られる。

```java
List<Book> findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(String title, String author);
```

- `Containing`：部分一致、`IgnoreCase`：大文字小文字を区別しない、`Or`：または
- 綴りや存在しない項目名は、起動時にエラーになる

### record のアクセサ

`public record BookRequest(...)` の値は `request.title()` のようにカッコ付きで取り出す（TypeScript の `input.title` との違い）。

## 自分で書いたコードと、その意味

```java
// BookService.java：一覧取得
return bookRepository.findAll();

// BookService.java：登録
Book book = new Book(request.title(), request.author(), request.finishedDate(), request.review());
return bookRepository.save(book);

// BookService.java：検索（修正後の形）
public List<Book> search(String keyword) {
    if (keyword == null || keyword.isBlank()) {
        return bookRepository.findAll();
    }
    String trimmed = keyword.strip();
    return bookRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(trimmed, trimmed);
}
```

- 登録：リクエストから Entity を作り、保存して、ID つきの結果を返す
- 検索：`null` と空白だけは先に弾いて全件を返し、それ以外は前後の空白を取って検索する
- 更新（`update`）：`findById` → `orElseThrow` → 4項目を setter で書き換え → `save`。Claude Code が `NoSuchElementException` + `@ExceptionHandler` の形にした部分を、内容を確認して採用した

## つまずいた点・疑問

- **起動してもすぐ終了した**：`pom.xml` に `spring-boot-starter` と test しか無く、選んだ5つの依存関係が入っていなかった。生成前に Dependencies 欄を確認して作り直した
- **`java version` でエラー**：`java -version` とハイフンが必要だった
- **`findById` の戻り値の型エラー**：`Optional<Book>` を `Book` に入れようとしていた
- **検索で `strip()` が `null` チェックより前にあった**：keyword なしの全件取得が `NullPointerException` で落ちるバグ。`null` チェックを先にして修正した
- **疑問として残っていること**：パッケージ構成を「機能ごと（book/）」にするか「層ごと」にするか（層ごとを勧められた）。最終的にどちらにしたかは要確認

## Claude Code の使い方（任せたこと／自分で判断したこと／指示を直したこと）

- **任せた**：雛形（Entity / Repository / Controller / DTO）、アノテーションの説明、テスト作成
- **自分で書いた**：Service の一覧取得・登録・検索
- **指示を直した**：Claude Code が複数のクラスを一気に作ったので、「作ったファイルを1つずつ説明して、次へと言うまで止まる」「まだ変更しない」と明示した。Service が省かれそうなときは、最初の計画どおり作るよう伝えた
- **許可確認の判断**：`git checkout` は後ろに付くもので意味が変わるので中身を見る。「always allow」や auto mode は選ばない。読むだけのコマンドと、プロジェクト外の読み取りは内容を見て判断した
- **提案を比べた**：404 の処理で、`ResponseStatusException` ではなく、Service が HTTP を知らない形（`NoSuchElementException` + `@ExceptionHandler`）のほうが設計として良いと分かった

## 次にやること・調べたいこと

- 更新（PUT）の 404 と、検索（keyword が `null` / 空 / 一致なし）のテストが入っているか確認する
- `BookService.findAll()` が使われなくなったので、残すか消すか決める
- Hooks で、編集後に `./mvnw test` と `vue-tsc` を自動実行する
- ログイン機能（Spring Security）の前に、`/clear` と `/compact` を使ってみる
- `BookNotFoundException` + `@RestControllerAdvice` の形を調べる
