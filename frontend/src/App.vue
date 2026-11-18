<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import BookForm from './components/BookForm.vue'
import BookList from './components/BookList.vue'
import { useBooks } from './composables/useBooks'
import type { Book, BookInput } from './types/book'

const { books, addBook, editBook, removeBook, errorMessage, isLoading, isSaving, loadBookList } =
  useBooks()
const bookForm = useTemplateRef('bookForm')

/** 編集中の本（null なら、フォームは追加用） */
const editingBook = ref<Book | null>(null)

// 画面を表示したら、本の一覧をバックエンドから取得する
onMounted(() => {
  loadBookList()
})

// 編集中の本が一覧からなくなったら（削除されたら）、編集をやめる。
// そのままだと、もう存在しない本を更新しようとして 404 になってしまう
watch(books, (currentBooks) => {
  const editing = editingBook.value
  if (editing && !currentBooks.some((book) => book.id === editing.id)) {
    editingBook.value = null
  }
})

/** 一覧の「編集」が押されたら、その本をフォームで編集できるようにする */
function startEditing(book: Book): void {
  editingBook.value = book
}

/** 編集をやめる（フォームは BookForm 側で空に戻る） */
function stopEditing(): void {
  editingBook.value = null
}

/**
 * フォームが送信されたら、編集中なら更新、そうでなければ追加する。
 * 保存に成功したときだけフォームを空にする（失敗時は入力を残して再送信できるようにする）
 */
async function handleSubmit(input: BookInput): Promise<void> {
  const editing = editingBook.value
  if (editing) {
    // addBook と同じく、await しないと常に「成功」扱いになってしまう
    const succeeded = await editBook(editing.id, input)
    // 待っている間に別の本の「編集」が押されていたら、そちらの編集は続けられるようにする
    if (succeeded && editingBook.value?.id === editing.id) {
      stopEditing()
    }
    return
  }

  if (await addBook(input)) {
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
    <!--
      取得中：追加すると、あとから届いた取得結果で上書きされて消えてしまうので、送信を止める
      保存中：二度押しで同じ本が 2 冊登録されないように、送信を止める
    -->
    <BookForm
      ref="bookForm"
      :disabled="isLoading || isSaving"
      :editing-book="editingBook"
      @submit="handleSubmit"
      @cancel="stopEditing"
    />
    <!-- 取得中に BookList を出すと「まだ本が登録されていません」と表示されてしまうので、代わりに読み込み中を出す -->
    <p v-if="isLoading" class="loading" role="status">読み込み中…</p>
    <BookList v-else :books="books" @edit="startEditing" @delete="removeBook" />
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
