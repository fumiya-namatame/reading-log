<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import BookForm from './components/BookForm.vue'
import BookList from './components/BookList.vue'
import BookSearch from './components/BookSearch.vue'
import { useBooks } from './composables/useBooks'
import type { Book, BookInput } from './types/book'

const { books, addBook, editBook, removeBook, errorMessage, isLoading, isSaving, loadBookList } =
  useBooks()
const bookForm = useTemplateRef('bookForm')

/** 編集中の本（null なら、フォームは追加用） */
const editingBook = ref<Book | null>(null)

/** 今の検索語（空なら全件表示） */
const searchKeyword = ref('')

/** 一覧が 0 件のときの文言。検索中は「登録されていない」のではなく「見つからない」 */
const emptyMessage = computed(() =>
  searchKeyword.value === '' ? 'まだ本が登録されていません' : '条件に合う本が見つかりませんでした',
)

// 画面を表示したら、本の一覧をバックエンドから取得する
onMounted(() => {
  loadBookList()
})

/** 検索語が変わったら、その条件で一覧を取り直す（BookSearch 側で、入力が止まるまで待ってから呼ばれる） */
function handleSearch(keyword: string): void {
  searchKeyword.value = keyword
  loadBookList(keyword)
}

/** 一覧の「編集」が押されたら、その本をフォームで編集できるようにする */
function startEditing(book: Book): void {
  editingBook.value = book
}

/** 編集をやめる（フォームは BookForm 側で空に戻る） */
function stopEditing(): void {
  editingBook.value = null
}

/**
 * 本を削除する。編集中の本の削除に成功したら、編集もやめる
 * （そのままだと、もう存在しない本を更新しようとして 404 になってしまう）。
 *
 * 「一覧から消えたら編集をやめる」にすると、検索で一覧から外れただけでも編集が止まって
 * 入力が消えてしまうので、削除したときだけ判定する。
 */
async function handleDelete(id: string): Promise<void> {
  await removeBook(id)
  // removeBook は失敗しても例外を投げないので、一覧から消えたかどうかで成功を判定する
  const deleted = !books.value.some((book) => book.id === id)
  if (deleted && editingBook.value?.id === id) {
    stopEditing()
  }
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
    <!-- 検索欄は読み込み中も出したままにする（消すと入力中の文字が失われるため） -->
    <BookSearch @search="handleSearch" />
    <!-- 取得中に BookList を出すと「まだ本が登録されていません」と表示されてしまうので、代わりに読み込み中を出す -->
    <p v-if="isLoading" class="loading" role="status">読み込み中…</p>
    <BookList
      v-else
      :books="books"
      :empty-message="emptyMessage"
      @edit="startEditing"
      @delete="handleDelete"
    />
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
