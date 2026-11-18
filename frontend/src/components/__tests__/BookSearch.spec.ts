import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BookSearch from '../BookSearch.vue'

describe('BookSearch', () => {
  beforeEach(() => {
    // デバウンスの待ち時間を、実際に待たずに進められるようにする
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('入力してから 300 ミリ秒たつと、入力した文字列で search を emit する', async () => {
    const wrapper = mount(BookSearch)

    await wrapper.find('input[name="keyword"]').setValue('漱石')
    vi.advanceTimersByTime(299)
    expect(wrapper.emitted('search')).toBeUndefined()

    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('search')).toEqual([['漱石']])
  })

  it('続けて入力したときは、最後の入力から待ち時間がたったときに 1 回だけ emit する', async () => {
    const wrapper = mount(BookSearch)
    const input = wrapper.find('input[name="keyword"]')

    await input.setValue('夏')
    vi.advanceTimersByTime(200)
    await input.setValue('夏目')
    vi.advanceTimersByTime(200)
    // 最初の入力からは 400 ミリ秒たっているが、最後の入力からはまだ 200 ミリ秒
    expect(wrapper.emitted('search')).toBeUndefined()

    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('search')).toEqual([['夏目']])
  })

  it('前後の空白は取り除いて emit する', async () => {
    const wrapper = mount(BookSearch)

    await wrapper.find('input[name="keyword"]').setValue('  漱石　')
    vi.runAllTimers()

    expect(wrapper.emitted('search')).toEqual([['漱石']])
  })

  it('入力を空に戻すと、空文字で emit する（全件表示に戻すため）', async () => {
    const wrapper = mount(BookSearch)
    const input = wrapper.find('input[name="keyword"]')
    await input.setValue('漱石')
    vi.runAllTimers()

    await input.setValue('')
    vi.runAllTimers()

    expect(wrapper.emitted('search')).toEqual([['漱石'], ['']])
  })

  it('空白を足しただけなど、前回と条件が変わらないときは emit しない', async () => {
    const wrapper = mount(BookSearch)
    const input = wrapper.find('input[name="keyword"]')
    await input.setValue('漱石')
    vi.runAllTimers()

    await input.setValue('漱石 ')
    vi.runAllTimers()

    expect(wrapper.emitted('search')).toEqual([['漱石']])
  })

  it('最初から空白だけを入力しても emit しない（全件表示のまま変わらないため）', async () => {
    const wrapper = mount(BookSearch)

    await wrapper.find('input[name="keyword"]').setValue('   ')
    vi.runAllTimers()

    expect(wrapper.emitted('search')).toBeUndefined()
  })

  it('delay で待ち時間を変えられる', async () => {
    const wrapper = mount(BookSearch, { props: { delay: 1000 } })

    await wrapper.find('input[name="keyword"]').setValue('漱石')
    vi.advanceTimersByTime(999)
    expect(wrapper.emitted('search')).toBeUndefined()

    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('search')).toEqual([['漱石']])
  })

  it('待っている間に画面から消えたら、emit しない', async () => {
    const wrapper = mount(BookSearch)
    await wrapper.find('input[name="keyword"]').setValue('漱石')
    // unmount 後は emitted() を読めないので、先に参照を取っておく
    const emitted = wrapper.emitted()

    wrapper.unmount()
    vi.runAllTimers()

    expect(emitted.search).toBeUndefined()
  })
})
