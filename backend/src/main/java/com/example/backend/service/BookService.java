package com.example.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

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
}
