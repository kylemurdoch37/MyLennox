/**
 * MRZ (Machine Readable Zone) scanning service.
 *
 * Pipeline:
 *   1. Capture photo with @capacitor/camera
 *   2. Preprocess the image (grayscale + threshold + crop to MRZ zone)
 *   3. OCR with Tesseract.js (char whitelist for MRZ font)
 *   4. Parse raw OCR output → clean MRZ lines
 *   5. Parse MRZ with the `mrz` package → structured data
 *
 * Requires packages already in package.json:
 *   @capacitor/camera, tesseract.js, mrz
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createWorker } from 'tesseract.js';
import { parse as parseMRZ } from 'mrz';

export interface MRZScanResult {
  lastName: string;
  firstName: string;
  documentNumber: string;
  nationality: string;
  /** YYYY-MM-DD */
  dob: string;
  sex: string;
  /** YYYY-MM-DD */
  expiryDate: string;
  /** Raw OCR text for debugging */
  rawText: string;
}

export class MRZScanError extends Error {
  constructor(
    message: string,
    public readonly stage: 'camera' | 'ocr' | 'parse',
  ) {
    super(message);
    this.name = 'MRZScanError';
  }
}

/**
 * Full MRZ scan pipeline.
 * @param onProgress Optional callback receiving 0–100 progress during OCR.
 */
export async function scanDocumentMRZ(
  onProgress?: (pct: number) => void,
): Promise<MRZScanResult> {
  // --- Step 1: Camera capture ---
  let dataUrl: string;
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 90,
      // No width/height constraints — let the device choose best resolution
    });
    if (!photo.dataUrl) throw new Error('No image data returned');
    dataUrl = photo.dataUrl;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Camera unavailable';
    throw new MRZScanError(msg, 'camera');
  }

  // --- Step 2: Preprocess for MRZ zone ---
  let processedDataUrl: string;
  try {
    processedDataUrl = await preprocessForMRZ(dataUrl, onProgress);
  } catch {
    // If canvas processing fails, fall back to the raw image
    processedDataUrl = dataUrl;
  }

  // --- Step 3: OCR ---
  let rawText: string;
  try {
    rawText = await runOCR(processedDataUrl, onProgress);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'OCR failed';
    throw new MRZScanError(msg, 'ocr');
  }

  // --- Step 4: Extract + parse MRZ lines ---
  try {
    return parseMRZFromOCRText(rawText, dataUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not detect MRZ in image';
    throw new MRZScanError(msg, 'parse');
  }
}

// ---------------------------------------------------------------------------
// Image preprocessing
// ---------------------------------------------------------------------------

/**
 * Crops to the bottom 30% of the document (MRZ zone), converts to
 * grayscale, and applies a hard threshold — all in an off-screen canvas.
 * Returns a data URL of the processed crop.
 */
function preprocessForMRZ(
  dataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Image load failed'));
    img.onload = () => {
      try {
        onProgress?.(5);

        // Scale up small images for better OCR accuracy
        const targetWidth = Math.max(img.width, 1600);
        const scale = targetWidth / img.width;
        const scaledW = Math.floor(img.width * scale);
        const scaledH = Math.floor(img.height * scale);

        // Full-size canvas
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = scaledW;
        fullCanvas.height = scaledH;
        const fullCtx = fullCanvas.getContext('2d')!;
        fullCtx.drawImage(img, 0, 0, scaledW, scaledH);

        onProgress?.(10);

        // MRZ occupies roughly the bottom 28% of most documents
        const mrzTop = Math.floor(scaledH * 0.72);
        const mrzH = scaledH - mrzTop;

        // Extract and process the MRZ strip
        const mrzCanvas = document.createElement('canvas');
        // Add 10% vertical padding so we don't clip partial lines
        const padV = Math.floor(mrzH * 0.1);
        mrzCanvas.width = scaledW;
        mrzCanvas.height = mrzH + padV * 2;
        const mrzCtx = mrzCanvas.getContext('2d')!;

        // White background
        mrzCtx.fillStyle = '#ffffff';
        mrzCtx.fillRect(0, 0, mrzCanvas.width, mrzCanvas.height);
        mrzCtx.drawImage(fullCanvas, 0, mrzTop - padV, scaledW, mrzH + padV * 2, 0, 0, scaledW, mrzH + padV * 2);

        onProgress?.(15);

        // Grayscale + Otsu-style binarisation
        const imageData = mrzCtx.getImageData(0, 0, mrzCanvas.width, mrzCanvas.height);
        const d = imageData.data;

        // First pass: compute mean gray for adaptive threshold
        let sum = 0;
        const pixCount = d.length / 4;
        for (let i = 0; i < d.length; i += 4) {
          sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        }
        const mean = sum / pixCount;
        // Use mean as threshold but clamp to 100–200 range for robustness
        const threshold = Math.min(200, Math.max(100, mean));

        // Second pass: binarise
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const bin = gray > threshold ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = bin;
          d[i + 3] = 255;
        }
        mrzCtx.putImageData(imageData, 0, 0);

        onProgress?.(20);
        resolve(mrzCanvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.src = dataUrl;
  });
}

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

/**
 * Runs Tesseract.js on the preprocessed image with MRZ-optimised settings.
 */
async function runOCR(
  dataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        // Map OCR progress (0–1) to 25–90%
        onProgress?.(25 + Math.floor(m.progress * 65));
      }
    },
  });

  try {
    await worker.setParameters({
      // MRZ character set: A-Z, 0-9, and filler '<'
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      // PSM 6 = single uniform block of text (best for MRZ strips)
      tessedit_pageseg_mode: '6' as any,
      // Disable spell checker — MRZ is not natural language
      tessedit_enable_doc_dict: '0' as any,
    });

    const { data } = await worker.recognize(dataUrl);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// MRZ line extraction and parsing
// ---------------------------------------------------------------------------

/** MRZ character set regex */
const MRZ_CHAR = /^[A-Z0-9<]+$/;

/**
 * Takes raw OCR text (which may contain spaces, newlines, garbage characters)
 * and extracts the 2 or 3 MRZ lines, then parses them with the `mrz` package.
 */
function parseMRZFromOCRText(rawText: string, _dataUrl: string): MRZScanResult {
  // Normalise: uppercase, replace common OCR misreads in MRZ context
  let text = rawText.toUpperCase();

  // Common OCR substitutions for MRZ
  text = text
    .replace(/0/g, '0')   // keep 0
    .replace(/O(?=[A-Z0-9<]{2,})/g, '0')  // O → 0 when surrounded by MRZ chars
    .replace(/\s+/g, '\n')  // collapse spaces to newlines so we can split lines
    .replace(/[^A-Z0-9<\n]/g, '');  // strip anything not in MRZ charset or newline

  // Split into candidate lines and keep only those that look like MRZ
  const candidates = text
    .split('\n')
    .map((l) => l.trim().replace(/\s/g, ''))
    .filter((l) => l.length >= 20 && MRZ_CHAR.test(l));

  if (candidates.length === 0) {
    throw new Error(
      'No MRZ lines detected. Make sure the bottom of the document is visible and well-lit.',
    );
  }

  // TD3 passports: 2 lines of 44 chars
  // TD1 ID cards: 3 lines of 30 chars
  // Try to find matching line lengths
  const td3Lines = candidates.filter((l) => l.length >= 40 && l.length <= 48);
  const td1Lines = candidates.filter((l) => l.length >= 27 && l.length <= 33);

  let mrzLines: string[];
  let format: 'TD3' | 'TD1' | 'auto';

  if (td3Lines.length >= 2) {
    mrzLines = td3Lines.slice(0, 2).map((l) => padOrTrim(l, 44));
    format = 'TD3';
  } else if (td1Lines.length >= 3) {
    mrzLines = td1Lines.slice(0, 3).map((l) => padOrTrim(l, 30));
    format = 'TD1';
  } else {
    // Best-effort: use longest lines and let the parser decide
    const sorted = [...candidates].sort((a, b) => b.length - a.length);
    mrzLines = sorted.slice(0, 2);
    format = 'auto';
  }

  let parsed: ReturnType<typeof parseMRZ>;
  try {
    parsed = parseMRZ(mrzLines);
  } catch (e) {
    // Try flipping the order (OCR sometimes returns lines reversed)
    try {
      parsed = parseMRZ([...mrzLines].reverse());
    } catch {
      throw new Error(
        `MRZ parse failed (format: ${format}). Raw lines: ${mrzLines.join(' | ')}`,
      );
    }
  }

  const f = parsed.fields;

  return {
    lastName: capitalize(f.lastName ?? ''),
    firstName: capitalize(f.firstName ?? ''),
    documentNumber: (f.documentNumber ?? '').replace(/</g, ''),
    nationality: f.nationality ?? f.issuingState ?? '',
    dob: mrzDateToISO(f.birthDate ?? ''),
    sex: f.sex ?? '',
    expiryDate: mrzDateToISO(f.expirationDate ?? ''),
    rawText,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Pad with '<' or trim to exact length */
function padOrTrim(s: string, len: number): string {
  if (s.length < len) return s.padEnd(len, '<');
  return s.slice(0, len);
}

/**
 * Converts MRZ date (YYMMDD) to ISO date (YYYY-MM-DD).
 * Assumes years 00–30 → 2000–2030, 31–99 → 1931–1999.
 */
function mrzDateToISO(mrzDate: string): string {
  if (!mrzDate || mrzDate.length < 6) return '';
  const yy = parseInt(mrzDate.slice(0, 2), 10);
  const mm = mrzDate.slice(2, 4);
  const dd = mrzDate.slice(4, 6);
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  return `${year}-${mm}-${dd}`;
}

/** Title-case a name (handles << separator for last names) */
function capitalize(name: string): string {
  return name
    .replace(/</g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
