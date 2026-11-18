import { ref } from 'vue'
import type { Book, BookInput } from '@/types/book'
import { createBook, deleteBook, fetchBooks, updateBook } from '@/api/bookApi'

/** 本の一覧と、それを操作する関数をまとめた composable */
export function useBooks() {
  // 一覧は loadBookList() でバックエンドから取得するので、最初は空にしておく
  const books = ref<Book[]>([])
  const errorMessage = ref<string | null>(null)
  /** 一覧を取得している間だけ true（画面で「読み込み中」の表示やフォームの無効化に使う） */
  const isLoading = ref(false)
  /** 本を追加・更新している間だけ true（ボタンの二度押しで同じ本が 2 冊登録されるのなどを防ぐ） */
  const isSaving = ref(false)

  /** 失敗したことをコンソールと画面（errorMessage）に知らせる */
  function reportError(message: string, error: unknown): void {
    console.error(message, error)
    errorMessage.value = message
  }

  /**
   * 最後に始めた一覧取得の番号。
   * 検索を続けて行うと、前の取得の結果があとから届くことがあるので、
   * 番号が最新のものの結果だけを使うために覚えておく。
   */
  let latestLoadId = 0

  /**
   * 本の一覧をバックエンドから取得して books に入れる。
   * keyword を指定すると、タイトルか著者にその文字列を含む本だけを取得する（空なら全件）。
   * 失敗したときは books を変えずに errorMessage を設定する。
   * 取得中に次の取得が始まったら、古いほうの結果（成功・失敗とも）は捨てる。
   */
  async function loadBookList(keyword?: string): Promise<void> {
    const loadId = ++latestLoadId
    isLoading.value = true
    try {
      const fetchedBooks = await fetchBooks(keyword)
      if (loadId !== latestLoadId) return
      books.value = fetchedBooks
      errorMessage.value = null
    } catch (error) {
      if (loadId !== latestLoadId) return
      reportError('本の一覧の取得に失敗しました', error)
    } finally {
      // 新しい取得がまだ終わっていないときは、読み込み中のままにしておく
      if (loadId === latestLoadId) {
        isLoading.value = false
      }
    }
  }

  /**
   * 本をバックエンドに登録し、成功したら登録された本を一覧の末尾に足す。
   * ID はバックエンドが採番するので、ここでは作らない。
   * 失敗したときは books を変えずに errorMessage を設定する。
   * @returns 登録に成功したかどうか（失敗時にフォームの入力を残すために使う）
   */
  async function addBook(input: BookInput): Promise<boolean> {
    isSaving.value = true
    try {
      const createdBook = await createBook(input)
      // await の間に一覧が変わっている可能性があるので、待ったあとの books.value に足す
      books.value = [...books.value, createdBook]
      errorMessage.value = null
      return true
    } catch (error) {
      reportError('本の追加に失敗しました', error)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 指定した ID の本をバックエンドで更新し、成功したら一覧の同じ位置の本を置き換える。
   * 失敗したときは books を変えずに errorMessage を設定する。
   * @returns 更新に成功したかどうか（失敗時に編集中の入力を残すために使う）
   */
  async function editBook(id: string, input: BookInput): Promise<boolean> {
    isSaving.value = true
    try {
      const updatedBook = await updateBook(id, input)
      // addBook と同じく、待ったあとの books.value で置き換える（並び順は変えない）
      books.value = books.value.map((book) => (book.id === id ? updatedBook : book))
      errorMessage.value = null
      return true
    } catch (error) {
      reportError('本の更新に失敗しました', error)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 本をバックエンドから削除し、成功したら一覧からも取り除く。
   * 失敗したときは books を変えずに errorMessage を設定する。
   */
  async function removeBook(id: string): Promise<void> {
    try {
      await deleteBook(id)
      // addBook と同じく、待ったあとの books.value から取り除く
      books.value = books.value.filter((book) => book.id !== id)
      errorMessage.value = null
    } catch (error) {
      reportError('本の削除に失敗しました', error)
    }
  }

  return { books, addBook, editBook, removeBook, errorMessage, isLoading, isSaving, loadBookList }
}
