package com.example.backend.entity;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

/**
 * 本のデータ（DB の book テーブルの 1 行に対応する）。
 * 項目はフロントエンドの Book 型（frontend/src/types/book.ts）に合わせている。
 */
@Entity
public class Book {

    /** 一意な ID（保存時に UUID が自動で採番される） */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** タイトル */
    private String title;

    /** 著者 */
    private String author;

    /** 読了日（JSON では 'YYYY-MM-DD' 形式になる） */
    private LocalDate finishedDate;

    /** 感想（長文になりうるので長さを広めに取る） */
    @Column(length = 2000)
    private String review;

    /** JPA が内部で使うための引数なしコンストラクタ */
    protected Book() {
    }

    /** 新しい本を作るときのコンストラクタ（ID は保存時に採番されるので受け取らない） */
    public Book(String title, String author, LocalDate finishedDate, String review) {
        this.title = title;
        this.author = author;
        this.finishedDate = finishedDate;
        this.review = review;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public LocalDate getFinishedDate() {
        return finishedDate;
    }

    public void setFinishedDate(LocalDate finishedDate) {
        this.finishedDate = finishedDate;
    }

    public String getReview() {
        return review;
    }

    public void setReview(String review) {
        this.review = review;
    }
}
