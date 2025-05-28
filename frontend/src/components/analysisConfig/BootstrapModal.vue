<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div>
    <!-- Modal -->
    <div ref="modalElement" class="modal modal-lg fade" :id="modalId" tabindex="-1" :aria-labelledby="modalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalLabel">{{ title }}</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">Close</button>
            <button v-if="isLoading" class="btn btn-primary" type="button" disabled> <span
                class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Loading...
            </button>
            <button v-else @click="handleSubmit" class="btn btn-primary">{{ submitButtonText }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'bootstrap';
import { ref } from 'vue';
import { onMounted } from 'vue';
import { computed, watch } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  submitButtonText: {
    type: String,
    default: 'Add'
  },
  modalId: {
    type: String,
    required: true
  },
  submitError: {
    type: Boolean,
    default: false
  },
  isOpen: {
    type: Boolean,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

const modalElement = ref<HTMLElement | null>(null);

// Define emits
const emit = defineEmits<{
  (e: 'submit'): void; // Event emitted when the submit button is clicked
  (e: 'close'): void;  // Event emitted when the modal should close
}>();

const modalLabel = computed(() => {
  return props.modalId + 'label';
});

let modalInstance: Modal | null = null;
// get modal element
onMounted(() => {
  if (modalElement.value) {
    modalInstance = new Modal(modalElement.value);
    modalElement.value.addEventListener('hidden.bs.modal', function () {
      if (props.isOpen)
        closeModal();
    })
  }
});


// watch isOpen to open/close modal accordingly
watch(
  () => props.isOpen,
  (newValue) => {
    if (modalInstance) {
      if (newValue) {
        // Logic when the modal opens
        modalInstance.show();

      } else {
        // Logic when the modal closes
        modalInstance.hide();
      }
    }
  }
);


const handleSubmit = () => {
  // Emit an event to the parent component
  emit('submit');
};

const closeModal = () => {
  // Emit an event to close the modal
  emit('close');
};
</script>
