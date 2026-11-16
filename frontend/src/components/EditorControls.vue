<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger } from "reka-ui";
import RangeControl from "./RangeControl.vue";
import type { ToneMode, DotPattern } from "../utils/image";
const toneMode = defineModel<ToneMode>("toneMode", { required: true });
const threshold = defineModel<number>("threshold", { required: true });
const dotThreshold = defineModel<number>("dotThreshold", { required: true });
const density = defineModel<number>("density", { required: true });
const pattern = defineModel<DotPattern>("pattern", { required: true });
const fit = defineModel<"cover" | "contain">("fit", { required: true });
const png = defineModel<boolean>("png", { required: true });
const filename = defineModel<string>("filename", { required: true });
defineProps<{ disabled: boolean }>();
</script>
<template>
  <fieldset :disabled="disabled" class="editor-controls">
    <div class="section-heading">
      <h2>画面调整</h2>
    </div>
    <label class="field-label">呈现方式</label
    ><TabsRoot v-model="toneMode"
      ><TabsList class="tabs" aria-label="呈现方式"
        ><TabsTrigger :disabled="disabled" value="binary">黑白</TabsTrigger
        ><TabsTrigger :disabled="disabled" value="sampled">点阵</TabsTrigger
        ><TabsTrigger :disabled="disabled" value="original"
          >原图</TabsTrigger
        ></TabsList
      ></TabsRoot
    ><RangeControl
      :disabled="disabled"
      v-if="toneMode === 'binary'"
      v-model="threshold"
      label="黑白阈值"
      :min="60"
      :max="220"
      :step="5"
    /><template v-if="toneMode === 'sampled'"
      ><RangeControl
        :disabled="disabled"
        v-model="dotThreshold"
        label="点阵阈值"
        :min="40"
        :max="220"
        :step="5" /><label class="field-label" for="pattern">点阵形状</label
      ><select id="pattern" v-model="pattern">
        <option value="circle">圆形 · 传统印刷</option>
        <option value="diamond">菱形 · 斜向纹理</option>
        <option value="cross">十字 · 线条颗粒</option>
        <option value="grid">方格 · 像素风格</option></select
      ><RangeControl
        :disabled="disabled"
        v-model="density"
        label="颗粒大小"
        :min="2"
        :max="24"
        unit="px"
    /></template>
    <label class="field-label" for="fit">画面适配</label
    ><select id="fit" v-model="fit">
      <option value="cover">铺满画布 · 裁切边缘</option>
      <option value="contain">完整保留 · 留白</option>
    </select>
    <div class="section-heading export-heading">
      <h2>导出设置</h2>
    </div>
    <label class="check-field"
      ><input type="checkbox" v-model="png" /><span
        >优先保留 PNG<small>超出 200KB 时自动优化</small></span
      ></label
    ><label class="field-label" for="filename">文件名称</label
    ><input id="filename" v-model="filename" autocomplete="off" />
    <p class="field-hint">
      图片只在你的浏览器内处理。点击上传后，才会发送至喜茶。
    </p>
  </fieldset>
</template>
