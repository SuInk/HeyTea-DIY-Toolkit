<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "reka-ui";
const open = defineModel<boolean>({ required: true });
</script>
<template>
  <DialogRoot v-model:open="open"
    ><DialogPortal
      ><DialogOverlay class="dialog-overlay" /><DialogContent
        class="account-dialog"
        ><div class="dialog-heading">
          <DialogTitle>连接喜茶账号</DialogTitle
          ><DialogClose class="icon-button" aria-label="关闭登录窗口"
            >×</DialogClose
          >
        </div>
        <DialogDescription class="dialog-description"
          >上传需要登录，编辑和下载无需登录。</DialogDescription
        ><slot /></DialogContent></DialogPortal
  ></DialogRoot>
</template>
