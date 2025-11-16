import { CUP_HEIGHT, CUP_WIDTH, MAX_UPLOAD_BYTES } from '@/config/heytea';

export type ToneMode = 'binary' | 'sampled' | 'original';

export interface RenderOptions {
  toneMode: ToneMode;
  threshold?: number;
  sampleDensity?: number;
  fit: 'contain' | 'cover';
  maxBytes?: number;
  targetFormat?: 'png' | 'auto';
}

export async function readFileAsImage(file: File): Promise<HTMLImageElement> {
  const dataUrl = await fileToDataUrl(file);
  return loadImage(dataUrl);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('无法读取图片'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = src;
  });
}

export async function renderToCupCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: RenderOptions
): Promise<Blob> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas');
  }

  canvas.width = CUP_WIDTH;
  canvas.height = CUP_HEIGHT;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale =
    options.fit === 'cover'
      ? Math.max(CUP_WIDTH / image.width, CUP_HEIGHT / image.height)
      : Math.min(CUP_WIDTH / image.width, CUP_HEIGHT / image.height);

  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (CUP_WIDTH - drawWidth) / 2;
  const offsetY = (CUP_HEIGHT - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const toneMode = options.toneMode ?? 'binary';
  if (toneMode !== 'original') {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    switch (toneMode) {
      case 'binary':
        applyBinaryThreshold(imageData, options.threshold);
        break;
      case 'sampled':
        applySampledMonochrome(imageData, options.sampleDensity, options.threshold);
        break;
      default:
        applyBinaryThreshold(imageData, options.threshold);
        break;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  if (options.targetFormat === 'png') {
    const result = await exportPngWithQuantization(ctx, baseImageData, maxBytes);
    if (result) {
      return result;
    }
    throw new Error(`PNG 压缩后仍超过 ${Math.round(maxBytes / 1024)}KB`);
  }

  return exportWithCompression(canvas, maxBytes);
}

async function exportWithCompression(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  const attempts: Array<{ type: string; quality?: number }> = [
    { type: 'image/png' },
    { type: 'image/jpeg', quality: 0.95 },
    { type: 'image/jpeg', quality: 0.9 },
    { type: 'image/jpeg', quality: 0.85 },
    { type: 'image/jpeg', quality: 0.8 },
    { type: 'image/jpeg', quality: 0.75 },
    { type: 'image/jpeg', quality: 0.7 },
    { type: 'image/jpeg', quality: 0.65 },
    { type: 'image/jpeg', quality: 0.6 },
    { type: 'image/jpeg', quality: 0.55 },
    { type: 'image/jpeg', quality: 0.5 },
    { type: 'image/jpeg', quality: 0.45 },
    { type: 'image/jpeg', quality: 0.4 },
    { type: 'image/jpeg', quality: 0.35 },
    { type: 'image/jpeg', quality: 0.3 },
  ];

  let candidate: Blob | null = null;
  for (const attempt of attempts) {
    const blob = await canvasToBlob(canvas, attempt.type, attempt.quality);
    if (!blob) {
      continue;
    }
    candidate = blob;
    if (blob.size <= maxBytes) {
      return blob;
    }
  }

  if (!candidate) {
    throw new Error('无法导出图片');
  }

  return candidate;
}

async function exportPngWithQuantization(
  ctx: CanvasRenderingContext2D,
  baseImageData: ImageData,
  maxBytes: number
): Promise<Blob | null> {
  const steps = [0, 8, 16, 24, 32, 40, 48, 64, 80, 96, 112, 128, 160, 192];
  let fallback: Blob | null = null;

  for (const step of steps) {
    const working = new ImageData(
      new Uint8ClampedArray(baseImageData.data),
      baseImageData.width,
      baseImageData.height
    );

    if (step > 0) {
      quantizeColors(working.data, step);
    }

    ctx.putImageData(working, 0, 0);

    const blob = await canvasToBlob(ctx.canvas, 'image/png');
    if (!blob) {
      continue;
    }
    fallback = blob;
    if (blob.size <= maxBytes) {
      return blob;
    }
  }

  return fallback && fallback.size <= maxBytes ? fallback : null;
}

function quantizeColors(data: Uint8ClampedArray, step: number) {
  const divisor = step <= 0 ? 1 : step;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.round(data[i] / divisor) * divisor);
    data[i + 1] = Math.min(255, Math.round(data[i + 1] / divisor) * divisor);
    data[i + 2] = Math.min(255, Math.round(data[i + 2] / divisor) * divisor);
  }
}

function applySampledMonochrome(imageData: ImageData, density = 6, threshold = 170) {
  const blockSize = Math.max(2, Math.min(32, Math.round(density)));
  const limit = Math.max(0, Math.min(255, Math.round(threshold)));
  const bias = (limit - 170) / 255;
  const { data, width, height } = imageData;

  // Down-sample blocks but fill them with a deterministic dot pattern to approximate 0-255 brightness via black/white pixels.
  for (let y = 0; y < height; y += blockSize) {
    const blockHeight = Math.min(blockSize, height - y);
    for (let x = 0; x < width; x += blockSize) {
      const blockWidth = Math.min(blockSize, width - x);
      const pixelCount = blockWidth * blockHeight;
      if (!pixelCount) {
        continue;
      }

      let graySum = 0;
      for (let offsetY = 0; offsetY < blockHeight; offsetY += 1) {
        for (let offsetX = 0; offsetX < blockWidth; offsetX += 1) {
          const idx = ((y + offsetY) * width + (x + offsetX)) * 4;
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          graySum += gray;
        }
      }

      const grayValue = graySum / pixelCount;
      const normalized = clamp01(grayValue / 255 - bias);
      const whitePixels = Math.round(normalized * pixelCount);
      const pattern = getHalftonePattern(blockWidth, blockHeight);

      for (let order = 0; order < pixelCount; order += 1) {
        const localIndex = pattern[order];
        const localX = localIndex % blockWidth;
        const localY = Math.floor(localIndex / blockWidth);
        const idx = ((y + localY) * width + (x + localX)) * 4;
        const value = order < whitePixels ? 255 : 0;
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
      }
    }
  }
}

function clamp01(value: number) {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

const halftonePatternCache = new Map<string, Uint16Array>();

function getHalftonePattern(width: number, height: number): Uint16Array {
  const key = `${width}x${height}`;
  const cached = halftonePatternCache.get(key);
  if (cached) {
    return cached;
  }

  type Entry = { index: number; distance: number; angle: number };
  const entries: Entry[] = [];
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      entries.push({
        index: y * width + x,
        distance: dx * dx + dy * dy,
        angle: Math.atan2(dy, dx),
      });
    }
  }

  entries.sort((a, b) => {
    if (a.distance === b.distance) {
      return a.angle - b.angle;
    }
    return a.distance - b.distance;
  });

  const pattern = new Uint16Array(entries.length);
  entries.forEach((entry, idx) => {
    pattern[idx] = entry.index;
  });

  halftonePatternCache.set(key, pattern);
  return pattern;
}

function applyBinaryThreshold(imageData: ImageData, threshold = 170) {
  const limit = Math.max(0, Math.min(255, Math.round(threshold)));
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray >= limit ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      type,
      quality
    );
  });
}
