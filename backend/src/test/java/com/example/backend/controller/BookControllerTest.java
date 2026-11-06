package com.example.backend.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.example.backend.entity.Book;
import com.example.backend.service.BookService;

/**
 * BookController のテスト。
 * Web まわりだけを起動し、BookService はモックに差し替えて、
 * URL・ステータスコード・JSON の形が正しいかを確認する。
 */
@WebMvcTest(BookController.class)
class BookControllerTest {

    /** 実際にサーバーを立てずに HTTP リクエストを送れる道具 */
    @Autowired
    private MockMvc mockMvc;

    /** Spring に登録される BookService を偽物に差し替える */
    @MockitoBean
    private BookService bookService;

    @Test
    void GETで本の一覧がJSONで返る() throws Exception {
        when(bookService.findAll()).thenReturn(List.of(
                new Book("吾輩は猫である", "夏目漱石", LocalDate.of(2026, 9, 10), "面白かった"),
                new Book("羅生門", "芥川龍之介", LocalDate.of(2026, 10, 2), "重い")));

        mockMvc.perform(get("/api/books"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title").value("吾輩は猫である"))
                .andExpect(jsonPath("$[0].author").value("夏目漱石"))
                // 読了日はフロントエンドと同じ 'YYYY-MM-DD' 形式の文字列になる
                .andExpect(jsonPath("$[0].finishedDate").value("2026-09-10"))
                .andExpect(jsonPath("$[0].review").value("面白かった"));
    }

    @Test
    void 本が1冊もないときは空の配列が返る() throws Exception {
        when(bookService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/books"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
