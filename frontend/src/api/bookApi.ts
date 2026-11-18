import type { Book, BookInput, BookRequest, BookResponse } from '@/types/book'

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

/** 空文字を null に変える（未入力をバックエンドには null で送るため） */
function emptyToNull(value: string): string | null {
  return value === '' ? null : value
}

/**
 * フォームの入力値を、API に送る BookRequest に変換する（toBook の逆向き）。
 * タイトルは必須なので変換しない（空ならバックエンドが 400 を返す）。
 */
function toRequest(input: BookInput): BookRequest {
  return {
    title: input.title,
    author: emptyToNull(input.author),
    // 読了日は LocalDate として受け取られるので、'' のまま送ると変換に失敗するおそれがある
    finishedDate: emptyToNull(input.finishedDate),
    review: emptyToNull(input.review),
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

/**
 * 本をバックエンドに登録し、登録された本（バックエンドが採番した ID 付き）を返す。
 * サーバーがエラーを返したとき（入力エラーの 400 など）や、通信に失敗したときは例外を投げる。
 */
export async function createBook(input: BookInput): Promise<Book> {
  const response = await fetch('/api/books', {
    method: 'POST',
    // JSON を送ることを伝えないと、バックエンドが本文を読み取れない（415 になる）
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toRequest(input)),
  })

  if (!response.ok) {
    throw new Error(`本の登録に失敗しました（status: ${response.status}）`)
  }

  const body: BookResponse = await response.json()
  return toBook(body)
}

/**
 * 指定した ID の本をバックエンドから削除する。
 * 成功時のレスポンスは本文なし（204 No Content）なので、何も返さない。
 * 存在しない ID でもバックエンドは 204 を返すので、成功として扱われる。
 * サーバーがエラーを返したときや、通信に失敗したときは例外を投げる。
 */
export async function deleteBook(id: string): Promise<void> {
  // ID を URL に埋め込むので、念のため URL で特別な意味を持つ文字（/ や ? など）をエスケープする
  const response = await fetch(`/api/books/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`本の削除に失敗しました（status: ${response.status}）`)
  }
  // 本文がないので response.json() は呼ばない（呼ぶと JSON の解析に失敗して例外になる）
}

/**
 * 指定した ID の本の内容をバックエンドで更新し、更新された本を返す。
 * 存在しない ID のときはバックエンドが 404 を返すので、例外を投げる（削除と違い、成功扱いにはならない）。
 * サーバーがエラーを返したとき（入力エラーの 400 など）や、通信に失敗したときも例外を投げる。
 */
export async function updateBook(id: string, input: BookInput): Promise<Book> {
  // deleteBook と同じく、URL に埋め込む ID はエスケープする
  const response = await fetch(`/api/books/${encodeURIComponent(id)}`, {
    method: 'PUT',
    // createBook と同じく、JSON を送ることを伝える
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toRequest(input)),
  })

  if (!response.ok) {
    throw new Error(`本の更新に失敗しました（status: ${response.status}）`)
  }

  const body: BookResponse = await response.json()
  return toBook(body)
}
