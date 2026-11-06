package com.example.backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.backend.entity.Book;

/**
 * Book テーブルを読み書きするためのリポジトリ。
 * JpaRepository を継承するだけで、findAll() / findById() / save() / deleteById() などが使える。
 * 実装クラスは Spring Data JPA が起動時に自動で作る。
 */
public interface BookRepository extends JpaRepository<Book, UUID> {
}
