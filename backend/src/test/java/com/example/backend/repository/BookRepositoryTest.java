package com.example.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;

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
}
