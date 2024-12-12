<script setup lang="ts">
import '../assets/editor-pop-up.css'
import { watch } from 'vue'

import { ref } from 'vue'
import type { Annotation, Entity } from '../types'

// Props for linked entities
const props = defineProps<{
  entities: Array<Entity>
  triggerAnnotation: boolean
  annotation?: Annotation
}>()
const emit = defineEmits(['add-annotation', 'cancel-annotation', 'edit-annotation'])

const addDisabled = ref(true)
const dialogOpen = ref(false)
const entityId = ref<string | undefined>(undefined)
const comment = ref<string | undefined>('')
const currentEditAnnotation = ref<Annotation | undefined>(undefined)

watch(
  () => props.triggerAnnotation,
  (newVal) => {
    dialogOpen.value = newVal
  },
)

watch(
  () => props.annotation,
  (newVal) => {
    currentEditAnnotation.value = newVal
    if (currentEditAnnotation.value) {
      entityId.value = currentEditAnnotation.value.entityId
      comment.value = currentEditAnnotation.value.comment
    }
  },
)

watch([entityId, comment], () => {
  addDisabled.value = !(entityId.value != null || comment.value != '')
})

const handleAdd = () => {
  emit('add-annotation', {
    annotationId: crypto.randomUUID(),
    entityId: entityId.value,
    comment: comment.value,
  })
  entityId.value = undefined
  comment.value = ''
}

const handleCancel = () => {
  emit('cancel-annotation')
  entityId.value = undefined
  comment.value = ''
}

const handleEdit = () => {
  emit('edit-annotation', {
    entityId: entityId.value,
    comment: comment.value,
  })
  entityId.value = undefined
  comment.value = ''
}
</script>

<template>
  <div v-if="dialogOpen" class="modal d-block" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ props.annotation ? 'Edit Annotation' : 'Add Annotation' }}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="handleCancel()"
          ></button>
        </div>

        <div class="modal-body">
          <div class="mb-3">
            <label for="linked-entities" class="form-label">Linked Entities</label>
            <select id="linked-entities" v-model="entityId" class="form-select" required>
              <option disabled value="">Link an entity</option>
              <option v-for="entity in props.entities" :key="entity.id" :value="entity.id">
                {{ entity.name }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label for="comment" class="form-label">Comment</label>
            <textarea
              id="comment"
              v-model="comment"
              class="form-control"
              rows="4"
              placeholder="Add comment"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleCancel()">Cancel</button>
          <button
            v-if="!currentEditAnnotation"
            type="button"
            :disabled="addDisabled"
            @click="handleAdd()"
            class="btn btn-primary"
          >
            Add
          </button>
          <button
            v-else
            type="button"
            :disabled="addDisabled"
            @click="handleEdit()"
            class="btn btn-primary"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade" :class="{ show: dialogOpen }" v-if="dialogOpen"></div>
</template>
