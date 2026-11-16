import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Book } from '@/types/book'
import { fetchBooks } from '@/api/bookApi'
import { saveBooks } from '@/utils/bookStorage'
import App from '../App.vue'

// API 通信と localStorage への保存はモックに差し替え、画面の振る舞いだけを検証する
vi.mock('@/api/bookApi', () => ({
  fetchBooks: vi.fn(),
}))
vi.mock('@/utils/bookStorage', () => ({
  saveBooks: vi.fn(),
}))

const existingBooks: Book[] = [
  { id: 'a', title: '羅生門', author: '芥川龍之介', finishedDate: '2026-09-01', review: '' },
]

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchBooks).mockResolvedValue([])
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
    it('追加に成功するとフォームが空になり、エラーは表示されない', async () => {
      const wrapper = mount(App)
      await flushPromises()

      await wrapper.find('input[name="title"]').setValue('こころ')
      await wrapper.find('form').trigger('submit')

      expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('追加に失敗するとエラーを表示し、フォームの入力を残す', async () => {
      vi.mocked(saveBooks).mockImplementationOnce(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError')
      })
      const wrapper = mount(App)
      await flushPromises()

      await wrapper.find('input[name="title"]').setValue('こころ')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('[role="alert"]').text()).toBe('本の追加に失敗しました')
      expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('こころ')
    })
  })
})
