import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import BookForm from '../BookForm.vue'
import type { Book, BookInput } from '@/types/book'

const book: Book = {
  id: 'book-1',
  title: 'こころ',
  author: '夏目漱石',
  finishedDate: '2026-10-01',
  review: '先生の手紙が印象的だった',
}

/** 入力欄の今の値を BookInput の形で取り出す */
function readInputs(wrapper: ReturnType<typeof mount<typeof BookForm>>): BookInput {
  return {
    title: (wrapper.find('input[name="title"]').element as HTMLInputElement).value,
    author: (wrapper.find('input[name="author"]').element as HTMLInputElement).value,
    finishedDate: (wrapper.find('input[name="finishedDate"]').element as HTMLInputElement).value,
    review: (wrapper.find('textarea[name="review"]').element as HTMLTextAreaElement).value,
  }
}

describe('BookForm', () => {
  it('入力して送信すると入力値で submit を emit する', async () => {
    const wrapper = mount(BookForm)

    await wrapper.find('input[name="title"]').setValue('こころ')
    await wrapper.find('input[name="author"]').setValue('夏目漱石')
    await wrapper.find('input[name="finishedDate"]').setValue('2026-10-01')
    await wrapper.find('textarea[name="review"]').setValue('面白かった')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([
      [{ title: 'こころ', author: '夏目漱石', finishedDate: '2026-10-01', review: '面白かった' }],
    ])
  })

  it('送信しただけでは入力欄を空にしない（保存失敗時に入力を残すため）', async () => {
    const wrapper = mount(BookForm)

    await wrapper.find('input[name="title"]').setValue('こころ')
    await wrapper.find('form').trigger('submit')

    expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('こころ')
  })

  it('reset を呼ぶと入力欄を空に戻す', async () => {
    const wrapper = mount(BookForm)

    await wrapper.find('input[name="title"]').setValue('こころ')
    await wrapper.find('textarea[name="review"]').setValue('面白かった')
    wrapper.vm.reset()
    await nextTick()

    expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('textarea[name="review"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('タイトルが空（空白のみ含む）のときは emit せず、送信ボタンも無効', async () => {
    const wrapper = mount(BookForm)

    await wrapper.find('input[name="title"]').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  describe('disabled', () => {
    it('disabled が true のときは、タイトルが入力されていても emit せず、送信ボタンも無効', async () => {
      const wrapper = mount(BookForm, { props: { disabled: true } })

      await wrapper.find('input[name="title"]').setValue('こころ')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.emitted('submit')).toBeUndefined()
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })

    it('disabled が true でも入力はできる', async () => {
      const wrapper = mount(BookForm, { props: { disabled: true } })

      await wrapper.find('input[name="title"]').setValue('こころ')

      expect((wrapper.find('input[name="title"]').element as HTMLInputElement).value).toBe('こころ')
    })

    it('disabled が false に戻ると送信できる', async () => {
      const wrapper = mount(BookForm, { props: { disabled: true } })
      await wrapper.find('input[name="title"]').setValue('こころ')

      await wrapper.setProps({ disabled: false })
      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
      expect(wrapper.emitted('submit')).toHaveLength(1)
    })
  })

  describe('editingBook', () => {
    it('未指定のときは追加用の表示で、キャンセルボタンはない', () => {
      const wrapper = mount(BookForm)

      expect(wrapper.find('h2').text()).toBe('本を追加する')
      expect(wrapper.find('button[type="submit"]').text()).toBe('追加')
      expect(wrapper.find('.book-form__cancel').exists()).toBe(false)
    })

    it('渡すと、その本の内容が入力欄に入り、更新用の表示になる', () => {
      const wrapper = mount(BookForm, { props: { editingBook: book } })

      expect(readInputs(wrapper)).toEqual({
        title: 'こころ',
        author: '夏目漱石',
        finishedDate: '2026-10-01',
        review: '先生の手紙が印象的だった',
      })
      expect(wrapper.find('h2').text()).toBe('本を編集する')
      expect(wrapper.find('button[type="submit"]').text()).toBe('更新')
      expect(wrapper.find('.book-form__cancel').exists()).toBe(true)
    })

    it('あとから渡しても、その本の内容が入力欄に入る', async () => {
      const wrapper = mount(BookForm)

      await wrapper.setProps({ editingBook: book })

      expect(readInputs(wrapper).title).toBe('こころ')
    })

    it('編集中に送信すると、ID を含まない入力値で submit を emit する', async () => {
      const wrapper = mount(BookForm, { props: { editingBook: book } })

      await wrapper.find('input[name="title"]').setValue('こころ（改版）')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.emitted('submit')).toEqual([
        [
          {
            title: 'こころ（改版）',
            author: '夏目漱石',
            finishedDate: '2026-10-01',
            review: '先生の手紙が印象的だった',
          },
        ],
      ])
    })

    it('入力を書き換えても、渡した本のオブジェクトは変わらない', async () => {
      const editingBook = structuredClone(book)
      const wrapper = mount(BookForm, { props: { editingBook } })

      await wrapper.find('input[name="title"]').setValue('別のタイトル')

      expect(editingBook).toEqual(book)
    })

    it('null に戻すと、入力欄が空になり追加用の表示に戻る', async () => {
      const wrapper = mount(BookForm, { props: { editingBook: book } })

      await wrapper.setProps({ editingBook: null })

      expect(readInputs(wrapper)).toEqual({ title: '', author: '', finishedDate: '', review: '' })
      expect(wrapper.find('button[type="submit"]').text()).toBe('追加')
    })

    it('キャンセルボタンを押すと cancel を emit し、submit は emit しない', async () => {
      const wrapper = mount(BookForm, { props: { editingBook: book } })

      await wrapper.find('.book-form__cancel').trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('disabled が true のときはキャンセルボタンも無効', () => {
      const wrapper = mount(BookForm, { props: { editingBook: book, disabled: true } })

      expect(wrapper.find('.book-form__cancel').attributes('disabled')).toBeDefined()
    })
  })
})
