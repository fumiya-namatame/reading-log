package com.example.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.backend.dto.BookRequest;
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

    @Test
    void createはリクエストの内容でBookを作ってRepositoryに保存する() {
        BookRequest request = new BookRequest("こころ", "夏目漱石", LocalDate.of(2026, 10, 1), "面白かった");

        bookService.create(request);

        // save() に渡された Book を捕まえて、中身がリクエストどおりか確認する
        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        Book passed = captor.getValue();
        assertThat(passed.getTitle()).isEqualTo("こころ");
        assertThat(passed.getAuthor()).isEqualTo("夏目漱石");
        assertThat(passed.getFinishedDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(passed.getReview()).isEqualTo("面白かった");
    }

    @Test
    void createはRepositoryが保存した結果を返す() {
        BookRequest request = new BookRequest("こころ", "夏目漱石", LocalDate.of(2026, 10, 1), "面白かった");
        // 本物の save() は ID を採番した Book を返す。ここでは「保存後の Book」として別のインスタンスを返させる
        Book saved = new Book("こころ", "夏目漱石", LocalDate.of(2026, 10, 1), "面白かった");
        when(bookRepository.save(any(Book.class))).thenReturn(saved);

        Book result = bookService.create(request);

        assertThat(result).isSameAs(saved);
    }

    @Test
    void createは読了日が未入力でも保存できる() {
        BookRequest request = new BookRequest("こころ", "", null, "");

        bookService.create(request);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getTitle()).isEqualTo("こころ");
        assertThat(captor.getValue().getFinishedDate()).isNull();
    }

    @Test
    void deleteは指定したIDでRepositoryの削除を呼ぶ() {
        UUID id = UUID.fromString("11111111-1111-1111-1111-111111111111");

        bookService.delete(id);

        verify(bookRepository).deleteById(id);
    }
}
