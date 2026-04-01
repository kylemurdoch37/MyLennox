/**
 * NFC Service — Capacitor native NFC integration via @capgo/capacitor-nfc
 *
 * Requires:
 *   npm install @capgo/capacitor-nfc
 *   npx cap sync
 *
 * Android permissions are injected automatically by `npx cap sync`:
 *   <uses-permission android:name="android.permission.NFC" />
 *   <uses-feature android:name="android.hardware.nfc" android:required="false" />
 */

import { CapacitorNfc, NdefRecord, NfcTag } from '@capgo/capacitor-nfc';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface NFCReadResult {
  lennoxPassId: string;
}

export const NFCService = {
  /** True when running as a native Capacitor app (Android / iOS). */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Returns true if the device has NFC hardware.
   * Uses getStatus() which is the single authoritative status call.
   */
  async isSupported(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { supported } = await CapacitorNfc.isSupported();
      return supported;
    } catch {
      return false;
    }
  },

  /**
   * Returns true if NFC is present AND currently enabled by the user.
   * NfcStatus values:
   *   'NFC_OK'             → supported + enabled
   *   'NO_NFC'             → no hardware
   *   'NFC_DISABLED'       → hardware present but turned off
   *   'NDEF_PUSH_DISABLED' → enabled but Android Beam off (still readable)
   */
  async isEnabled(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { status } = await CapacitorNfc.getStatus();
      return status === 'NFC_OK' || status === 'NDEF_PUSH_DISABLED';
    } catch {
      return false;
    }
  },

  /** Opens the system NFC settings page. */
  async openSettings(): Promise<void> {
    try {
      await CapacitorNfc.showSettings();
    } catch {
      // Not available on all platforms/versions — ignore silently
    }
  },

  /**
   * Starts an NFC scan session.
   * Calls onTag when a Lennoxpass is detected, onError on failure.
   * Returns a cleanup function that stops scanning and removes listeners.
   */
  async startScanning(
    onTag: (result: NFCReadResult) => void,
    onError: (error: string) => void,
  ): Promise<() => Promise<void>> {
    if (!Capacitor.isNativePlatform()) {
      onError('NFC is only available in the Android/iOS app.');
      return async () => {};
    }

    let listenerHandle: PluginListenerHandle | null = null;

    try {
      // Listen for any NFC event (covers both NDEF and raw tags)
      listenerHandle = await CapacitorNfc.addListener('nfcEvent', (event) => {
        try {
          const lennoxPassId = extractLennoxPassId(event.tag);
          onTag({ lennoxPassId });
        } catch {
          onError('Could not read NFC tag data. Please try again.');
        }
      });

      await CapacitorNfc.startScanning();
    } catch (err: unknown) {
      await listenerHandle?.remove();
      listenerHandle = null;
      const msg = err instanceof Error ? err.message : 'NFC scan failed';
      onError(msg);
      return async () => {};
    }

    return async () => {
      try {
        await CapacitorNfc.stopScanning();
      } catch {
        // Ignore stop errors (session may have already ended)
      }
      await listenerHandle?.remove();
    };
  },
};

// ---------------------------------------------------------------------------
// NDEF payload extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the Lennoxpass ID from an NFC tag.
 *
 * Priority:
 *   1. TNF_WELL_KNOWN / type 'T' (0x54) — NDEF Text record
 *   2. TNF_WELL_KNOWN / type 'U' (0x55) — NDEF URI record
 *   3. TNF_ABSOLUTE_URI (3)              — URI directly in payload
 *   4. TNF_MIME_MEDIA (2)                — MIME payload raw text
 *   5. Tag hardware UID (hex string)
 */
function extractLennoxPassId(tag: NfcTag): string {
  const records: NdefRecord[] = tag.ndefMessage ?? [];

  for (const record of records) {
    const { tnf, type, payload } = record;

    // TNF_WELL_KNOWN = 1
    if (tnf === 1 && type?.length) {
      // Text record: type byte is 0x54 ('T')
      if (type[0] === 0x54 && payload?.length) {
        const text = decodeNdefTextPayload(payload);
        if (text) return text.trim();
      }

      // URI record: type byte is 0x55 ('U')
      if (type[0] === 0x55 && payload?.length) {
        const uri = decodeNdefUriPayload(payload);
        const id = extractIdFromUri(uri);
        if (id) return id;
      }
    }

    // TNF_ABSOLUTE_URI = 3 — entire payload is the URI
    if (tnf === 3 && payload?.length) {
      const uri = bytesToUtf8(payload);
      const id = extractIdFromUri(uri);
      if (id) return id;
    }

    // TNF_MIME_MEDIA = 2 — try raw UTF-8 decode
    if (tnf === 2 && payload?.length) {
      const raw = bytesToUtf8(payload).replace(/[^\x20-\x7E]/g, '').trim();
      if (raw.length >= 6) return raw;
    }
  }

  // No NDEF data — fall back to hardware UID
  if (tag.id?.length) {
    return tag.id
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  throw new Error('No readable data found on NFC tag');
}

/**
 * Decodes an NDEF Text record payload.
 *
 * Format: [status] [lang bytes…] [text bytes…]
 *   status bits 0-5 = language length
 *   status bit 7    = 0 → UTF-8, 1 → UTF-16
 */
function decodeNdefTextPayload(payload: number[]): string {
  if (payload.length < 3) return '';
  const statusByte = payload[0];
  const langLen = statusByte & 0x3f;
  const isUtf16 = (statusByte & 0x80) !== 0;
  const textBytes = new Uint8Array(payload.slice(1 + langLen));
  try {
    return new TextDecoder(isUtf16 ? 'utf-16' : 'utf-8').decode(textBytes);
  } catch {
    return new TextDecoder('utf-8').decode(textBytes);
  }
}

/**
 * Decodes an NDEF URI record payload.
 *
 * Format: [prefix byte] [uri bytes…]
 * The prefix byte maps to a well-known URI prefix (see NFC Forum spec).
 */
function decodeNdefUriPayload(payload: number[]): string {
  const URI_PREFIXES = [
    '',
    'http://www.',
    'https://www.',
    'http://',
    'https://',
    'tel:',
    'mailto:',
    'ftp://anonymous:anonymous@',
    'ftp://ftp.',
    'ftps://',
    'sftp://',
    'smb://',
    'nfs://',
    'ftp://',
    'dav://',
    'news:',
    'telnet://',
    'imap:',
    'rtsp://',
    'urn:',
    'pop:',
    'sip:',
    'sips:',
    'tftp:',
    'btspp://',
    'btl2cap://',
    'btgoep://',
    'tcpobex://',
    'irdaobex://',
    'file://',
    'urn:epc:id:',
    'urn:epc:tag:',
    'urn:epc:pat:',
    'urn:epc:raw:',
    'urn:epc:',
    'urn:nfc:',
  ];
  if (payload.length < 2) return '';
  const prefix = URI_PREFIXES[payload[0]] ?? '';
  return prefix + bytesToUtf8(payload.slice(1));
}

/**
 * Tries to extract a Lennoxpass ID from a URI string.
 * Supports:
 *   lennoxpass://LP-123-456  →  LP-123-456
 *   https://…/lennoxpass/ID  →  ID
 *   Any URI whose last path segment looks like an ID (≥6 chars, alphanumeric/-_)
 */
function extractIdFromUri(uri: string): string | null {
  // Explicit lennoxpass: scheme
  const schemeMatch = uri.match(/lennoxpass[:/]+([A-Z0-9\-_]+)/i);
  if (schemeMatch) return schemeMatch[1].toUpperCase();

  // Path component named "lennoxpass"
  const pathMatch = uri.match(/\/lennoxpass\/([A-Z0-9\-_]+)/i);
  if (pathMatch) return pathMatch[1].toUpperCase();

  // Last path segment if it looks like an ID
  const lastSegment = uri.replace(/\?.*$/, '').replace(/\/$/, '').split('/').pop() ?? '';
  if (lastSegment.length >= 6 && /^[A-Z0-9\-_]+$/i.test(lastSegment)) {
    return lastSegment.toUpperCase();
  }

  return null;
}

function bytesToUtf8(bytes: number[] | Uint8Array): string {
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}
