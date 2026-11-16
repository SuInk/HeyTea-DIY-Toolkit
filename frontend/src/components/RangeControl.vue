<script setup lang="ts">
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from "reka-ui";
defineProps<{
  disabled?: boolean;
  label: string;
  modelValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [number] }>();
</script>
<template>
  <div class="range-control">
    <div class="field-heading">
      <span>{{ label }}</span
      ><output>{{ modelValue }}{{ unit }}</output>
    </div>
    <SliderRoot
      :disabled="disabled"
      class="slider"
      :model-value="[modelValue]"
      :min="min"
      :max="max"
      :step="step || 1"
      @update:model-value="(v) => emit('update:modelValue', v?.[0] ?? min)"
      ><SliderTrack class="slider-track"
        ><SliderRange class="slider-range" /></SliderTrack
      ><SliderThumb class="slider-thumb" :aria-label="label"
    /></SliderRoot>
  </div>
</template>
