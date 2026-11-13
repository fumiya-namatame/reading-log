package com.example.backend.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.backend.dto.BookRequest;
import com.example.backend.entity.Book;
import com.example.backend.repository.BookRepository;

/**
 * 本に関する処理をまとめるサービス。
 * Controller から呼ばれ、Repository を使って DB を操作する。
 */
@Service
public class BookService {

    private final BookRepository bookRepository;

    /**
     * コンストラクタインジェクション。
     * Spring が起動時に BookRepository の実装を自動で渡してくれる。
     */
    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    /**
     * 本を新しく登録する。
     *
     * @param request 登録する本の内容（ID は含まない）
     * @return 登録された本（ID が採番された状態）
     */
    public Book create(BookRequest request) {
        Book book = new Book(request.title(), request.author(), request.finishedDate(), request.review());
        return bookRepository.save(book);
    }

    /**
     * 指定した ID の本の内容を更新する。
     *
     * @param id      更新する本の ID
     * @param request 更新後の本の内容（ID は含まない）
     * @return 更新された本（ID は変わらない）
     * @throws NoSuchElementException 指定した ID の本が存在しないとき
     */
    public Book update(UUID id, BookRequest request) {
        // HTTP のステータスは Controller 側で決めるので、ここでは「見つからない」ことだけを伝える
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("本が見つかりません"));
        book.setTitle(request.title());
        book.setAuthor(request.author());
        book.setFinishedDate(request.finishedDate());
        book.setReview(request.review());
        return bookRepository.save(book);
    }

    /**
     * 指定した ID の本を削除する。
     * 存在しない ID が指定されたときは、エラーにせず何もしない。
     *
     * @param id 削除する本の ID
     */
    public void delete(UUID id) {
        bookRepository.deleteById(id);
    }

    /**
     * タイトルまたは著者に指定した文字列が含まれる本をすべて返す。
     *
     * @param keyword タイトルまたは著者に含まれる文字列
     * @return 条件に合う本のリスト（0 件の可能性もある）
     */
    public List<Book> search(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return bookRepository.findAll();
        }
        String trimmed = keyword.strip();
        return bookRepository.findByTitleContainingOrAuthorContaining(trimmed, trimmed);
    }
}
