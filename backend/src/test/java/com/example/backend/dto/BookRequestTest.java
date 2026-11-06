package com.example.backend.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

/**
 * BookRequest の入力チェックのテスト。
 * Spring は起動せず、Bean Validation の Validator を直接使って確認する。
 */
class BookRequestTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    /** エラーになった項目名の一覧を返す */
    private Set<String> invalidFields(BookRequest request) {
        Set<ConstraintViolation<BookRequest>> violations = validator.validate(request);
        return violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    void すべて正しく入力されていればエラーにならない() {
        BookRequest request = new BookRequest("こころ", "夏目漱石", LocalDate.of(2026, 10, 1), "面白かった");

        assertThat(invalidFields(request)).isEmpty();
    }

    @Test
    void タイトル以外が空でもエラーにならない() {
        BookRequest request = new BookRequest("こころ", "", null, "");

        assertThat(invalidFields(request)).isEmpty();
    }

    @Test
    void タイトルがnullだとエラーになる() {
        BookRequest request = new BookRequest(null, "夏目漱石", null, "");

        assertThat(invalidFields(request)).containsExactly("title");
    }

    @Test
    void タイトルが空白だけだとエラーになる() {
        BookRequest request = new BookRequest("   ", "夏目漱石", null, "");

        assertThat(invalidFields(request)).containsExactly("title");
    }

    @Test
    void 文字数が上限ちょうどならエラーにならない() {
        BookRequest request = new BookRequest("あ".repeat(255), "あ".repeat(255), null, "あ".repeat(2000));

        assertThat(invalidFields(request)).isEmpty();
    }

    @Test
    void 文字数が上限を超えるとエラーになる() {
        BookRequest request = new BookRequest("あ".repeat(256), "あ".repeat(256), null, "あ".repeat(2001));

        assertThat(invalidFields(request)).containsExactlyInAnyOrder("title", "author", "review");
    }
}
