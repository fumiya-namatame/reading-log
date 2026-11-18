<script setup lang="ts">
import type { Book } from '@/types/book'
import BookListItem from './BookListItem.vue'

withDefaults(
  defineProps<{
    books: Book[]
    /** 本が 0 件のときに出す文言（検索で 0 件のときなど、場面に合わせて親が変える） */
    emptyMessage?: string
  }>(),
  { emptyMessage: 'まだ本が登録されていません' },
)

const emit = defineEmits<{
  edit: [book: Book]
  delete: [id: string]
}>()
</script>

<template>
  <section class="book-list">
    <h2>読んだ本</h2>
    <p v-if="books.length === 0" class="book-list__empty">{{ emptyMessage }}</p>
    <ul v-else class="book-list__items">
      <BookListItem
        v-for="book in books"
        :key="book.id"
        :book="book"
        @edit="(book) => emit('edit', book)"
        @delete="(id) => emit('delete', id)"
      />
    </ul>
  </section>
</template>

<style scoped>
.book-list__items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
}

.book-list__empty {
  opacity: 0.7;
}
</style>
