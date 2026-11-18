<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Book, BookInput } from '@/types/book'

const props = defineProps<{
  /** true のあいだは送信できない（一覧の取得中など、親の都合で送信を止めたいときに使う） */
  disabled?: boolean
  /** 編集中の本。渡すとその内容を入力欄に入れ、更新用の表示にする（null・未指定なら追加用） */
  editingBook?: Book | null
}>()

const emit = defineEmits<{
  submit: [input: BookInput]
  /** 編集をやめたいとき（キャンセルボタン）。編集状態を終わらせるのは親が行う */
  cancel: []
}>()

/** 入力欄の初期値 */
function createEmptyInput(): BookInput {
  return { title: '', author: '', finishedDate: '', review: '' }
}

const form = reactive<BookInput>(createEmptyInput())

/** 編集中かどうか（見出し・ボタンの表示を切り替える） */
const isEditing = computed(() => props.editingBook != null)

/**
 * 編集する本が変わったら、入力欄をその本の内容にする。
 * 編集が終わった（null になった）ら、追加用に入力欄を空に戻す。
 * immediate: 最初から editingBook が渡された場合にも反映するため。
 */
watch(
  () => props.editingBook,
  (book) => {
    if (book) {
      // ID は入力欄に含めないので、BookInput の項目だけをコピーする
      const { title, author, finishedDate, review } = book
      Object.assign(form, { title, author, finishedDate, review })
    } else {
      reset()
    }
  },
  { immediate: true },
)

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
    <h2>{{ isEditing ? '本を編集する' : '本を追加する' }}</h2>
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
      <div class="book-form__actions">
        <button type="submit" :disabled="!canSubmit">{{ isEditing ? '更新' : '追加' }}</button>
        <!-- 保存中にキャンセルすると、画面は編集をやめたのに更新だけ反映されてしまうので止める -->
        <button
          v-if="isEditing"
          type="button"
          class="book-form__cancel"
          :disabled="disabled"
          @click="emit('cancel')"
        >
          キャンセル
        </button>
      </div>
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

.book-form__actions {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1.5rem;
}
</style>
