import { computed, onUnmounted, ref, watch } from "vue";

import { isAxiosError } from "axios";
import { createLatestTask } from "../utils/latest-task";
import CryptoJS from "crypto-js";

import { CAPTCHA_APP_ID, MAX_UPLOAD_BYTES } from "@/config/heytea";
import { requestCaptcha } from "@/utils/captcha";
import {
  readFileAsImage,
  renderToCupCanvas,
  type DotPattern,
  type ToneMode,
} from "@/utils/image";
import {
  fetchUserInfo,
  loginWithSms,
  sendSmsCode,
  uploadCupSticker,
  type HeyTeaUser,
} from "@/services/heytea";

export function useWorkbench() {
  const GITHUB_URL = "https://github.com/SuInk/HeyTea-DIY-Toolkit";
  const DONATE_QR_URL = `${import.meta.env.BASE_URL}donate.jpg`;

  const DOT_PATTERN_CHOICES: Array<{
    value: DotPattern;
    label: string;
    hint: string;
  }> = [
    {
      value: "circle",
      label: "圆形点阵",
      hint: "以圆形为中心向外扩散，最贴近传统印刷圆点。",
    },
    {
      value: "diamond",
      label: "菱形点阵",
      hint: "以菱形方向铺开，适合斜向纹理。",
    },
    {
      value: "cross",
      label: "十字形点阵",
      hint: "优先沿十字方向填充，线条感更强。",
    },
    {
      value: "grid",
      label: "方格点阵",
      hint: "按像素顺序逐行堆叠，方块颗粒规则整齐。",
    },
  ];

  type ToastType = "success" | "error" | "warning" | "info";

  const notice = ref<{ type: ToastType; message: string } | null>(null);
  function showToast(type: ToastType, message: string) {
    notice.value = { type, message };
  }

  const showSuccessMessage = (message: string) => showToast("success", message);
  const showErrorMessage = (message: string) => showToast("error", message);
  const showWarningMessage = (message: string) => showToast("warning", message);
  const showInfoMessage = (message: string) => showToast("info", message);

  type UploadState = {
    type: "success" | "warning" | "error";
    message: string;
    details?: string;
  };

  function extractServerMessage(payload: unknown): string | null {
    if (!payload) {
      return null;
    }
    if (typeof payload === "string") {
      return payload;
    }
    if (typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      for (const key of ["message", "msg", "error"]) {
        const value = record[key];
        if (typeof value === "string") {
          return value;
        }
      }
    }
    return null;
  }

  function getErrorMessage(error: unknown, fallback: string) {
    if (isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK")
        return "请求结果尚未确认，请勿重复提交；收到验证码可继续登录，上传请先在喜茶中查看结果。";
      const serverMessage = extractServerMessage(error.response?.data);
      if (serverMessage) {
        return serverMessage;
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return fallback;
  }

  function formatServerPayload(payload: unknown): string | null {
    if (payload === null || payload === undefined) {
      return null;
    }
    if (typeof payload === "string") {
      return payload;
    }
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }

  const activeTab = ref<"sms" | "token">("sms");
  const phone = ref("");
  const smsCode = ref("");
  const manualToken = ref("");
  const authToken = ref<string | null>(null);
  const user = ref<HeyTeaUser | null>(null);

  const isSendingCode = ref(false);
  const isLoggingIn = ref(false);
  const countdown = ref(0);
  let countdownTimer: number | null = null;

  const fileInputRef = ref<HTMLInputElement>();
  const canvasRef = ref<HTMLCanvasElement>();

  const workingImage = ref<HTMLImageElement | null>(null);
  const processedBlob = ref<Blob | null>(null);
  const toneMode = ref<ToneMode>("binary");
  const dotPattern = ref<DotPattern>("circle");
  const isDraggingFile = ref(false);
  const binaryThreshold = ref(170);
  const sampleDensity = ref(6);
  const dotThreshold = ref(170);
  const fitMode = ref<"cover" | "contain">("cover");
  const forcePng = ref(true);
  const isRendering = ref(false);
  const downloadName = ref("target.png");
  const selectedFileLabel = computed(() =>
    processedBlob.value
      ? buildFilename(downloadName.value, processedBlob.value)
      : downloadName.value || "未选择文件",
  );
  const uploadState = ref<UploadState | null>(null);
  const isUploading = ref(false);
  const compressionHint = ref("");
  const lastUploadHash = ref<string | null>(null);

  const hasPreview = computed(() => Boolean(processedBlob.value));
  const processedSizeLabel = computed(() =>
    processedBlob.value
      ? `${(processedBlob.value.size / 1024).toFixed(1)} KB`
      : "--",
  );
  const processedFormatLabel = computed(() =>
    processedBlob.value
      ? processedBlob.value.type === "image/jpeg"
        ? "JPG"
        : "PNG"
      : "--",
  );
  const activePatternHint = computed(
    () =>
      DOT_PATTERN_CHOICES.find((choice) => choice.value === dotPattern.value)
        ?.hint ?? "选择点阵形状来调整灰阶纹理。",
  );
  const exceedsLimit = computed(
    () => (processedBlob.value?.size ?? 0) > MAX_UPLOAD_BYTES,
  );
  const MAX_SIZE_KB = Math.round(MAX_UPLOAD_BYTES / 1024);
  const uploadDisabledReason = computed(() => {
    if (!processedBlob.value) return "先选择一张图片";
    if (!authToken.value || !user.value) return "登录后可上传";
    if (exceedsLimit.value) {
      return `处理后的图片超过 ${MAX_SIZE_KB} KB`;
    }
    return null;
  });
  const canUpload = computed(
    () =>
      !uploadDisabledReason.value && !isUploading.value && !isRendering.value,
  );

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

  async function handleSendCode() {
    if (isSendingCode.value || countdown.value > 0) return;
    if (!/^1[3-9]\d{9}$/.test(phone.value)) {
      showErrorMessage("请输入有效的 11 位手机号");
      return;
    }
    isSendingCode.value = true;
    // One click owns the entire challenge flow. Never recursively retry SMS.
    const requestedPhone = phone.value;
    try {
      let result = await sendSmsCode(requestedPhone);
      if (result.requiresCaptcha) {
        const captcha = await requestCaptcha(CAPTCHA_APP_ID);
        result = await sendSmsCode(requestedPhone, {
          ticket: captcha.ticket,
          randstr: captcha.randstr,
        });
        if (result.requiresCaptcha)
          throw new Error("人机验证未通过，请重新操作");
      }
      if (result.requiresCaptcha !== false)
        throw new Error(
          "发送状态未确认；若已收到验证码，可直接登录，请勿连续重发",
        );
      startCountdown();
      showSuccessMessage("验证码已发送");
    } catch (error) {
      showErrorMessage(
        getErrorMessage(error, "发送状态未确认；若已收到验证码，可直接登录"),
      );
    } finally {
      isSendingCode.value = false;
    }
  }

  async function bindToken(token: string) {
    authToken.value = token;
    manualToken.value = token;
    try {
      await resolveUserProfile();
    } catch (error) {
      clearAuth(false);
      throw error;
    }
  }

  async function handleSmsLogin() {
    if (isUploading.value || isLoggingIn.value) return;
    if (!/^1\d{10}$/.test(phone.value)) {
      showErrorMessage("请输入正确的手机号");
      return;
    }
    if (!/^\d{4,6}$/.test(smsCode.value)) {
      showErrorMessage("请输入收到的验证码");
      return;
    }

    isLoggingIn.value = true;
    try {
      const token = await loginWithSms(phone.value, smsCode.value);
      await bindToken(token);
      showSuccessMessage("登录成功");
    } catch (error) {
      const message = getErrorMessage(error, "登录失败");
      showErrorMessage(`${message}（请确认手机号已注册喜茶账号）`);
    } finally {
      isLoggingIn.value = false;
    }
  }

  async function handleTokenLogin() {
    if (isUploading.value || isLoggingIn.value) return;
    const token = manualToken.value.trim();
    if (!token) {
      showErrorMessage("请输入有效的 Token");
      return;
    }
    isLoggingIn.value = true;
    try {
      await bindToken(token);
      showSuccessMessage("Token 登录成功");
    } catch (error) {
      manualToken.value = token;
      const message = getErrorMessage(error, "Token 登录失败");
      showErrorMessage(message);
    } finally {
      isLoggingIn.value = false;
    }
  }

  async function resolveUserProfile() {
    if (!authToken.value) {
      throw new Error("Token 不存在");
    }
    const info = await fetchUserInfo(authToken.value);
    user.value = info;
    return info;
  }

  function clearAuth(showToast = true) {
    if (isUploading.value) return;
    authToken.value = null;
    manualToken.value = "";
    user.value = null;
    uploadState.value = null;
    lastUploadHash.value = null;
    if (showToast) {
      showSuccessMessage("已退出登录");
    }
  }

  async function onFileInput(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;
    await handleFile(files[0]);
    (event.target as HTMLInputElement).value = "";
  }

  async function handleFile(file: File) {
    if (isUploading.value) return;
    const imageId = imageTasks.begin();
    renderTasks.invalidate();
    isRendering.value = false;
    processedBlob.value = null;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("请选择小于 20MB 的图片");
      const image = await readFileAsImage(file);
      if (!imageId.isCurrent()) return;
      if (image.naturalWidth * image.naturalHeight > 40000000)
        throw new Error("图片像素过大，请先缩小到 4000 万像素以内");
      workingImage.value = image;
      downloadName.value = file.name.replace(/\.[^.]+$/, "") + ".png";
      await renderPreview();
    } catch (error) {
      if (!imageId.isCurrent()) return;
      const message = getErrorMessage(error, "图片处理失败");
      showErrorMessage(message);
    }
  }

  function hasFilePayload(event: DragEvent) {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files");
  }

  function handleDragEnter(event: DragEvent) {
    if (hasFilePayload(event)) {
      isDraggingFile.value = true;
    }
  }

  function handleDragOver(event: DragEvent) {
    if (!hasFilePayload(event)) {
      return;
    }
    event.dataTransfer!.dropEffect = "copy";
    isDraggingFile.value = true;
  }

  function handleDragLeave(event: DragEvent) {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (!currentTarget || !related || !currentTarget.contains(related)) {
      isDraggingFile.value = false;
    }
  }

  async function handleDrop(event: DragEvent) {
    if (!hasFilePayload(event)) {
      isDraggingFile.value = false;
      return;
    }
    isDraggingFile.value = false;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      await handleFile(files[0]);
    }
  }

  const renderTasks = createLatestTask();
  const imageTasks = createLatestTask();
  async function renderPreview() {
    if (!canvasRef.value || !workingImage.value) {
      return;
    }
    const generation = renderTasks.begin();
    const target = document.createElement("canvas");
    isRendering.value = true;
    try {
      const blob = await renderToCupCanvas(target, workingImage.value, {
        toneMode: toneMode.value,
        threshold:
          toneMode.value === "binary"
            ? binaryThreshold.value
            : toneMode.value === "sampled"
              ? dotThreshold.value
              : undefined,
        sampleDensity: sampleDensity.value,
        dotPattern: dotPattern.value,
        fit: fitMode.value,
        targetFormat: forcePng.value ? "png" : "auto",
        maxBytes: MAX_UPLOAD_BYTES,
      });
      if (!generation.isCurrent()) return;
      const visible = canvasRef.value;
      if (!visible) return;
      visible.width = target.width;
      visible.height = target.height;
      visible.getContext("2d")?.drawImage(target, 0, 0);
      processedBlob.value = blob;
      if (forcePng.value && blob.type !== "image/png") {
        compressionHint.value = `PNG 超出 ${MAX_SIZE_KB}KB，已自动压缩为 JPG。`;
        showWarningMessage(compressionHint.value);
      } else {
        compressionHint.value = "";
      }
      uploadState.value = null;
    } catch (error) {
      if (!generation.isCurrent()) return;
      const message = getErrorMessage(error, "渲染失败");
      showErrorMessage(message);
    } finally {
      if (generation.isCurrent()) isRendering.value = false;
    }
  }

  const confirmOpen = ref(false);
  let confirmResolver: ((approved: boolean) => void) | null = null;
  function resolveConfirmation(approved: boolean) {
    confirmResolver?.(approved);
    confirmResolver = null;
    confirmOpen.value = false;
  }
  function askDuplicate() {
    confirmOpen.value = true;
    return new Promise<boolean>((resolve) => {
      confirmResolver = resolve;
    });
  }
  async function handleUpload() {
    if (isUploading.value || isRendering.value) return;
    if (!authToken.value || !user.value || !processedBlob.value) {
      showErrorMessage("请先登录并准备好图片");
      return;
    }
    const snapshot = {
      token: authToken.value,
      userMainId: user.value.user_main_id,
      blob: processedBlob.value,
      filename: buildFilename(downloadName.value, processedBlob.value),
    };
    isUploading.value = true;
    uploadState.value = null;
    try {
      const currentHash = await hashBlob(snapshot.blob);
      if (lastUploadHash.value && lastUploadHash.value === currentHash) {
        try {
          if (!(await askDuplicate())) throw new Error("cancel");
        } catch {
          showInfoMessage("已取消重复上传");
          isUploading.value = false;
          return;
        }
      }

      await uploadCupSticker(snapshot);
      if (authToken.value !== snapshot.token) return;
      uploadState.value = { type: "success", message: "上传成功 🎉" };
      lastUploadHash.value = currentHash;
      showSuccessMessage("杯贴上传成功");
    } catch (error) {
      const message = getErrorMessage(error, "上传失败");
      const details = isAxiosError(error)
        ? formatServerPayload(error.response?.data)
        : null;
      const nextState: UploadState = { type: "error", message };
      if (details) {
        nextState.details = details;
        console.error("HeyTea upload failed");
      }
      uploadState.value = nextState;
      showErrorMessage(message);
    } finally {
      isUploading.value = false;
    }
  }

  function handleDownload() {
    if (!processedBlob.value || isRendering.value) return;
    const link = document.createElement("a");
    const url = URL.createObjectURL(processedBlob.value);
    link.href = url;
    link.download = buildFilename(downloadName.value, processedBlob.value);
    link.click();
    URL.revokeObjectURL(url);
  }

  watch(
    [
      toneMode,
      binaryThreshold,
      dotThreshold,
      sampleDensity,
      dotPattern,
      fitMode,
      forcePng,
    ],
    () => {
      if (workingImage.value) {
        renderPreview();
      }
    },
  );

  if (authToken.value) {
    manualToken.value = authToken.value;
    resolveUserProfile().catch((error) => {
      const message = getErrorMessage(error, "获取用户信息失败");
      showErrorMessage(message);
      clearAuth(false);
    });
  }

  onUnmounted(() => {
    renderTasks.invalidate();
    imageTasks.invalidate();
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
    }
  });

  function buildFilename(base: string, blob?: Blob | null) {
    const cleanBase = base ? base.replace(/\.[^.]+$/, "") : "cup";
    const ext = blob?.type === "image/jpeg" ? ".jpg" : ".png";
    return `${cleanBase}${ext}`;
  }

  async function hashBlob(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const subtle = await getSubtleCrypto();
    if (subtle) {
      const digest = await subtle.digest("SHA-1", buffer);
      return arrayBufferToHex(digest);
    }
    return hashWithCryptoJS(buffer);
  }

  function hashWithCryptoJS(buffer: ArrayBuffer): string {
    const wordArray = arrayBufferToWordArray(buffer);
    return CryptoJS.SHA1(wordArray).toString(CryptoJS.enc.Hex);
  }

  function arrayBufferToWordArray(buffer: ArrayBuffer): CryptoJS.lib.WordArray {
    const bytes = new Uint8Array(buffer);
    const words: number[] = [];
    for (let i = 0; i < bytes.length; i += 1) {
      words[i >>> 2] = (words[i >>> 2] ?? 0) | (bytes[i] << (24 - (i & 3) * 8));
    }
    return CryptoJS.lib.WordArray.create(words, bytes.length);
  }

  function arrayBufferToHex(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  type PortableSubtle = Pick<SubtleCrypto, "digest">;

  let cachedSubtle: PortableSubtle | null = null;
  let subtleStatus: "unknown" | "available" | "unavailable" = "unknown";

  async function getSubtleCrypto(): Promise<PortableSubtle | null> {
    if (subtleStatus !== "unknown") {
      return cachedSubtle;
    }
    const globalCrypto =
      typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (globalCrypto?.subtle) {
      cachedSubtle = globalCrypto.subtle;
      subtleStatus = "available";
      return cachedSubtle;
    }
    if (import.meta.env.SSR) {
      try {
        const nodeCrypto = await import("node:crypto");
        if (nodeCrypto?.webcrypto?.subtle) {
          cachedSubtle = nodeCrypto.webcrypto.subtle;
          subtleStatus = "available";
          return cachedSubtle;
        }
      } catch (error) {
        console.warn("Failed to load Node crypto for SubtleCrypto:", error);
      }
    }
    subtleStatus = "unavailable";
    cachedSubtle = null;
    return null;
  }

  return {
    confirmOpen,
    resolveConfirmation,
    GITHUB_URL,
    DONATE_QR_URL,
    DOT_PATTERN_CHOICES,
    activeTab,
    phone,
    smsCode,
    manualToken,
    authToken,
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
    activePatternHint,
    exceedsLimit,
    MAX_SIZE_KB,
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
  };
}
