<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 入力が止まってから検索するまでの待ち時間（ミリ秒） */
    delay?: number
  }>(),
  { delay: 300 },
)

const emit = defineEmits<{
  /** 検索する文字列（前後の空白は取り除く。空なら全件表示を意味する） */
  search: [keyword: string]
}>()

const keyword = ref('')

/** 最後に emit した文字列（同じ条件で何度も検索しないために覚えておく） */
let lastEmittedKeyword = ''
let timerId: ReturnType<typeof setTimeout> | undefined

// 1 文字打つたびに検索すると通信が多くなるので、入力が delay ミリ秒止まってから検索する（デバウンス）。
// v-model は日本語入力の変換中は値を更新しないので、変換が確定するまで検索は始まらない
watch(keyword, (value) => {
  clearTimeout(timerId)
  timerId = setTimeout(() => {
    const trimmed = value.trim()
    // 末尾に空白を足しただけなど、条件が変わらないときは検索しない
    if (trimmed === lastEmittedKeyword) return
    lastEmittedKeyword = trimmed
    emit('search', trimmed)
  }, props.delay)
})

// 画面から消えたあとにタイマーが動いて emit しないようにする
onBeforeUnmount(() => {
  clearTimeout(timerId)
})
</script>

<template>
  <section class="book-search">
    <label>
      検索
      <input
        v-model="keyword"
        name="keyword"
        type="search"
        placeholder="タイトルか著者の一部"
        autocomplete="off"
      />
    </label>
  </section>
</template>

<style scoped>
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input {
  padding: 0.5rem;
  font: inherit;
}
</style>
