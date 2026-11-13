/** 保存される本のデータ */
export interface Book {
  /** 一意な ID（crypto.randomUUID() を想定） */
  id: string
  /** タイトル */
  title: string
  /** 著者 */
  author: string
  /** 読了日（'YYYY-MM-DD' 形式。input[type=date] の値をそのまま保持） */
  finishedDate: string
  /** 感想 */
  review: string
}

/** フォームの入力値（ID は追加時に採番するので含まない） */
export type BookInput = Omit<Book, 'id'>

/**
 * バックエンド API（GET /api/books など）が返す本の JSON。
 * 画面では Book に変換してから使う（null は '' にそろえる）。
 */
export interface BookResponse {
  /** 一意な ID（バックエンドが採番した UUID） */
  id: string
  /** タイトル（バックエンドの入力チェックで必須） */
  title: string
  /** 著者（登録時に省略されると null） */
  author: string | null
  /** 読了日（'YYYY-MM-DD' 形式。未入力なら null） */
  finishedDate: string | null
  /** 感想（登録時に省略されると null） */
  review: string | null
}
