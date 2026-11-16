import { ref } from 'vue'
import type { Book, BookInput } from '@/types/book'
import { fetchBooks } from '@/api/bookApi'
import { saveBooks } from '@/utils/bookStorage'

/** 本の一覧と、それを操作する関数をまとめた composable */
export function useBooks() {
  // 一覧は loadBookList() でバックエンドから取得するので、最初は空にしておく
  const books = ref<Book[]>([])
  const errorMessage = ref<string | null>(null)
  /** 一覧を取得している間だけ true（画面で「読み込み中」の表示やフォームの無効化に使う） */
  const isLoading = ref(false)

  /**
   * 本の一覧をバックエンドから取得して books に入れる。
   * 失敗したときは books を変えずに errorMessage を設定する。
   */
  async function loadBookList(): Promise<void> {
    isLoading.value = true
    try {
      books.value = await fetchBooks()
      errorMessage.value = null
    } catch (error) {
      console.error('本の一覧の取得に失敗しました', error)
      errorMessage.value = '本の一覧の取得に失敗しました'
    } finally {
      // 成功・失敗のどちらでも、読み込み中の状態は終わらせる
      isLoading.value = false
    }
  }

  /**
   * 新しい一覧を保存し、成功したときだけ画面に反映する。
   * 失敗したときは books を変えずに errorMessage を設定する。
   * @returns 保存に成功したかどうか
   */
  function commit(nextBooks: Book[], failureMessage: string): boolean {
    try {
      saveBooks(nextBooks)
      books.value = nextBooks
      errorMessage.value = null
      return true
    } catch (error) {
      console.error(failureMessage, error)
      errorMessage.value = failureMessage
      return false
    }
  }

  /**
   * 本を追加する
   * @returns 保存に成功したかどうか（失敗時にフォームの入力を残すために使う）
   */
  function addBook(input: BookInput): boolean {
    const newBook: Book = { ...input, id: crypto.randomUUID() }
    return commit([...books.value, newBook], '本の追加に失敗しました')
  }

  /** 本を削除する */
  function removeBook(id: string): void {
    commit(
      books.value.filter((book) => book.id !== id),
      '本の削除に失敗しました',
    )
  }

  return { books, addBook, removeBook, errorMessage, isLoading, loadBookList }
}
