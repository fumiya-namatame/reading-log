import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BookListItem from '../BookListItem.vue'
import type { Book } from '@/types/book'

const book: Book = {
  id: 'book-1',
  title: 'こころ',
  author: '夏目漱石',
  finishedDate: '2026-10-01',
  review: '先生の手紙が印象的だった',
}

describe('BookListItem', () => {
  it('タイトル・著者・読了日・感想を表示する', () => {
    const wrapper = mount(BookListItem, { props: { book } })

    expect(wrapper.find('.book-item__title').text()).toBe('こころ')
    expect(wrapper.find('.book-item__author').text()).toBe('夏目漱石')
    expect(wrapper.find('.book-item__date').text()).toBe('2026-10-01')
    expect(wrapper.find('.book-item__review').text()).toBe('先生の手紙が印象的だった')
  })

  it('削除ボタンを押すと本の ID で delete を emit する', async () => {
    const wrapper = mount(BookListItem, { props: { book } })

    await wrapper.find('.book-item__delete').trigger('click')

    expect(wrapper.emitted('delete')).toEqual([['book-1']])
    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('編集ボタンを押すと本全体で edit を emit する', async () => {
    const wrapper = mount(BookListItem, { props: { book } })

    await wrapper.find('.book-item__edit').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[book]])
    expect(wrapper.emitted('delete')).toBeUndefined()
  })
})
