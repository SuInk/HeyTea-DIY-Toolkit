<template>
  <div class="min-h-screen bg-slate-950 pb-16 text-slate-50">
    <div class="mx-auto max-w-6xl px-4 py-10">
      <header class="flex flex-col gap-2 pb-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm uppercase tracking-widest text-brand-300">HeyTea DIY Toolkit</p>
          <a
            :href="GITHUB_URL"
            class="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-slate-100 transition hover:border-white/60 hover:bg-white/10"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4 fill-current"
              aria-hidden="true"
            >
              <path
                d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.11.79-.25.79-.56v-2c-3.21.7-3.89-1.38-3.89-1.38a3.07 3.07 0 0 0-1.28-1.7c-1.05-.72.08-.7.08-.7a2.43 2.43 0 0 1 1.78 1.2 2.46 2.46 0 0 0 3.35 1 2.47 2.47 0 0 1 .74-1.55c-2.56-.3-5.26-1.28-5.26-5.71A4.47 4.47 0 0 1 5.31 8a4.14 4.14 0 0 1 .11-3.05s1-.32 3.3 1.23a11.33 11.33 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23a4.14 4.14 0 0 1 .12 3.05 4.46 4.46 0 0 1 1.18 3.11c0 4.45-2.71 5.41-5.28 5.7a2.77 2.77 0 0 1 .8 2.16v3.21c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z"
              />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
        <h1 class="text-3xl font-semibold">喜茶杯贴前端工作台</h1>
      </header>

      <div class="grid gap-6 lg:grid-cols-5">
        <section class="lg:col-span-2">
          <el-card body-style="{padding: '1.5rem'}" shadow="hover" class="space-y-4">
            <div
              :class="[
                'rounded-xl border p-4 text-sm',
                user
                  ? 'border-green-400/70 bg-green-400/20 text-green'
                  : 'text-green/10 bg-slate-900/40 text-slate-200'
              ]"
            >
              <p
                class="text-xs uppercase tracking-widest"
                :class="user ? 'text-green/90' : 'text-slate-400'"
              >
                当前状态
              </p>
              <p class="text-2xl font-semibold mt-1 text-green">
                {{ user ? `已登录 ${user.name}` : '未登录' }}
              </p>
              <p v-if="user" class="text-sm mt-1 text-green">
                ID: {{ user.user_main_id }}
              </p>
            </div>

            <el-tabs v-model="activeTab" class="text-slate-900">
              <el-tab-pane label="短信验证码" name="sms">
                <template v-if="!user">
                  <el-form label-position="top" class="space-y-4">
                    <el-form-item label="手机号 (仅支持国内 11 位)">
                      <el-input v-model="phone" maxlength="11" placeholder="例：13800000000" />
                    </el-form-item>
                    <el-form-item label="短信验证码">
                      <div class="flex gap-2">
                        <el-input v-model="smsCode" maxlength="6" placeholder="6 位数字" />
                        <el-button
                          type="primary"
                          :loading="isSendingCode"
                          :disabled="isSendingCode || countdown > 0"
                          @click="handleSendCode"
                        >
                          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                        </el-button>
                      </div>
                    </el-form-item>
                    <el-button type="primary" :loading="isLoggingIn" @click="handleSmsLogin">
                      使用短信登录
                    </el-button>
                  </el-form>
                </template>
                <template v-else>
                  <el-alert
                    type="success"
                    :closable="false"
                    show-icon
                    title="已登录"
                    description="如需重新登录，请先退出。"
                  />
                </template>
              </el-tab-pane>

              <el-tab-pane label="Token 登录" name="token">
                <el-form label-position="top" class="space-y-4">
                  <el-form-item label="Bearer Token">
                    <el-input
                      v-model="manualToken"
                      type="textarea"
                      :rows="4"
                      placeholder="粘贴已有 Token"
                    />
                  </el-form-item>
                  <el-button type="primary" :loading="isLoggingIn" @click="handleTokenLogin">
                    使用 Token 登录
                  </el-button>
                </el-form>
              </el-tab-pane>
            </el-tabs>

            <div class="mt-2 flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-slate-300">
                <el-switch v-model="rememberMe" size="small" /> 记住 Token（本地加密存储）
              </label>
              <el-button link type="danger" @click="clearAuth" :disabled="!authToken">
                退出登录
              </el-button>
            </div>
          </el-card>
        </section>

        <section class="lg:col-span-3">
          <el-card body-style="{padding: '1.5rem'}" shadow="hover" class="space-y-6">
            <div class="flex flex-wrap items-center gap-3">
              <el-button type="primary" @click="triggerFileDialog">选择或拖入 PNG / JPG</el-button>
              <span class="text-sm text-slate-300">{{ selectedFileLabel }}</span>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden"
                @change="onFileInput"
              />
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold">杯贴效果 {{ CUP_WIDTH }}×{{ CUP_HEIGHT }} px</h3>
                  <el-tag size="small" effect="dark">@2:3 比例</el-tag>
                </div>
                <div class="relative rounded-2xl border border-white/10 bg-black/30 p-3">
                  <canvas
                    v-show="hasPreview"
                    ref="canvasRef"
                    class="w-full rounded-lg"
                    style="aspect-ratio: 596 / 832"
                  />
                  <div
                    v-if="!hasPreview"
                    class="flex h-[420px] flex-col items-center justify-center gap-2 text-slate-400"
                  >
                    <span class="text-xl">🖼️</span>
                    <p class="text-sm">先选择一张图片，系统会自动缩放到 596×832 并可选灰度</p>
                  </div>
                  <div
                    v-if="isRendering"
                    class="absolute inset-3 rounded-lg bg-black/60 backdrop-blur-sm"
                  >
                    <div class="flex h-full items-center justify-center text-sm text-slate-200">
                      正在处理图片…
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span>当前文件：{{ processedFormatLabel }} · {{ processedSizeLabel }}</span>
                  <span :class="exceedsLimit ? 'text-red-400' : ''">限制 ≤ {{ MAX_SIZE_KB }}KB</span>
                </div>
                <p v-if="compressionHint" class="text-xs text-amber-300">{{ compressionHint }}</p>
                <el-alert
                  :closable="false"
                  title="提示"
                  type="info"
                  description="可切换灰度/裁剪模式，确保宽高符合喜茶要求（596×832，小于 200KB）。"
                  show-icon
                />
              </div>

              <div class="space-y-4">
                <el-form label-width="110px" class="text-slate-900">
                <el-form-item label="灰度滤镜">
                  <el-switch v-model="grayscale" />
                </el-form-item>
                <el-form-item label="缩放策略">
                  <el-select v-model="fitMode" placeholder="选择适配方式">
                    <el-option label="填满画布（裁切边缘）" value="cover" />
                    <el-option label="完整保留（留空白）" value="contain" />
                  </el-select>
                </el-form-item>
                <el-form-item label="强制输出 PNG">
                  <el-switch v-model="forcePng" />
                </el-form-item>
                <el-form-item label="文件名">
                  <el-input v-model="downloadName" placeholder="上传时使用的文件名" />
                </el-form-item>
                </el-form>

                <div class="flex flex-wrap gap-3">
                  <el-button
                    type="success"
                    :disabled="!canUpload"
                    :loading="isUploading"
                    @click="handleUpload"
                  >
                    上传杯贴
                  </el-button>
                  <el-button
                    :disabled="!hasPreview"
                    @click="handleDownload"
                  >
                    下载 PNG
                  </el-button>
                  <el-button
                    link
                    type="info"
                    :disabled="!hasPreview"
                    @click="renderPreview"
                  >
                    重新渲染
                  </el-button>
                </div>

                <el-result
                  v-if="uploadState"
                  :icon="uploadState.type"
                  :title="uploadState.message"
                >
                  <template #sub-title>
                    <span
                      v-if="uploadState.type === 'success'"
                      class="text-xs text-slate-400"
                    >
                      如果工具对你有帮助，欢迎
                      <a
                        :href="DONATE_QR_URL"
                        target="_blank"
                        rel="noreferrer"
                        class="ml-1 text-brand-300 underline decoration-dotted hover:text-brand-200"
                      >赞赏</a
                      >，谢谢支持 💛
                    </span>
                    <span
                      v-else-if="uploadState.type === 'error'"
                      class="text-xs text-red-200"
                    >
                      可能是触发了每日上传 10 张的限制，请稍后再试。
                    </span>
                  </template>
                </el-result>
              </div>
            </div>
          </el-card>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { isAxiosError } from 'axios';

import { CAPTCHA_APP_ID, CUP_HEIGHT, CUP_WIDTH, MAX_UPLOAD_BYTES } from '@/config/heytea';
import { requestCaptcha } from '@/utils/captcha';
import { readFileAsImage, renderToCupCanvas } from '@/utils/image';
import {
  fetchUserInfo,
  loginWithSms,
  sendSmsCode,
  uploadCupSticker,
  type CaptchaPayload,
  type HeyTeaUser,
} from '@/services/heytea';

const GITHUB_URL = 'https://github.com/SuInk/HeyTea-DIY-Toolkit';
const STORAGE_KEY = 'heytea-token';
const DONATE_QR_URL = `${import.meta.env.BASE_URL}donate.jpg`;

type UploadState = {
  type: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
};

function extractServerMessage(payload: unknown): string | null {
  if (!payload) {
    return null;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['message', 'msg', 'error']) {
      const value = record[key];
      if (typeof value === 'string') {
        return value;
      }
    }
  }
  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const serverMessage = extractServerMessage(error.response?.data);
    if (serverMessage) {
      return serverMessage;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

function formatServerPayload(payload: unknown): string | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

const activeTab = ref<'sms' | 'token'>('sms');
const phone = ref('');
const smsCode = ref('');
const manualToken = ref('');
const rememberMe = ref(true);
const authToken = ref<string | null>(localStorage.getItem(STORAGE_KEY));
const user = ref<HeyTeaUser | null>(null);

const isSendingCode = ref(false);
const isLoggingIn = ref(false);
const countdown = ref(0);
let countdownTimer: number | null = null;

const fileInputRef = ref<HTMLInputElement>();
const canvasRef = ref<HTMLCanvasElement>();
const workingImage = ref<HTMLImageElement | null>(null);
const processedBlob = ref<Blob | null>(null);
const grayscale = ref(true);
const fitMode = ref<'cover' | 'contain'>('cover');
const forcePng = ref(true);
const isRendering = ref(false);
const downloadName = ref('target.png');
const selectedFileLabel = computed(() =>
  processedBlob.value
    ? buildFilename(downloadName.value, processedBlob.value)
    : downloadName.value || '未选择文件'
);
const uploadState = ref<UploadState | null>(null);
const isUploading = ref(false);
const compressionHint = ref('');
const lastUploadHash = ref<string | null>(null);

const hasPreview = computed(() => Boolean(processedBlob.value));
const canUpload = computed(
  () => !!(authToken.value && user.value && processedBlob.value) && !isUploading.value
);
const processedSizeLabel = computed(() =>
  processedBlob.value ? `${(processedBlob.value.size / 1024).toFixed(1)} KB` : '--'
);
const processedFormatLabel = computed(() =>
  processedBlob.value ? (processedBlob.value.type === 'image/jpeg' ? 'JPG' : 'PNG') : '--'
);
const exceedsLimit = computed(
  () => (processedBlob.value?.size ?? 0) > MAX_UPLOAD_BYTES
);
const MAX_SIZE_KB = Math.round(MAX_UPLOAD_BYTES / 1024);

function triggerFileDialog() {
  fileInputRef.value?.click();
}

function startCountdown() {
  countdown.value = 60;
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0 && countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

async function handleSendCode(payload?: CaptchaPayload) {
  if (!/^1\d{10}$/.test(phone.value)) {
    ElMessage.error('请输入有效的 11 位手机号');
    return;
  }

  if (!payload) {
    isSendingCode.value = true;
  }

  try {
    const result = await sendSmsCode(phone.value, payload);
    if (result.requiresCaptcha) {
      isSendingCode.value = false;
      const captcha = await requestCaptcha(CAPTCHA_APP_ID);
      await handleSendCode({ ticket: captcha.ticket, randstr: captcha.randstr });
      return;
    }

    startCountdown();
    ElMessage.success('验证码已发送');
  } catch (error) {
    const message = getErrorMessage(error, '发送失败');
    ElMessage.error(message);
  } finally {
    if (!payload) {
      isSendingCode.value = false;
    }
  }
}

async function bindToken(token: string) {
  authToken.value = token;
  manualToken.value = token;
  if (rememberMe.value) {
    localStorage.setItem(STORAGE_KEY, token);
  }
  await resolveUserProfile();
}

async function handleSmsLogin() {
  if (!/^1\d{10}$/.test(phone.value)) {
    ElMessage.error('请输入正确的手机号');
    return;
  }
  if (!/^\d{4,6}$/.test(smsCode.value)) {
    ElMessage.error('请输入收到的验证码');
    return;
  }

  isLoggingIn.value = true;
  try {
    const token = await loginWithSms(phone.value, smsCode.value);
    await bindToken(token);
    ElMessage.success('登录成功');
  } catch (error) {
    const message = getErrorMessage(error, '登录失败');
    ElMessage.error(message);
  } finally {
    isLoggingIn.value = false;
  }
}

async function handleTokenLogin() {
  if (!manualToken.value.trim()) {
    ElMessage.error('请输入有效的 Token');
    return;
  }
  isLoggingIn.value = true;
  try {
    await bindToken(manualToken.value.trim());
    ElMessage.success('Token 登录成功');
  } catch (error) {
    const message = getErrorMessage(error, '登录失败');
    ElMessage.error(message);
    authToken.value = null;
  } finally {
    isLoggingIn.value = false;
  }
}

async function resolveUserProfile() {
  if (!authToken.value) {
    return;
  }
  try {
    const info = await fetchUserInfo(authToken.value);
    user.value = info;
  } catch (error) {
    const message = getErrorMessage(error, '获取用户信息失败');
    ElMessage.error(message);
    clearAuth(false);
  }
}

function clearAuth(showToast = true) {
  authToken.value = null;
  manualToken.value = '';
  user.value = null;
  uploadState.value = null;
  lastUploadHash.value = null;
  localStorage.removeItem(STORAGE_KEY);
  if (showToast) {
    ElMessage.success('已退出登录');
  }
}

async function onFileInput(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files?.length) return;
  await handleFile(files[0]);
  (event.target as HTMLInputElement).value = '';
}

async function handleFile(file: File) {
  try {
    const image = await readFileAsImage(file);
    workingImage.value = image;
    downloadName.value = file.name.replace(/\.[^.]+$/, '') + '.png';
    await renderPreview();
  } catch (error) {
    const message = getErrorMessage(error, '图片处理失败');
    ElMessage.error(message);
  }
}

async function renderPreview() {
  if (!canvasRef.value || !workingImage.value) {
    return;
  }
  isRendering.value = true;
  try {
    const blob = await renderToCupCanvas(canvasRef.value, workingImage.value, {
      grayscale: grayscale.value,
      fit: fitMode.value,
      targetFormat: forcePng.value ? 'png' : 'auto',
      maxBytes: MAX_UPLOAD_BYTES,
    });
    processedBlob.value = blob;
    if (forcePng.value && blob.type !== 'image/png') {
      compressionHint.value = `PNG 超出 ${MAX_SIZE_KB}KB，已自动压缩为 JPG。`;
      ElMessage.warning(compressionHint.value);
    } else {
      compressionHint.value = '';
    }
    uploadState.value = null;
  } catch (error) {
    const message = getErrorMessage(error, '渲染失败');
    ElMessage.error(message);
  } finally {
    isRendering.value = false;
  }
}

async function handleUpload() {
  if (!authToken.value || !user.value || !processedBlob.value) {
    ElMessage.error('请先登录并准备好图片');
    return;
  }
  isUploading.value = true;
  uploadState.value = null;
  try {
    const currentHash = await hashBlob(processedBlob.value);
    if (lastUploadHash.value && lastUploadHash.value === currentHash) {
      try {
        await ElMessageBox.confirm(
          '检测到你刚刚上传过相同的图片，是否继续？',
          '重复上传提醒',
          {
            confirmButtonText: '继续上传',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
      } catch {
        ElMessage.info('已取消重复上传');
        isUploading.value = false;
        return;
      }
    }

    await uploadCupSticker({
      token: authToken.value,
      userMainId: user.value.user_main_id,
      blob: processedBlob.value,
      filename: buildFilename(downloadName.value, processedBlob.value),
    });
    uploadState.value = { type: 'success', message: '上传成功 🎉' };
    lastUploadHash.value = currentHash;
    ElMessage.success('杯贴上传成功');
  } catch (error) {
    const message = getErrorMessage(error, '上传失败');
    const details = isAxiosError(error) ? formatServerPayload(error.response?.data) : null;
    const nextState: UploadState = { type: 'error', message };
    if (details) {
      nextState.details = details;
      console.error('HeyTea upload failed:', details);
    }
    uploadState.value = nextState;
    ElMessage.error(message);
  } finally {
    isUploading.value = false;
  }
}

function handleDownload() {
  if (!processedBlob.value) return;
  const link = document.createElement('a');
  const url = URL.createObjectURL(processedBlob.value);
  link.href = url;
  link.download = buildFilename(downloadName.value, processedBlob.value);
  link.click();
  URL.revokeObjectURL(url);
}

watch([grayscale, fitMode, forcePng], () => {
  if (workingImage.value) {
    renderPreview();
  }
});

watch(rememberMe, (next) => {
  if (!next) {
    localStorage.removeItem(STORAGE_KEY);
  } else if (authToken.value) {
    localStorage.setItem(STORAGE_KEY, authToken.value);
  }
});

if (authToken.value) {
  manualToken.value = authToken.value;
  resolveUserProfile();
}

onUnmounted(() => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
});

function buildFilename(base: string, blob?: Blob | null) {
  const cleanBase = base ? base.replace(/\.[^.]+$/, '') : 'cup';
  const ext = blob?.type === 'image/jpeg' ? '.jpg' : '.png';
  return `${cleanBase}${ext}`;
}

async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const subtle = await getSubtleCrypto();
  const digest = await subtle.digest('SHA-1', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let cachedSubtle: SubtleCrypto | null = null;
async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (cachedSubtle) {
    return cachedSubtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    cachedSubtle = globalThis.crypto.subtle;
    return cachedSubtle;
  }
  const nodeCrypto = await import('crypto');
  cachedSubtle = nodeCrypto.webcrypto.subtle;
  return cachedSubtle;
}
</script>

