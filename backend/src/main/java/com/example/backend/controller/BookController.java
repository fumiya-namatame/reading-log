package com.example.backend.controller;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.BookRequest;
import com.example.backend.entity.Book;
import com.example.backend.service.BookService;

import jakarta.validation.Valid;

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

    /**
     * 本を登録し、登録された本（ID 付き）を返す。
     * POST /api/books
     *
     * 入力チェックに引っかかったときは、このメソッドは呼ばれずに 400 Bad Request が返る。
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Book create(@Valid @RequestBody BookRequest request) {
        return bookService.create(request);
    }

    /**
     * 指定した ID の本の内容を更新し、更新された本を返す。
     * PUT /api/books/{id}
     *
     * 存在しない ID のときは 404 Not Found を返す（下の handleNotFound() で変換する）。
     * 入力チェックに引っかかったときや、ID が UUID の形式でないときは、
     * このメソッドは呼ばれずに 400 Bad Request が返る。
     */
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public Book update(@PathVariable UUID id, @Valid @RequestBody BookRequest request) {
        return bookService.update(id, request);
    }

    /**
     * このコントローラーの中で NoSuchElementException（本が見つからない）が起きたら、
     * 404 Not Found を返す。本文は空にする。
     */
    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public void handleNotFound() {
    }

    /**
     * 指定した ID の本を削除する。成功時は本文なしで 204 No Content を返す。
     * DELETE /api/books/{id}
     *
     * 存在しない ID でも 204 を返す（BookService.delete() の仕様に合わせる）。
     * ID が UUID の形式でないときは、このメソッドは呼ばれずに 400 Bad Request が返る。
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        bookService.delete(id);
    }
}
