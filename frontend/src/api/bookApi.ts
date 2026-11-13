import type { Book, BookResponse } from '@/types/book'

/** API のレスポンスを画面で使う Book に変換する（null は '' にそろえる） */
function toBook(response: BookResponse): Book {
  return {
    id: response.id,
    title: response.title,
    author: response.author ?? '',
    finishedDate: response.finishedDate ?? '',
    review: response.review ?? '',
  }
}

/**
 * 本の一覧をバックエンドから取得する。
 * サーバーがエラーを返したときや、通信に失敗したときは例外を投げる。
 */
export async function fetchBooks(): Promise<Book[]> {
  const response = await fetch('/api/books')

  // fetch は 4xx / 5xx でも例外にならないので、自分でチェックする
  if (!response.ok) {
    throw new Error(`本の一覧の取得に失敗しました（status: ${response.status}）`)
  }

  const body: BookResponse[] = await response.json()
  return body.map(toBook)
}
