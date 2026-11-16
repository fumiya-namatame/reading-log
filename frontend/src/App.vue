<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import BookForm from './components/BookForm.vue'
import BookList from './components/BookList.vue'
import { useBooks } from './composables/useBooks'
import type { BookInput } from './types/book'

const { books, addBook, removeBook, errorMessage, isLoading, loadBookList } = useBooks()
const bookForm = useTemplateRef('bookForm')

// 画面を表示したら、本の一覧をバックエンドから取得する
onMounted(() => {
  loadBookList()
})

/** 保存に成功したときだけフォームを空にする（失敗時は入力を残して再送信できるようにする） */
function handleSubmit(input: BookInput): void {
  if (addBook(input)) {
    bookForm.value?.reset()
  }
}
</script>

<template>
  <header>
    <h1>読書記録</h1>
  </header>

  <main class="main">
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <!-- 取得中に追加すると、あとから届いた取得結果で上書きされて消えてしまうので、送信を止める -->
    <BookForm ref="bookForm" :disabled="isLoading" @submit="handleSubmit" />
    <!-- 取得中に BookList を出すと「まだ本が登録されていません」と表示されてしまうので、代わりに読み込み中を出す -->
    <p v-if="isLoading" class="loading" role="status">読み込み中…</p>
    <BookList v-else :books="books" @delete="removeBook" />
  </main>
</template>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.error {
  padding: 0.75rem 1rem;
  border: 1px solid #d33;
  border-radius: 4px;
  color: #b00;
  background: #fff0f0;
}

.loading {
  color: #666;
}
</style>
