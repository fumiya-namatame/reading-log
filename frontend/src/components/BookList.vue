<script setup lang="ts">
import type { Book } from '@/types/book'
import BookListItem from './BookListItem.vue'

defineProps<{
  books: Book[]
}>()

const emit = defineEmits<{
  edit: [book: Book]
  delete: [id: string]
}>()
</script>

<template>
  <section class="book-list">
    <h2>読んだ本</h2>
    <p v-if="books.length === 0" class="book-list__empty">まだ本が登録されていません</p>
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
