import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Book } from '@/types/book'
import { createBook, deleteBook, fetchBooks } from '@/api/bookApi'
import App from '../App.vue'

// API 通信はモックに差し替え、画面の振る舞いだけを検証する
vi.mock('@/api/bookApi', () => ({
  fetchBooks: vi.fn(),
  createBook: vi.fn(),
  deleteBook: vi.fn(),
}))

const existingBooks: Book[] = [
  { id: 'a', title: '羅生門', author: '芥川龍之介', finishedDate: '2026-09-01', review: '' },
]

/** createBook が返す「登録された本」 */
const newBook: Book = { id: 'new', title: 'こころ', author: '', finishedDate: '', review: '' }

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchBooks).mockResolvedValue([])
    vi.mocked(createBook).mockResolvedValue({ ...newBook })
    vi.mocked(deleteBook).mockResolvedValue()
    // console.error の出力でテストログが汚れないように抑止する
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('一覧の取得', () => {
    it('表示したときに一覧を取得し、取得した本を表示する', async () => {
      vi.mocked(fetchBooks).mockResolvedValue(structuredClone(existingBooks))
      const wrapper = mount(App)

      await flushPromises()

      expect(fetchBooks).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toContain('羅生門')
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('取得している間は読み込み中を表示し、追加ボタンを無効にする', async () => {
      // resolve を呼ぶまで終わらない Promise を返し、取得中の画面を確認できるようにする
      let resolveFetch: (books: Book[]) => void = () => {}
      vi.mocked(fetchBooks).mockReturnValue(
        new Promise<Book[]>((resolve) => {
          resolveFetch = resolve
        }),
      )
      const wrapper = mount(App)
      await wrapper.find('input[name="title"]').setValue('こころ')

      expect(wrapper.find('[role="status"]').text()).toBe('読み込み中…')
      // 取得中は BookList を出さないので「まだ本が登録されていません」も出ない
      expect(wrapper.text()).not.toContain('まだ本が登録されていません')
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

      resolveFetch(structuredClone(existingBooks))
      await flushPromises()

      expect(wrapper.find('[role="status"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('羅生門')
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })

    it('取得に失敗するとエラーを表示する', async () => {
      vi.mocked(fetchBooks).mockRejectedValue(new Error('network error'))
      const wrapper = mount(App)

      await flushPromises()

      expect(wrapper.find('[role="alert"]').text()).toBe('本の一覧の取得に失敗しました')
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })
  })

  describe('本の追加', () => {
    it('追加に成功すると一覧に本が表示され、フォームが空になり、エラーは表示されない', async () => {
      const wrapper = mount(App)
      await flushPromises()

      await wrapper.find('input[name="title"]').setValue('こころ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(createBook).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.book-list').text()).toContain('こころ')
      expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('追加に失敗するとエラーを表示し、フォームの入力を残す', async () => {
      vi.mocked(createBook).mockRejectedValueOnce(new Error('network error'))
      const wrapper = mount(App)
      await flushPromises()

      await wrapper.find('input[name="title"]').setValue('こころ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('[role="alert"]').text()).toBe('本の追加に失敗しました')
      expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('こころ')
    })

    it('登録を待っている間は追加ボタンが無効になり、もう一度送信しても登録は 1 回だけ', async () => {
      // resolve を呼ぶまで終わらない Promise を返し、登録の途中の画面を確認できるようにする
      let resolveCreate: (book: Book) => void = () => {}
      vi.mocked(createBook).mockReturnValue(
        new Promise<Book>((resolve) => {
          resolveCreate = resolve
        }),
      )
      const wrapper = mount(App)
      await flushPromises()

      await wrapper.find('input[name="title"]').setValue('こころ')
      await wrapper.find('form').trigger('submit')
      // 二度押し（Enter キーでの送信も含む）を想定して、もう一度送信する
      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
      expect(createBook).toHaveBeenCalledTimes(1)

      resolveCreate({ ...newBook })
      await flushPromises()

      // 登録が終わるとフォームは空に戻る（タイトルが空なのでボタンはまだ無効）。
      // 次の本を入力すれば、また押せるようになる
      await wrapper.find('input[name="title"]').setValue('坊っちゃん')
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })
  })

  describe('本の削除', () => {
    it('削除に成功すると一覧から本が消える', async () => {
      vi.mocked(fetchBooks).mockResolvedValue(structuredClone(existingBooks))
      const wrapper = mount(App)
      await flushPromises()

      await wrapper.find('.book-item__delete').trigger('click')
      await flushPromises()

      expect(deleteBook).toHaveBeenCalledWith('a')
      expect(wrapper.text()).not.toContain('羅生門')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('削除に失敗するとエラーを表示し、本は一覧に残る', async () => {
      vi.mocked(fetchBooks).mockResolvedValue(structuredClone(existingBooks))
      vi.mocked(deleteBook).mockRejectedValueOnce(new Error('network error'))
      const wrapper = mount(App)
      await flushPromises()

      await wrapper.find('.book-item__delete').trigger('click')
      await flushPromises()

      expect(wrapper.find('[role="alert"]').text()).toBe('本の削除に失敗しました')
      expect(wrapper.text()).toContain('羅生門')
    })
  })
})
