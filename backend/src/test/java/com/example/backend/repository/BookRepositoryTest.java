package com.example.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.example.backend.entity.Book;

/**
 * BookRepository のテスト。
 * JPA まわりだけを起動し、data.sql のサンプルデータが読めるか・保存できるかを確認する。
 */
@DataJpaTest
class BookRepositoryTest {

    @Autowired
    private BookRepository bookRepository;

    @Test
    void サンプルデータの3冊が取得できる() {
        List<Book> books = bookRepository.findAll();

        assertThat(books).hasSize(3);
        assertThat(books).extracting(Book::getTitle)
                .containsExactlyInAnyOrder("吾輩は猫である", "羅生門", "銀河鉄道の夜");
    }

    @Test
    void 保存するとIDが自動で振られる() {
        Book saved = bookRepository.save(
                new Book("坊っちゃん", "夏目漱石", LocalDate.of(2026, 11, 1), "痛快だった"));

        assertThat(saved.getId()).isNotNull();
        assertThat(bookRepository.findById(saved.getId())).isPresent();
    }

    @Test
    void deleteByIdで指定した本だけが削除される() {
        UUID id = UUID.fromString("11111111-1111-1111-1111-111111111111"); // data.sql の「吾輩は猫である」

        bookRepository.deleteById(id);

        assertThat(bookRepository.findById(id)).isEmpty();
        assertThat(bookRepository.findAll()).hasSize(2);
    }

    @Test
    void タイトルの一部で検索するとその本だけがヒットする() {
        // findByTitleContainingOrAuthorContaining は、同じキーワードを 2 回渡して使う
        List<Book> result = bookRepository.findByTitleContainingOrAuthorContaining("猫", "猫");

        assertThat(result).extracting(Book::getTitle).containsExactly("吾輩は猫である");
    }

    @Test
    void 著者の一部で検索するとその著者の本だけがヒットする() {
        List<Book> result = bookRepository.findByTitleContainingOrAuthorContaining("芥川", "芥川");

        assertThat(result).extracting(Book::getTitle).containsExactly("羅生門");
    }

    @Test
    void タイトルにも著者にも含まれないキーワードでは0件になる() {
        List<Book> result = bookRepository.findByTitleContainingOrAuthorContaining("坊っちゃん", "坊っちゃん");

        assertThat(result).isEmpty();
    }

    @Test
    void タイトルと著者の両方に含まれる本も1回だけ返る() {
        // タイトルにも著者にも「宮沢」を含む本を追加する
        bookRepository.save(new Book("宮沢賢治の世界", "宮沢賢治", null, ""));

        List<Book> result = bookRepository.findByTitleContainingOrAuthorContaining("宮沢", "宮沢");

        assertThat(result).extracting(Book::getTitle)
                .containsExactlyInAnyOrder("銀河鉄道の夜", "宮沢賢治の世界");
    }

    @Test
    void 英字の大文字と小文字は区別される() {
        // 今のメソッド名には IgnoreCase が付いていないので、大文字・小文字が違うとヒットしない
        bookRepository.save(new Book("Clean Code", "Robert C. Martin", null, ""));

        assertThat(bookRepository.findByTitleContainingOrAuthorContaining("Clean", "Clean"))
                .extracting(Book::getTitle).containsExactly("Clean Code");
        assertThat(bookRepository.findByTitleContainingOrAuthorContaining("clean", "clean"))
                .isEmpty();
    }

    @Test
    void 空文字で検索すると全件がヒットする() {
        // 「'' を含む」はすべての文字列に当てはまる。Service で空のキーワードをどう扱うか決める参考にする
        List<Book> result = bookRepository.findByTitleContainingOrAuthorContaining("", "");

        assertThat(result).hasSize(3);
    }

    @Test
    void 存在しないIDをdeleteByIdしても例外にならず何も消えない() {
        // BookService.delete() の「存在しない ID ならエラーにせず何もしない」仕様は、この動きを前提にしている
        UUID notExist = UUID.fromString("99999999-9999-9999-9999-999999999999");

        assertThatCode(() -> bookRepository.deleteById(notExist)).doesNotThrowAnyException();
        assertThat(bookRepository.findAll()).hasSize(3);
    }
}
