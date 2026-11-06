package com.example.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 本を登録するときに受け取るリクエストの型。
 * ID はサーバー側で採番するので含めない（フロントエンドの BookInput 型に対応する）。
 *
 * 入力チェックはフロントエンドのフォームに合わせている。
 * - タイトルは必須
 * - 著者・読了日・感想は空でもよい
 * - 文字数は DB の列の長さ（title / author は 255、review は 2000）まで
 *
 * @param title        タイトル
 * @param author       著者
 * @param finishedDate 読了日（'YYYY-MM-DD' 形式。未入力なら null）
 * @param review       感想
 */
public record BookRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 255) String author,
        LocalDate finishedDate,
        @Size(max = 2000) String review) {
}
