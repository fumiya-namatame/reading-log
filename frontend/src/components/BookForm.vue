<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { BookInput } from '@/types/book'

const props = defineProps<{
  /** true のあいだは送信できない（一覧の取得中など、親の都合で送信を止めたいときに使う） */
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [input: BookInput]
}>()

/** 入力欄の初期値 */
function createEmptyInput(): BookInput {
  return { title: '', author: '', finishedDate: '', review: '' }
}

const form = reactive<BookInput>(createEmptyInput())

/** 無効にされておらず、タイトルが入力されていれば送信できる */
const canSubmit = computed(() => !props.disabled && form.title.trim() !== '')

function handleSubmit(): void {
  if (!canSubmit.value) return
  // reactive のままだと親で参照を共有してしまうので、コピーして渡す
  emit('submit', { ...form })
}

/** 入力欄を空に戻す。保存に失敗したとき入力を残せるよう、呼ぶタイミングは親が決める */
function reset(): void {
  Object.assign(form, createEmptyInput())
}

defineExpose({ reset })
</script>

<template>
  <section class="book-form">
    <h2>本を追加する</h2>
    <form @submit.prevent="handleSubmit">
      <label>
        タイトル
        <input v-model="form.title" name="title" type="text" required />
      </label>
      <label>
        著者
        <input v-model="form.author" name="author" type="text" />
      </label>
      <label>
        読了日
        <input v-model="form.finishedDate" name="finishedDate" type="date" />
      </label>
      <label>
        感想
        <textarea v-model="form.review" name="review" rows="4"></textarea>
      </label>
      <button type="submit" :disabled="!canSubmit">追加</button>
    </form>
  </section>
</template>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input,
textarea {
  padding: 0.5rem;
  font: inherit;
}

button {
  align-self: flex-start;
  padding: 0.5rem 1.5rem;
}
</style>
