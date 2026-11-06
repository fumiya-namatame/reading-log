package com.example.backend.service;

import java.util.List;
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
     * 登録されている本をすべて返す。
     */
    public List<Book> findAll() {
        return bookRepository.findAll();
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
     * 指定した ID の本を削除する。
     * 存在しない ID が指定されたときは、エラーにせず何もしない。
     *
     * @param id 削除する本の ID
     */
    public void delete(UUID id) {
        bookRepository.deleteById(id);
    }
}
