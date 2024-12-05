<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { watch } from 'vue'

import { ref } from 'vue'
import type { Entity } from '../types'

// Props for linked entities
const props = defineProps<{
  entities: Array<Entity>
  triggerAnnotation: boolean
  annotation?: {
    id: string
    description: string
    annotationText: string
    from: number
    to: number
  }
}>()

const emit = defineEmits(['add-annotation', 'cancel-annotation', 'edit-annotation'])

const addDisabled = ref(true)
const dialogOpen = ref(false)
const entityId = ref<string | undefined>(undefined)
const description = ref<string>('')
const currentEditAnnotation = ref<
  | {
      id: string
      description: string
      annotationText: string
      from: number
      to: number
    }
  | undefined
>(undefined)

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
      entityId.value = currentEditAnnotation.value.id
      description.value = currentEditAnnotation.value.description
    }
  },
)

watch([entityId, description], () => {
  addDisabled.value = !(entityId.value != null || description.value != '')
})

const handleAdd = () => {
  emit('add-annotation', {
    id: entityId.value,
    description: description.value,
  })
  entityId.value = undefined
  description.value = ''
}

const handleCancel = () => {
  emit('cancel-annotation')
  entityId.value = undefined
  description.value = ''
}

const handleEdit = () => {
  emit('edit-annotation', {
    id: entityId.value,
    description: description.value,
  })
  entityId.value = undefined
  description.value = ''
}
</script>

<template>
  <AlertDialog v-model:open="dialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{
          props.annotation ? 'Edit Annotation' : 'Add Annotation'
        }}</AlertDialogTitle>
      </AlertDialogHeader>
      <div class="w-full grid grid-rows-2">
        <SelectLabel>Linked Entities</SelectLabel>
        <Select v-model="entityId">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="Link an entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem
                :value="entity.id.toString()"
                v-for="entity in props.entities"
                :key="entity.id"
              >
                {{ entity.id }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div class="grid w-full max-w-sm items-center gap-1.5">
        <label for="description" class="block text-sm font-medium">Description</label>
        <Input id="description" v-model="description" placeholder="Add description" />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancel()">Cancel</AlertDialogCancel>
        <div v-if="!currentEditAnnotation">
          <AlertDialogAction :disabled="addDisabled" @click="handleAdd()">Add</AlertDialogAction>
        </div>
        <div v-else>
          <AlertDialogAction :disabled="addDisabled" @click="handleEdit()">Edit</AlertDialogAction>
        </div>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
