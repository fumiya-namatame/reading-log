import { describe, it, expect, afterEach, vi } from 'vitest'
import type { BookResponse } from '@/types/book'
import { fetchBooks } from '../bookApi'

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
