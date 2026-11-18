import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Book, BookInput } from '@/types/book'
import { createBook, deleteBook, fetchBooks, updateBook } from '@/api/bookApi'
import { useBooks } from '../useBooks'

// API 通信はモックに差し替え、useBooks のロジックだけを検証する
vi.mock('@/api/bookApi', () => ({
  fetchBooks: vi.fn(),
  createBook: vi.fn(),
  deleteBook: vi.fn(),
  updateBook: vi.fn(),
}))

const input: BookInput = {
  title: 'こころ',
  author: '夏目漱石',
  finishedDate: '2026-10-01',
  review: '面白かった',
}

/** createBook が返す「登録された本」（バックエンドが採番した ID 付き） */
const createdBook: Book = { ...input, id: 'created-id' }

/** updateBook が返す「更新された本」（既存の本 a を書き換えたもの） */
const updatedBook: Book = { ...input, id: 'a' }

const existingBooks: Book[] = [
  { id: 'a', title: '羅生門', author: '芥川龍之介', finishedDate: '2026-09-01', review: '' },
  { id: 'b', title: '坊っちゃん', author: '夏目漱石', finishedDate: '2026-09-15', review: '' },
]

/** fetchBooks が existingBooks を返す状態で useBooks を作り、一覧の取得まで済ませる */
async function useBooksWithExistingBooks(): Promise<ReturnType<typeof useBooks>> {
  vi.mocked(fetchBooks).mockResolvedValue(structuredClone(existingBooks))
  const result = useBooks()
  await result.loadBookList()
  return result
}

/**
 * resolve を呼ぶまで終わらない Promise を作る。
 * 「通信の途中」の状態を確認するために使う。
 */
function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('useBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchBooks).mockResolvedValue([])
    vi.mocked(createBook).mockResolvedValue(structuredClone(createdBook))
    vi.mocked(deleteBook).mockResolvedValue()
    vi.mocked(updateBook).mockResolvedValue(structuredClone(updatedBook))
    // console.error の出力でテストログが汚れないように抑止する
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態では books は空で、読み込み中でも保存中でもない', () => {
    const { books, isLoading, isSaving } = useBooks()

    expect(books.value).toEqual([])
    expect(isLoading.value).toBe(false)
    expect(isSaving.value).toBe(false)
    // loadBookList を呼ぶまでは通信しない
    expect(fetchBooks).not.toHaveBeenCalled()
  })

  describe('loadBookList', () => {
    it('取得に成功すると fetchBooks の結果が books に入る', async () => {
      vi.mocked(fetchBooks).mockResolvedValue(structuredClone(existingBooks))
      const { books, loadBookList } = useBooks()

      await loadBookList()

      expect(books.value).toEqual(existingBooks)
    })

    it('取得している間だけ isLoading が true になる', async () => {
      const deferred = createDeferred<Book[]>()
      vi.mocked(fetchBooks).mockReturnValue(deferred.promise)
      const { isLoading, loadBookList } = useBooks()

      const loading = loadBookList()
      expect(isLoading.value).toBe(true)

      deferred.resolve(structuredClone(existingBooks))
      await loading
      expect(isLoading.value).toBe(false)
    })

    it('取得に失敗すると books は変わらず、エラーメッセージが入り、読み込み中も終わる', async () => {
      const { books, errorMessage, isLoading, loadBookList } = await useBooksWithExistingBooks()
      vi.mocked(fetchBooks).mockRejectedValueOnce(new Error('network error'))

      await loadBookList()

      expect(books.value).toEqual(existingBooks)
      expect(errorMessage.value).toBe('本の一覧の取得に失敗しました')
      expect(isLoading.value).toBe(false)
    })

    it('失敗後に取得が成功すると、エラーメッセージが消える', async () => {
      const { errorMessage, loadBookList } = useBooks()
      vi.mocked(fetchBooks).mockRejectedValueOnce(new Error('network error'))
      await loadBookList()

      await loadBookList()

      expect(errorMessage.value).toBeNull()
    })

    it('keyword を渡すと、そのまま fetchBooks に渡して結果を books に入れる', async () => {
      const searchedBooks = [structuredClone(existingBooks[1]!)]
      vi.mocked(fetchBooks).mockResolvedValue(searchedBooks)
      const { books, loadBookList } = useBooks()

      await loadBookList('漱石')

      expect(fetchBooks).toHaveBeenCalledWith('漱石')
      expect(books.value).toEqual([existingBooks[1]])
    })

    describe('取得中に次の取得を始めたとき', () => {
      it('先の取得があとから届いても、後の取得の結果が残る', async () => {
        const first = createDeferred<Book[]>()
        const second = createDeferred<Book[]>()
        vi.mocked(fetchBooks).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
        const { books, loadBookList } = useBooks()

        const firstLoading = loadBookList('夏')
        const secondLoading = loadBookList('夏目')
        // 後の取得が先に終わり、そのあと先の取得が終わる
        second.resolve([structuredClone(existingBooks[1]!)])
        await secondLoading
        first.resolve(structuredClone(existingBooks))
        await firstLoading

        expect(books.value).toEqual([existingBooks[1]])
      })

      it('先の取得が終わっても、後の取得が終わるまでは読み込み中のまま', async () => {
        const first = createDeferred<Book[]>()
        const second = createDeferred<Book[]>()
        vi.mocked(fetchBooks).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
        const { isLoading, loadBookList } = useBooks()

        const firstLoading = loadBookList('夏')
        const secondLoading = loadBookList('夏目')
        first.resolve(structuredClone(existingBooks))
        await firstLoading
        expect(isLoading.value).toBe(true)

        second.resolve([structuredClone(existingBooks[1]!)])
        await secondLoading
        expect(isLoading.value).toBe(false)
      })

      it('先の取得があとから失敗しても、エラーメッセージは出さない', async () => {
        let rejectFirst: (error: Error) => void = () => {}
        const first = new Promise<Book[]>((_, reject) => {
          rejectFirst = reject
        })
        vi.mocked(fetchBooks)
          .mockReturnValueOnce(first)
          .mockResolvedValueOnce([structuredClone(existingBooks[1]!)])
        const { books, errorMessage, loadBookList } = useBooks()

        const firstLoading = loadBookList('夏')
        await loadBookList('夏目')
        rejectFirst(new Error('network error'))
        await firstLoading

        expect(errorMessage.value).toBeNull()
        expect(books.value).toEqual([existingBooks[1]])
      })
    })
  })

  describe('addBook', () => {
    it('入力値を渡して createBook を呼ぶ', async () => {
      const { addBook } = useBooks()

      await addBook(input)

      expect(createBook).toHaveBeenCalledTimes(1)
      expect(createBook).toHaveBeenCalledWith(input)
    })

    it('登録に成功すると、createBook が返した本（バックエンドの ID 付き）が一覧の末尾に入る', async () => {
      const { books, addBook } = await useBooksWithExistingBooks()

      await addBook(input)

      expect(books.value).toEqual([...existingBooks, createdBook])
    })

    it('登録に成功すると true を返す', async () => {
      const { addBook } = useBooks()

      await expect(addBook(input)).resolves.toBe(true)
    })

    it('登録している間だけ isSaving が true になる', async () => {
      const deferred = createDeferred<Book>()
      vi.mocked(createBook).mockReturnValue(deferred.promise)
      const { isSaving, addBook } = useBooks()

      const adding = addBook(input)
      expect(isSaving.value).toBe(true)

      deferred.resolve(structuredClone(createdBook))
      await adding
      expect(isSaving.value).toBe(false)
    })

    it('登録を待っている間に一覧の取得が終わっても、取得結果に登録した本が足される', async () => {
      // addBook が「呼び出した時点の books」ではなく「待ったあとの books」に足していることの確認
      const deferred = createDeferred<Book>()
      vi.mocked(createBook).mockReturnValue(deferred.promise)
      vi.mocked(fetchBooks).mockResolvedValue(structuredClone(existingBooks))
      const { books, addBook, loadBookList } = useBooks()

      const adding = addBook(input)
      await loadBookList()
      deferred.resolve(structuredClone(createdBook))
      await adding

      expect(books.value).toEqual([...existingBooks, createdBook])
    })
  })

  describe('editBook', () => {
    it('ID と入力値を渡して updateBook を呼ぶ', async () => {
      const { editBook } = await useBooksWithExistingBooks()

      await editBook('a', input)

      expect(updateBook).toHaveBeenCalledTimes(1)
      expect(updateBook).toHaveBeenCalledWith('a', input)
    })

    it('更新に成功すると、同じ位置の本が updateBook の結果に置き換わる', async () => {
      const { books, editBook } = await useBooksWithExistingBooks()

      await editBook('a', input)

      // 並び順は変わらず、a だけが置き換わる
      expect(books.value).toEqual([updatedBook, existingBooks[1]])
    })

    it('更新に成功すると true を返す', async () => {
      const { editBook } = await useBooksWithExistingBooks()

      await expect(editBook('a', input)).resolves.toBe(true)
    })

    it('更新している間だけ isSaving が true になる', async () => {
      const deferred = createDeferred<Book>()
      vi.mocked(updateBook).mockReturnValue(deferred.promise)
      const { isSaving, editBook } = await useBooksWithExistingBooks()

      const editing = editBook('a', input)
      expect(isSaving.value).toBe(true)

      deferred.resolve(structuredClone(updatedBook))
      await editing
      expect(isSaving.value).toBe(false)
    })

    it('更新を待っている間に一覧の取得が終わっても、取得結果の中で置き換わる', async () => {
      // editBook が「呼び出した時点の books」ではなく「待ったあとの books」を使っていることの確認
      const deferred = createDeferred<Book>()
      vi.mocked(updateBook).mockReturnValue(deferred.promise)
      vi.mocked(fetchBooks).mockResolvedValue(structuredClone(existingBooks))
      const { books, editBook, loadBookList } = useBooks()

      const editing = editBook('a', input)
      await loadBookList()
      deferred.resolve(structuredClone(updatedBook))
      await editing

      expect(books.value).toEqual([updatedBook, existingBooks[1]])
    })
  })

  describe('removeBook', () => {
    it('ID を渡して deleteBook を呼ぶ', async () => {
      const { removeBook } = await useBooksWithExistingBooks()

      await removeBook('a')

      expect(deleteBook).toHaveBeenCalledTimes(1)
      expect(deleteBook).toHaveBeenCalledWith('a')
    })

    it('削除に成功すると、指定した ID の本だけが一覧から消える', async () => {
      const { books, removeBook } = await useBooksWithExistingBooks()

      await removeBook('a')

      expect(books.value).toEqual([existingBooks[1]])
    })

    it('一覧にない ID を指定しても、books は変わらない', async () => {
      const { books, removeBook } = await useBooksWithExistingBooks()

      await removeBook('not-exist')

      expect(books.value).toEqual(existingBooks)
    })

    it('削除では isSaving を使わない（二度押ししても害がないため）', async () => {
      const deferred = createDeferred<void>()
      vi.mocked(deleteBook).mockReturnValue(deferred.promise)
      const { isSaving, removeBook } = await useBooksWithExistingBooks()

      const removing = removeBook('a')
      expect(isSaving.value).toBe(false)

      deferred.resolve()
      await removing
    })
  })

  describe('通信に失敗したとき', () => {
    it('addBook が失敗すると books は変わらず、エラーメッセージが入り、false を返す', async () => {
      const { books, addBook, errorMessage } = await useBooksWithExistingBooks()
      vi.mocked(createBook).mockRejectedValueOnce(new Error('network error'))

      const result = await addBook(input)

      expect(result).toBe(false)
      expect(books.value).toEqual(existingBooks)
      expect(errorMessage.value).toBe('本の追加に失敗しました')
    })

    it('addBook が失敗しても、保存中の状態は終わる', async () => {
      const { isSaving, addBook } = useBooks()
      vi.mocked(createBook).mockRejectedValueOnce(new Error('network error'))

      await addBook(input)

      expect(isSaving.value).toBe(false)
    })

    it('editBook が失敗すると books は変わらず、エラーメッセージが入り、false を返す', async () => {
      const { books, editBook, errorMessage } = await useBooksWithExistingBooks()
      vi.mocked(updateBook).mockRejectedValueOnce(new Error('network error'))

      const result = await editBook('a', input)

      expect(result).toBe(false)
      expect(books.value).toEqual(existingBooks)
      expect(errorMessage.value).toBe('本の更新に失敗しました')
    })

    it('editBook が失敗しても、保存中の状態は終わる', async () => {
      const { isSaving, editBook } = await useBooksWithExistingBooks()
      vi.mocked(updateBook).mockRejectedValueOnce(new Error('network error'))

      await editBook('a', input)

      expect(isSaving.value).toBe(false)
    })

    it('失敗後に更新が成功すると、エラーメッセージが消える', async () => {
      const { editBook, errorMessage } = await useBooksWithExistingBooks()
      vi.mocked(updateBook).mockRejectedValueOnce(new Error('network error'))
      await editBook('a', input)

      await editBook('a', input)

      expect(errorMessage.value).toBeNull()
    })

    it('removeBook が失敗すると books は変わらず、エラーメッセージが入る', async () => {
      const { books, removeBook, errorMessage } = await useBooksWithExistingBooks()
      vi.mocked(deleteBook).mockRejectedValueOnce(new Error('network error'))

      await removeBook('a')

      expect(books.value).toEqual(existingBooks)
      expect(errorMessage.value).toBe('本の削除に失敗しました')
    })

    it('失敗後に追加が成功すると、エラーメッセージが消える', async () => {
      const { addBook, errorMessage } = useBooks()
      vi.mocked(createBook).mockRejectedValueOnce(new Error('network error'))
      await addBook(input)

      await addBook(input)

      expect(errorMessage.value).toBeNull()
    })

    it('失敗後に削除が成功すると、エラーメッセージが消える', async () => {
      const { removeBook, errorMessage } = await useBooksWithExistingBooks()
      vi.mocked(deleteBook).mockRejectedValueOnce(new Error('network error'))
      await removeBook('a')

      await removeBook('a')

      expect(errorMessage.value).toBeNull()
    })
  })
})
