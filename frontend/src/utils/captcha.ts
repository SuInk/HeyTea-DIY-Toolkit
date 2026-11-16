const SCRIPT_ID = "tencent-captcha-sdk";
const SCRIPT_TIMEOUT_MS = 15_000;
const CHALLENGE_TIMEOUT_MS = 120_000;

declare global {
  interface Window {
    TencentCaptcha?: new (
      appId: string,
      callback: (res: TencentCaptchaResult) => void,
      options?: Record<string, unknown>,
    ) => { show: () => void; destroy?: () => void };
  }
}

export interface TencentCaptchaResult {
  ret: number;
  randstr: string;
  ticket: string;
  appid: string;
  bizState?: string;
  err_msg?: string;
}

let loading: Promise<void> | null = null;

/** Shared by concurrent callers. A failed/timed-out script is removed for retry. */
export function loadCaptchaScript(): Promise<void> {
  if (window.TencentCaptcha) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    // A leftover node without an SDK is not a reliable loading signal.
    document.getElementById(SCRIPT_ID)?.remove();
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://turing.captcha.qcloud.com/TJCaptcha.js";
    script.async = true;
    let settled = false;
    const timer = window.setTimeout(
      () => finish(new Error("验证码组件加载超时，请重试")),
      SCRIPT_TIMEOUT_MS,
    );
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else resolve();
    };
    script.onload = () =>
      finish(
        window.TencentCaptcha
          ? undefined
          : new Error("验证码组件不可用，请重试"),
      );
    script.onerror = () => finish(new Error("验证码组件加载失败，请重试"));
    try {
      document.body.appendChild(script);
    } catch {
      finish(new Error("验证码组件加载失败，请重试"));
    }
  }).finally(() => {
    loading = null;
  });
  return loading;
}

export async function requestCaptcha(
  appId: string,
): Promise<TencentCaptchaResult> {
  await loadCaptchaScript();
  const Constructor = window.TencentCaptcha;
  if (!Constructor) throw new Error("验证码组件不可用");
  return new Promise((resolve, reject) => {
    let instance: { show: () => void; destroy?: () => void } | undefined;
    let settled = false;
    const timer = window.setTimeout(
      () => finish(undefined, new Error("验证已超时，请重新操作")),
      CHALLENGE_TIMEOUT_MS,
    );
    const finish = (result?: TencentCaptchaResult, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      // A synchronous SDK callback may run before its constructor returns.
      queueMicrotask(() => {
        try {
          instance?.destroy?.();
        } catch {
          /* SDK cleanup only */
        }
      });
      if (error) reject(error);
      else resolve(result!);
    };
    try {
      instance = new Constructor(appId, (res) => {
        if (
          res.ret === 0 &&
          typeof res.ticket === "string" &&
          res.ticket &&
          typeof res.randstr === "string" &&
          res.randstr
        )
          finish(res);
        else finish(undefined, new Error(res.err_msg || "验证未完成或已取消"));
      });
      if (!settled) instance.show();
    } catch {
      finish(undefined, new Error("验证码组件启动失败，请重试"));
    }
  });
}
