package com.example.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.backend.entity.Book;
import com.example.backend.repository.BookRepository;

/**
 * BookService のテスト。
 * Spring や DB は起動せず、BookRepository をモック（偽物）に差し替えて
 * BookService の処理だけを確認する。
 */
@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    /** 偽物の Repository。返す値をテストごとに決められる */
    @Mock
    private BookRepository bookRepository;

    /** テスト対象。上のモックがコンストラクタに渡される */
    @InjectMocks
    private BookService bookService;

    @Test
    void findAllはRepositoryから取得した本をそのまま返す() {
        List<Book> books = List.of(
                new Book("吾輩は猫である", "夏目漱石", LocalDate.of(2026, 9, 10), "面白かった"),
                new Book("羅生門", "芥川龍之介", LocalDate.of(2026, 10, 2), "重い"));
        when(bookRepository.findAll()).thenReturn(books);

        List<Book> result = bookService.findAll();

        assertThat(result).isEqualTo(books);
    }

    @Test
    void 本が1冊もないときは空のリストを返す() {
        when(bookRepository.findAll()).thenReturn(List.of());

        List<Book> result = bookService.findAll();

        assertThat(result).isEmpty();
    }
}
