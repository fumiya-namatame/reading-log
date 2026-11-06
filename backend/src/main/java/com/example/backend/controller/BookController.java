package com.example.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.entity.Book;
import com.example.backend.service.BookService;

/**
 * 本に関する HTTP リクエストを受け付けるコントローラー。
 * 受け取ったリクエストを BookService に渡し、結果を JSON で返す。
 */
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    /** BookService は Spring が自動で渡してくれる（BookService と同じ仕組み） */
    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    /**
     * 本の一覧を返す。
     * GET /api/books
     */
    @GetMapping
    public List<Book> findAll() {
        return bookService.findAll();
    }
}
