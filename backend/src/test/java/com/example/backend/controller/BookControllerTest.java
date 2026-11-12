package com.example.backend.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.example.backend.dto.BookRequest;
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

    @Nested
    class GET_一覧取得 {

        @Test
        void 本の一覧がJSONで返る() throws Exception {
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

    @Nested
    class POST_登録 {

        /** POST /api/books に JSON を送る */
        private ResultActions postBook(String json) throws Exception {
            return mockMvc.perform(post("/api/books")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json));
        }

        @Test
        void 登録に成功すると201と登録された本が返る() throws Exception {
            when(bookService.create(any(BookRequest.class))).thenReturn(
                    new Book("こころ", "夏目漱石", LocalDate.of(2026, 10, 1), "面白かった"));

            postBook("""
                    {"title": "こころ", "author": "夏目漱石", "finishedDate": "2026-10-01", "review": "面白かった"}
                    """)
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.title").value("こころ"))
                    .andExpect(jsonPath("$.finishedDate").value("2026-10-01"));

            // 受け取った JSON が BookRequest に正しく変換されて Service に渡っている
            verify(bookService).create(
                    new BookRequest("こころ", "夏目漱石", LocalDate.of(2026, 10, 1), "面白かった"));
        }

        @Test
        void 読了日が空文字のときはnullとして受け取る() throws Exception {
            // フロントエンドのフォームは、読了日が未入力だと "" を送ってくる
            when(bookService.create(any(BookRequest.class))).thenReturn(
                    new Book("こころ", "", null, ""));

            postBook("""
                    {"title": "こころ", "author": "", "finishedDate": "", "review": ""}
                    """)
                    .andExpect(status().isCreated());

            verify(bookService).create(new BookRequest("こころ", "", null, ""));
        }

        @Test
        void タイトルが空だと400になりServiceは呼ばれない() throws Exception {
            postBook("""
                    {"title": "", "author": "夏目漱石", "finishedDate": "2026-10-01", "review": ""}
                    """)
                    .andExpect(status().isBadRequest());

            verify(bookService, never()).create(any());
        }

        @Test
        void 読了日の形式が正しくないと400になりServiceは呼ばれない() throws Exception {
            postBook("""
                    {"title": "こころ", "author": "", "finishedDate": "2026/10/01", "review": ""}
                    """)
                    .andExpect(status().isBadRequest());

            verify(bookService, never()).create(any());
        }
    }

    @Nested
    class PUT_更新 {

        private final UUID id = UUID.fromString("11111111-1111-1111-1111-111111111111");

        /** PUT /api/books/{id} に JSON を送る */
        private ResultActions putBook(Object pathId, String json) throws Exception {
            return mockMvc.perform(put("/api/books/{id}", pathId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json));
        }

        @Test
        void 更新に成功すると200と更新された本が返る() throws Exception {
            when(bookService.update(any(UUID.class), any(BookRequest.class))).thenReturn(
                    new Book("こころ（改版）", "夏目漱石", LocalDate.of(2026, 11, 3), "二回目も面白かった"));

            putBook(id, """
                    {"title": "こころ（改版）", "author": "夏目漱石", "finishedDate": "2026-11-03", "review": "二回目も面白かった"}
                    """)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("こころ（改版）"))
                    .andExpect(jsonPath("$.finishedDate").value("2026-11-03"));

            // URL の ID と JSON の中身が、それぞれ正しく変換されて Service に渡っている
            verify(bookService).update(id,
                    new BookRequest("こころ（改版）", "夏目漱石", LocalDate.of(2026, 11, 3), "二回目も面白かった"));
        }

        @Test
        void 存在しないIDだと404になり本文は空() throws Exception {
            // Service が「見つからない」例外を投げたときに、Controller の handleNotFound() で 404 に変換される
            when(bookService.update(any(UUID.class), any(BookRequest.class)))
                    .thenThrow(new NoSuchElementException("本が見つかりません"));

            putBook(id, """
                    {"title": "こころ", "author": "", "finishedDate": "", "review": ""}
                    """)
                    .andExpect(status().isNotFound())
                    .andExpect(content().string(""));
        }

        @Test
        void タイトルが空だと400になりServiceは呼ばれない() throws Exception {
            putBook(id, """
                    {"title": "", "author": "夏目漱石", "finishedDate": "2026-10-01", "review": ""}
                    """)
                    .andExpect(status().isBadRequest());

            verify(bookService, never()).update(any(), any());
        }

        @Test
        void IDがUUIDの形式でないと400になりServiceは呼ばれない() throws Exception {
            putBook("not-a-uuid", """
                    {"title": "こころ", "author": "", "finishedDate": "", "review": ""}
                    """)
                    .andExpect(status().isBadRequest());

            verify(bookService, never()).update(any(), any());
        }
    }

    @Nested
    class DELETE_削除 {

        @Test
        void 削除に成功すると204が返り本文は空() throws Exception {
            UUID id = UUID.fromString("11111111-1111-1111-1111-111111111111");

            mockMvc.perform(delete("/api/books/{id}", id))
                    .andExpect(status().isNoContent())
                    .andExpect(content().string(""));

            // URL の ID が UUID に変換されて Service に渡っている
            verify(bookService).delete(id);
        }

        @Test
        void IDがUUIDの形式でないと400になりServiceは呼ばれない() throws Exception {
            mockMvc.perform(delete("/api/books/{id}", "not-a-uuid"))
                    .andExpect(status().isBadRequest());

            verify(bookService, never()).delete(any());
        }
    }
}
