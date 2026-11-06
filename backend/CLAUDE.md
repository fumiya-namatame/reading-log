# reading-log バックエンド（Spring Boot）

アプリ全体の概要と Claude との役割分担は、ルートの `CLAUDE.md` を参照。

## 技術スタック

- Java 25（`pom.xml` の `java.version` で指定）
- Spring Boot 4.1（Spring Web MVC、Spring Data JPA、Bean Validation）
- H2 Database（開発用のインメモリ DB）
- Maven（Maven Wrapper の `./mvnw` を使う）
- JUnit 5（テスト）

## よく使うコマンド

すべて `backend/` で実行する。

- アプリ起動: `./mvnw spring-boot:run`
- テスト: `./mvnw test`
- コンパイル（型チェック）: `./mvnw compile`

## コーディング規約

- パッケージは `com.example.backend` 配下に置く
- パッケージは機能ごとではなく層ごとに分ける

  | パッケージ   | 置くもの                                          | 例                    |
  | ------------ | ------------------------------------------------- | --------------------- |
  | `controller` | HTTP リクエストを受ける `@RestController`         | `BookController`      |
  | `service`    | ビジネスロジックをまとめる `@Service`             | `BookService`         |
  | `repository` | DB を操作する `JpaRepository` の継承インターフェース | `BookRepository`      |
  | `entity`     | DB のテーブルに対応する `@Entity`                 | `Book`                |
  | `dto`        | API で受け渡しするリクエスト・レスポンスの型      | `BookRequest` など    |

- テストクラスは、テスト対象と同じパッケージに置く（例: `src/test/java/com/example/backend/repository/BookRepositoryTest.java`）

## 変更後の確認

- バックエンドを変更したら、必ず `./mvnw test` を実行して結果を報告する（コンパイルも含まれるため、型チェックを兼ねる）
