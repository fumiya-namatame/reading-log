import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BookList from '../BookList.vue'
import BookListItem from '../BookListItem.vue'
import type { Book } from '@/types/book'

const books: Book[] = [
  { id: 'a', title: '本A', author: '著者A', finishedDate: '2026-09-01', review: '' },
  { id: 'b', title: '本B', author: '著者B', finishedDate: '2026-09-15', review: '' },
]

describe('BookList', () => {
  it('渡した本の数だけ BookListItem を描画する', () => {
    const wrapper = mount(BookList, { props: { books } })

    expect(wrapper.findAllComponents(BookListItem)).toHaveLength(2)
    expect(wrapper.find('.book-list__empty').exists()).toBe(false)
  })

  it('本が0件のときは空メッセージを表示する', () => {
    const wrapper = mount(BookList, { props: { books: [] } })

    expect(wrapper.find('.book-list__empty').text()).toBe('まだ本が登録されていません')
    expect(wrapper.findAllComponents(BookListItem)).toHaveLength(0)
  })

  it('emptyMessage を渡すと、本が 0 件のときにその文言を表示する', () => {
    const wrapper = mount(BookList, {
      props: { books: [], emptyMessage: '条件に合う本が見つかりませんでした' },
    })

    expect(wrapper.find('.book-list__empty').text()).toBe('条件に合う本が見つかりませんでした')
  })

  it('emptyMessage を渡しても、本があるときは表示しない', () => {
    const wrapper = mount(BookList, {
      props: { books, emptyMessage: '条件に合う本が見つかりませんでした' },
    })

    expect(wrapper.find('.book-list__empty').exists()).toBe(false)
  })

  it('子の delete イベントを親へ伝える', async () => {
    const wrapper = mount(BookList, { props: { books } })

    await wrapper.findAllComponents(BookListItem)[1]!.find('.book-item__delete').trigger('click')

    expect(wrapper.emitted('delete')).toEqual([['b']])
  })

  it('子の edit イベントを、押された本と一緒に親へ伝える', async () => {
    const wrapper = mount(BookList, { props: { books } })

    await wrapper.findAllComponents(BookListItem)[1]!.find('.book-item__edit').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[books[1]]])
  })
})
