package com.example.backend.repository;

import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.backend.entity.Book;

/**
 * Book テーブルを読み書きするためのリポジトリ。
 * JpaRepository を継承するだけで、findAll() / findById() / save() / deleteById() などが使える。
 * 実装クラスは Spring Data JPA が起動時に自動で作る。
 */
public interface BookRepository extends JpaRepository<Book, UUID> {
  /**
   * タイトルまたは著者に指定した文字列が含まれる本をすべて返す。
   *
   * @param title  タイトルに含まれる文字列
   * @param author 著者に含まれる文字列
   * @return 条件に合う本のリスト（0 件の可能性もある）
   */
  List<Book> findByTitleContainingOrAuthorContaining(String title, String author);
}
