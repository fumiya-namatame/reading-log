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
    void 存在しないIDをdeleteByIdしても例外にならず何も消えない() {
        // BookService.delete() の「存在しない ID ならエラーにせず何もしない」仕様は、この動きを前提にしている
        UUID notExist = UUID.fromString("99999999-9999-9999-9999-999999999999");

        assertThatCode(() -> bookRepository.deleteById(notExist)).doesNotThrowAnyException();
        assertThat(bookRepository.findAll()).hasSize(3);
    }
}
