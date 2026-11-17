import { describe, it, expect, afterEach, vi } from 'vitest'
import type { BookInput, BookResponse } from '@/types/book'
import { createBook, deleteBook, fetchBooks } from '../bookApi'

/** fetch をモックにして、指定したステータスと JSON を返すようにする */
function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('fetchBooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET /api/books を呼び、返ってきた本の一覧を Book の配列として返す', async () => {
    const responseBody: BookResponse[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: '吾輩は猫である',
        author: '夏目漱石',
        finishedDate: '2026-09-10',
        review: '面白かった',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: '羅生門',
        author: '芥川龍之介',
        finishedDate: '2026-10-02',
        review: '重い',
      },
    ]
    const fetchMock = mockFetch(200, responseBody)

    const books = await fetchBooks()

    // 呼び出し方（第 2 引数の有無など）は実装に任せ、URL だけを確認する
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/books')
    expect(books).toEqual(responseBody)
  })

  it('null の項目（著者・読了日・感想）は空文字に変換する', async () => {
    const responseBody: BookResponse[] = [
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: '銀河鉄道の夜',
        author: null,
        finishedDate: null,
        review: null,
      },
    ]
    mockFetch(200, responseBody)

    const books = await fetchBooks()

    expect(books).toEqual([
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: '銀河鉄道の夜',
        author: '',
        finishedDate: '',
        review: '',
      },
    ])
  })

  it('本が 1 冊もないときは空配列を返す', async () => {
    mockFetch(200, [])

    await expect(fetchBooks()).resolves.toEqual([])
  })

  it('サーバーがエラー（500）を返したときは例外を投げる', async () => {
    // fetch は 500 でも例外にならないので、fetchBooks 側で response.ok を確認している前提
    mockFetch(500, { error: 'Internal Server Error' })

    await expect(fetchBooks()).rejects.toThrow()
  })

  it('通信自体に失敗したときは例外を投げる', async () => {
    // バックエンドが起動していないときなど、fetch そのものが失敗するケース
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(fetchBooks()).rejects.toThrow()
  })
})

describe('createBook', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const input: BookInput = {
    title: 'こころ',
    author: '夏目漱石',
    finishedDate: '2026-10-01',
    review: '面白かった',
  }

  /** fetch に渡された第 2 引数（method / headers / body）を取り出す */
  function requestInitOf(fetchMock: ReturnType<typeof mockFetch>): RequestInit | undefined {
    return fetchMock.mock.calls[0]?.[1]
  }

  it('POST /api/books に入力値を JSON で送る', async () => {
    const fetchMock = mockFetch(201, { id: '44444444-4444-4444-4444-444444444444', ...input })

    await createBook(input)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/books')
    const init = requestInitOf(fetchMock)
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual(input)
  })

  it('未入力の項目（著者・読了日・感想）は null にして送る', async () => {
    const fetchMock = mockFetch(201, {
      id: '55555555-5555-5555-5555-555555555555',
      title: 'こころ',
      author: null,
      finishedDate: null,
      review: null,
    })

    await createBook({ title: 'こころ', author: '', finishedDate: '', review: '' })

    expect(JSON.parse(String(requestInitOf(fetchMock)?.body))).toEqual({
      title: 'こころ',
      author: null,
      finishedDate: null,
      review: null,
    })
  })

  it('登録された本（バックエンドが採番した ID 付き）を Book として返し、null は空文字にする', async () => {
    const responseBody: BookResponse = {
      id: '66666666-6666-6666-6666-666666666666',
      title: 'こころ',
      author: '夏目漱石',
      finishedDate: null,
      review: null,
    }
    mockFetch(201, responseBody)

    const book = await createBook({ ...input, finishedDate: '', review: '' })

    expect(book).toEqual({
      id: '66666666-6666-6666-6666-666666666666',
      title: 'こころ',
      author: '夏目漱石',
      finishedDate: '',
      review: '',
    })
  })

  it('入力エラー（400）が返ったときは例外を投げる', async () => {
    mockFetch(400, { error: 'Bad Request' })

    await expect(createBook({ ...input, title: '' })).rejects.toThrow()
  })

  it('サーバーがエラー（500）を返したときは例外を投げる', async () => {
    mockFetch(500, { error: 'Internal Server Error' })

    await expect(createBook(input)).rejects.toThrow()
  })

  it('通信自体に失敗したときは例外を投げる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createBook(input)).rejects.toThrow()
  })
})

describe('deleteBook', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const id = '77777777-7777-7777-7777-777777777777'

  /**
   * fetch をモックにして、本文なしのレスポンスを返すようにする。
   * 204 は本文を持てないので、本文付きで作る mockFetch は使えない。
   */
  function mockFetchWithoutBody(status: number) {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('DELETE /api/books/{id} を呼ぶ', async () => {
    const fetchMock = mockFetchWithoutBody(204)

    await deleteBook(id)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/books/${id}`)
    const init: RequestInit | undefined = fetchMock.mock.calls[0]?.[1]
    expect(init?.method).toBe('DELETE')
  })

  it('204（本文なし）が返ったときは、例外を投げずに終わる', async () => {
    mockFetchWithoutBody(204)

    await expect(deleteBook(id)).resolves.toBeUndefined()
  })

  it('ID に URL で特別な意味を持つ文字が含まれていても、エスケープして送る', async () => {
    const fetchMock = mockFetchWithoutBody(204)

    await deleteBook('a/b?c')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/books/a%2Fb%3Fc')
  })

  it('ID の形式が不正（400）なときは例外を投げる', async () => {
    mockFetch(400, { error: 'Bad Request' })

    await expect(deleteBook('not-uuid')).rejects.toThrow()
  })

  it('サーバーがエラー（500）を返したときは例外を投げる', async () => {
    mockFetch(500, { error: 'Internal Server Error' })

    await expect(deleteBook(id)).rejects.toThrow()
  })

  it('通信自体に失敗したときは例外を投げる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(deleteBook(id)).rejects.toThrow()
  })
})
