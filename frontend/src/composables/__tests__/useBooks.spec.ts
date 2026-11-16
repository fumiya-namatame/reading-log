import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Book, BookInput } from '@/types/book'
import { fetchBooks } from '@/api/bookApi'
import { saveBooks } from '@/utils/bookStorage'
import { useBooks } from '../useBooks'

// API 通信と localStorage への保存はモックに差し替え、useBooks のロジックだけを検証する
vi.mock('@/api/bookApi', () => ({
  fetchBooks: vi.fn(),
}))
vi.mock('@/utils/bookStorage', () => ({
  saveBooks: vi.fn(),
}))

const input: BookInput = {
  title: 'こころ',
  author: '夏目漱石',
  finishedDate: '2026-10-01',
  review: '面白かった',
}

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

describe('useBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchBooks).mockResolvedValue([])
    // console.error の出力でテストログが汚れないように抑止する
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態では books は空で、読み込み中でもない', () => {
    const { books, isLoading } = useBooks()

    expect(books.value).toEqual([])
    expect(isLoading.value).toBe(false)
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
      // resolve を呼ぶまで終わらない Promise を返し、取得中の状態を確認できるようにする
      let resolveFetch: (books: Book[]) => void = () => {}
      vi.mocked(fetchBooks).mockReturnValue(
        new Promise<Book[]>((resolve) => {
          resolveFetch = resolve
        }),
      )
      const { isLoading, loadBookList } = useBooks()

      const loading = loadBookList()
      expect(isLoading.value).toBe(true)

      resolveFetch(structuredClone(existingBooks))
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
  })

  describe('addBook', () => {
    it('本を追加すると books の件数が1増える', () => {
      const { books, addBook } = useBooks()

      addBook(input)

      expect(books.value).toHaveLength(1)
      expect(books.value[0]).toMatchObject(input)
    })

    it('追加した本に ID が採番される', () => {
      const { books, addBook } = useBooks()

      addBook(input)
      addBook(input)

      const [first, second] = books.value
      expect(first?.id).toEqual(expect.any(String))
      expect(first?.id).not.toBe('')
      expect(first?.id).not.toBe(second?.id)
    })

    it('保存に成功すると true を返す', () => {
      const { addBook } = useBooks()

      expect(addBook(input)).toBe(true)
    })

    it('追加後に saveBooks が呼ばれる', () => {
      const { books, addBook } = useBooks()

      addBook(input)

      expect(saveBooks).toHaveBeenCalledTimes(1)
      expect(saveBooks).toHaveBeenCalledWith(books.value)
    })
  })

  describe('removeBook', () => {
    it('指定した ID の本だけが削除される', async () => {
      const { books, removeBook } = await useBooksWithExistingBooks()

      removeBook('a')

      expect(books.value).toEqual([existingBooks[1]])
    })

    it('存在しない ID を指定しても books は変わらない', async () => {
      const { books, removeBook } = await useBooksWithExistingBooks()

      removeBook('not-exist')

      expect(books.value).toEqual(existingBooks)
    })

    it('削除後に saveBooks が呼ばれる', async () => {
      const { books, removeBook } = await useBooksWithExistingBooks()

      removeBook('a')

      expect(saveBooks).toHaveBeenCalledTimes(1)
      expect(saveBooks).toHaveBeenCalledWith(books.value)
    })

    it('存在しない ID を指定したときは、変更のない一覧がそのまま保存される', async () => {
      const { removeBook } = await useBooksWithExistingBooks()

      removeBook('not-exist')

      expect(saveBooks).toHaveBeenCalledTimes(1)
      expect(saveBooks).toHaveBeenCalledWith(existingBooks)
    })
  })

  describe('保存に失敗したとき', () => {
    /** 次の saveBooks 呼び出しだけ、localStorage の容量不足を模した例外を投げる */
    function failNextSave(): void {
      vi.mocked(saveBooks).mockImplementationOnce(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError')
      })
    }

    it('addBook が失敗すると books は変わらず、エラーメッセージが入る', async () => {
      const { books, addBook, errorMessage } = await useBooksWithExistingBooks()
      failNextSave()

      const result = addBook(input)

      expect(result).toBe(false)
      expect(books.value).toEqual(existingBooks)
      expect(errorMessage.value).toBe('本の追加に失敗しました')
    })

    it('removeBook が失敗すると books は変わらず、エラーメッセージが入る', async () => {
      const { books, removeBook, errorMessage } = await useBooksWithExistingBooks()
      failNextSave()

      removeBook('a')

      expect(books.value).toEqual(existingBooks)
      expect(errorMessage.value).toBe('本の削除に失敗しました')
    })

    it('失敗後に保存が成功すると、エラーメッセージが消える', () => {
      const { addBook, errorMessage } = useBooks()
      failNextSave()
      addBook(input)

      addBook(input)

      expect(errorMessage.value).toBeNull()
    })
  })
})
