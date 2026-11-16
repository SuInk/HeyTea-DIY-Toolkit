<script setup lang="ts">
import { ref } from "vue";
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "reka-ui";
import AccountDialog from "./components/AccountDialog.vue";
import EditorControls from "./components/EditorControls.vue";
import { useWorkbench } from "./composables/useWorkbench";
const accountOpen = ref(false);
const {
  confirmOpen,
  resolveConfirmation,
  GITHUB_URL,
  DONATE_QR_URL,
  activeTab,
  phone,
  smsCode,
  manualToken,
  user,
  isSendingCode,
  isLoggingIn,
  countdown,
  fileInputRef,
  canvasRef,
  toneMode,
  dotPattern,
  isDraggingFile,
  binaryThreshold,
  sampleDensity,
  dotThreshold,
  fitMode,
  forcePng,
  isRendering,
  downloadName,
  selectedFileLabel,
  uploadState,
  isUploading,
  compressionHint,
  hasPreview,
  processedSizeLabel,
  processedFormatLabel,
  exceedsLimit,
  uploadDisabledReason,
  canUpload,
  triggerFileDialog,
  handleSendCode,
  handleSmsLogin,
  handleTokenLogin,
  clearAuth,
  onFileInput,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  renderPreview,
  handleUpload,
  handleDownload,
  notice,
} = useWorkbench();
</script>
<template>
  <div class="studio">
    <header class="topbar">
      <a class="wordmark" href="/" @click.prevent
        ><span class="brand-mark">喜</span><span>杯贴工作室</span></a
      >
      <div class="topbar-actions">
        <span class="local-badge"><i />本机工作台</span
        ><button
          class="account-button"
          :disabled="isUploading"
          @click="accountOpen = true"
        >
          <span class="avatar">{{ user ? "✓" : "○" }}</span>{{
            user ? user.name : "登录账号"
          }}<span class="arrow">↗</span>
        </button>
      </div>
    </header>
    <main>
      <div class="intro">
        <div>
          <h1>喜茶杯贴</h1>
        </div>
      </div>
      <div class="workspace">
        <section class="canvas-section" aria-label="杯贴预览">
          <div class="canvas-toolbar">
            <div>
              <span class="status-dot" />{{ hasPreview ? "实时预览" : "画布"
              }}<span class="toolbar-divider" />{{
                hasPreview ? selectedFileLabel : "未选择图片"
              }}
            </div>
            <button
              class="text-button"
              :disabled="isUploading"
              @click="triggerFileDialog"
            >
              {{ hasPreview ? "更换图片" : "添加图片" }} <span>＋</span>
            </button>
          </div>
          <input
            ref="fileInputRef"
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="onFileInput"
          />
          <div
            class="canvas-stage"
            :class="{ 'is-dragging': isDraggingFile }"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent="handleDragOver"
            @dragleave="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <div class="paper">
              <canvas
                ref="canvasRef"
                v-show="hasPreview"
                aria-label="处理后的杯贴预览"
              />
              <div v-if="!hasPreview" class="empty-canvas">
                <div class="empty-art" aria-hidden="true">
                  <span class="art-sun" /><span class="art-mountain" /><span
                    class="art-line"
                  />
                </div>
                <h2>添加图片</h2>
                <p>拖入图片，或点击选择</p>
                <button
                  class="primary-button"
                  :disabled="isUploading"
                  @click="triggerFileDialog"
                >
                  选择图片 <span>＋</span></button
                ><small>PNG / JPG / WEBP · 不超过 20MB</small>
              </div>
              <div v-if="isRendering" class="render-overlay" role="status">
                <span class="spinner" />正在生成预览
              </div>
            </div>
            <div v-if="isDraggingFile" class="drop-overlay">松开以添加图片</div>
          </div>
          <div class="canvas-footer">
            <span>{{
              hasPreview
                ? `${processedFormatLabel} · ${processedSizeLabel}`
                : "图片在本机处理，不会自动上传"
            }}</span><span :class="{ 'error-text': exceedsLimit }"
              >{{ exceedsLimit ? "超过大小限制" : "输出 ≤ 200KB"
              }}<span class="dot-separator">·</span>596 × 832 px</span
            >
          </div>
          <p v-if="compressionHint" class="inline-note">
            {{ compressionHint }}
          </p>
        </section>
        <aside class="properties">
          <EditorControls
            v-model:tone-mode="toneMode"
            v-model:threshold="binaryThreshold"
            v-model:dot-threshold="dotThreshold"
            v-model:density="sampleDensity"
            v-model:pattern="dotPattern"
            v-model:fit="fitMode"
            v-model:png="forcePng"
            v-model:filename="downloadName"
            :disabled="isUploading"
          />
          <div class="publish-area">
            <button
              class="primary-button publish-button"
              :disabled="
                !hasPreview || isRendering || isUploading || exceedsLimit
              "
              @click="user ? handleUpload() : (accountOpen = true)"
            >
              {{ isUploading ? "正在上传…" : user ? "上传到喜茶" : "登录并上传"
              }}<span>↗</span>
            </button>
            <div class="secondary-actions">
              <button
                :disabled="!hasPreview || isRendering"
                @click="handleDownload"
              >
                下载 {{ processedFormatLabel === "JPG" ? "JPG" : "PNG" }}
                <span>↓</span></button
              ><button
                :disabled="!hasPreview || isRendering || isUploading"
                @click="renderPreview"
              >
                重新渲染 <span>↻</span>
              </button>
            </div>
            <p class="field-hint">
              {{
                isRendering
                  ? "预览更新中，请稍候"
                  : uploadDisabledReason ||
                    (canUpload ? "准备好了，可以上传" : "")
              }}
            </p>
            <p
              v-if="uploadState"
              class="publish-result"
              :class="uploadState.type"
              role="status"
            >
              {{ uploadState.message }}
            </p>
          </div>
        </aside>
      </div>
      <div v-if="notice" class="notice" :class="notice.type" role="status">
        <span>{{ notice.message }}</span><button
          aria-label="关闭提示"
          @click="notice = null"
        >
          ×
        </button>
      </div>
      <details class="help">
        <summary>使用说明 <span>＋</span></summary>
        <div class="help-grid">
          <section>
            <h3>图片与隐私</h3>
            <p>
              选择、调整和下载图片不需要登录。上传时直连喜茶，不经过项目作者服务器。
            </p>
          </section>
          <section>
            <h3>关于登录与上传</h3>
            <p>
              使用已注册的喜茶账号。短信未确认时，若已经收到验证码可直接登录，请勿连续重发。上传后到同一账号的小程序查看。
            </p>
          </section>
          <section>
            <h3>关于打印效果</h3>
            <p>
              预览为 596 × 832 像素，文件自动优化到 200KB
              以内。实际效果与上传限制以喜茶为准。
            </p>
          </section>
        </div>
      </details>
    </main>
    <footer>
      <div>
        <a :href="GITHUB_URL" target="_blank" rel="noreferrer">开源项目 ↗</a
        ><a :href="DONATE_QR_URL" target="_blank" rel="noreferrer"
          >支持原作者 ↗</a
        ><span>非喜茶官方产品</span>
      </div>
    </footer>
    <AlertDialogRoot :open="confirmOpen"
      ><AlertDialogPortal
        ><AlertDialogOverlay class="dialog-overlay" /><AlertDialogContent
          class="account-dialog"
          ><AlertDialogTitle class="dialog-heading"
            >再次上传这张杯贴？</AlertDialogTitle
          ><AlertDialogDescription class="dialog-description"
            >刚刚已上传过相同图片。继续会再次向喜茶提交。</AlertDialogDescription
          >
          <div class="secondary-actions">
            <button @click="resolveConfirmation(false)">取消</button
            ><button class="primary-button" @click="resolveConfirmation(true)">
              继续上传
            </button>
          </div></AlertDialogContent
        ></AlertDialogPortal
      ></AlertDialogRoot
    ><AccountDialog v-model="accountOpen"
      ><template v-if="user"
        ><div class="signed-in">
          <span>✓</span>
          <h3>{{ user.name }}</h3>
          <p>已连接喜茶账号</p>
        </div>
        <button
          class="secondary-button full-width"
          :disabled="isUploading"
          @click="clearAuth()"
        >
          退出登录
        </button></template
      ><template v-else
        ><div class="tabs account-tabs">
          <button
            :aria-pressed="activeTab === 'sms'"
            :data-state="activeTab === 'sms' ? 'active' : ''"
            @click="activeTab = 'sms'"
          >
            短信登录</button
          ><button
            :aria-pressed="activeTab === 'token'"
            :data-state="activeTab === 'token' ? 'active' : ''"
            @click="activeTab = 'token'"
          >
            已有 Token
          </button>
        </div>
        <form v-if="activeTab === 'sms'" @submit.prevent="handleSmsLogin">
          <label class="field-label" for="phone">手机号</label
          ><input
            id="phone"
            v-model="phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel-national"
            maxlength="11"
            placeholder="输入 11 位手机号"
            :disabled="isSendingCode || isLoggingIn"
          /><label class="field-label" for="sms">短信验证码</label>
          <div class="sms-row">
            <input
              id="sms"
              v-model="smsCode"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="6 位验证码"
            /><button
              type="button"
              class="secondary-button"
              :disabled="isSendingCode || countdown > 0"
              @click="handleSendCode()"
            >
              {{
                isSendingCode
                  ? "发送中…"
                  : countdown > 0
                    ? `${countdown}s`
                    : "获取验证码"
              }}
            </button>
          </div>
          <button
            class="primary-button full-width"
            :disabled="isLoggingIn || isSendingCode || isUploading"
          >
            {{ isLoggingIn ? "正在登录…" : "连接账号" }}
          </button>
        </form>
        <form v-else @submit.prevent="handleTokenLogin">
          <label class="field-label" for="token">Bearer Token</label
          ><textarea
            id="token"
            v-model="manualToken"
            rows="4"
            autocomplete="off"
            placeholder="粘贴你自己的已有 Token"
          /><button
            class="primary-button full-width"
            :disabled="isLoggingIn || isUploading"
          >
            {{ isLoggingIn ? "正在登录…" : "使用 Token 连接" }}
          </button>
        </form></template
      >
      <p v-if="notice" class="account-notice" role="status">
        {{ notice.message }}
      </p>
      <p class="privacy-note">
        登录信息只保留在当前页面内存，刷新后需要重新登录。
      </p></AccountDialog
    >
  </div>
</template>
