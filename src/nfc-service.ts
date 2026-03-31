/**
 * NFC Service - Capacitor native NFC integration
 *
 * Uses @capawesome-team/capacitor-nfc under the hood via the Capacitor plugin bridge.
 * Requires: npm install @capawesome-team/capacitor-nfc && npx cap sync
 *
 * Android requirements (handled automatically by npx cap sync):
 *   - <uses-permission android:name="android.permission.NFC" />
 *   - <uses-feature android:name="android.hardware.nfc" android:required="false" />
 */

import { registerPlugin, Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface NfcTag {
  id?: number[];
  message?: {
    records: Array<{
      id?: number[];
      payload?: number[];
      recordType: string;
      mediaType?: string;
      encoding?: string;
      lang?: string;
    }>;
  };
  techTypes?: string[];
}

interface NfcPlugin {
  isSupported(): Promise<{ isSupported: boolean }>;
  isEnabled(): Promise<{ isEnabled: boolean }>;
  openSettings(): Promise<void>;
  startScanSession(): Promise<void>;
  stopScanSession(): Promise<void>;
  addListener(
    eventName: 'nfcTagScanned',
    listenerFunc: (event: { nfcTag: NfcTag }) => void,
  ): Promise<PluginListenerHandle>;
}

const NfcNativePlugin = registerPlugin<NfcPlugin>('Nfc');

export interface NFCReadResult {
  lennoxPassId: string;
}

type NFCScanCleanup = () => Promise<void>;

export const NFCService = {
  /** Returns true if running on a native Android/iOS platform */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /** Checks whether the device hardware supports NFC */
  async isSupported(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { isSupported } = await NfcNativePlugin.isSupported();
      return isSupported;
    } catch {
      return false;
    }
  },

  /** Checks whether NFC is currently enabled in system settings */
  async isEnabled(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { isEnabled } = await NfcNativePlugin.isEnabled();
      return isEnabled;
    } catch {
      return false;
    }
  },

  /** Opens the device NFC settings page */
  async openSettings(): Promise<void> {
    try {
      await NfcNativePlugin.openSettings();
    } catch {
      // Not all platforms support opening settings
    }
  },

  /**
   * Starts an NFC scan session.
   * Returns a cleanup function to stop scanning and remove the listener.
   *
   * @param onTag   - Called with parsed tag data when a tag is scanned
   * @param onError - Called with an error message string on failure
   */
  async startScanning(
    onTag: (result: NFCReadResult) => void,
    onError: (error: string) => void,
  ): Promise<NFCScanCleanup> {
    if (!Capacitor.isNativePlatform()) {
      onError('NFC is not available in the browser. Please use the Android app.');
      return async () => {};
    }

    let listenerHandle: PluginListenerHandle | null = null;

    try {
      listenerHandle = await NfcNativePlugin.addListener('nfcTagScanned', (event) => {
        try {
          const lennoxPassId = extractLennoxPassId(event.nfcTag);
          onTag({ lennoxPassId });
        } catch {
          onError('Could not read NFC tag. Please try again.');
        }
      });

      await NfcNativePlugin.startScanSession();
    } catch (err: unknown) {
      await listenerHandle?.remove();
      const msg = err instanceof Error ? err.message : 'NFC scan failed';
      onError(msg);
      return async () => {};
    }

    return async () => {
      try {
        await NfcNativePlugin.stopScanSession();
      } catch {
        // Ignore stop errors
      }
      await listenerHandle?.remove();
    };
  },
};

/**
 * Extracts the Lennoxpass ID from an NFC tag.
 *
 * Priority order:
 *   1. Plain-text NDEF record
 *   2. URL/URI record (looks for lennoxpass: scheme or path component)
 *   3. Tag hardware UID (hex string)
 */
function extractLennoxPassId(tag: NfcTag): string {
  if (tag.message?.records?.length) {
    for (const record of tag.message.records) {
      // Text record (TNF_WELL_KNOWN, type 'T')
      if (record.recordType === 'text' && record.payload?.length) {
        const text = decodeNdefTextPayload(record.payload, record.encoding);
        if (text) return text.trim();
      }

      // URI / URL record
      if ((record.recordType === 'url' || record.recordType === 'uri') && record.payload?.length) {
        const uri = decodeNdefUriPayload(record.payload);
        // Support lennoxpass://ID or https://…/lennoxpass/ID
        const match = uri.match(/lennoxpass[:/]+([A-Z0-9\-]+)/i);
        if (match) return match[1];
        // Fallback: last path segment
        const segments = uri.replace(/\/$/, '').split('/');
        const last = segments[segments.length - 1];
        if (last && last.length >= 6) return last;
      }

      // MIME / external type - try raw text decode
      if (record.payload?.length) {
        try {
          const raw = new TextDecoder().decode(new Uint8Array(record.payload));
          const trimmed = raw.replace(/[^\x20-\x7E]/g, '').trim();
          if (trimmed.length >= 6) return trimmed;
        } catch {
          // ignore
        }
      }
    }
  }

  // Last resort: use the tag hardware UID as hex
  if (tag.id?.length) {
    return tag.id
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  throw new Error('No readable data on NFC tag');
}

/**
 * Decodes an NDEF Text record payload.
 * Format: [status byte][lang bytes][text bytes]
 * Status byte low 6 bits = lang length; bit 7 = UTF-16 flag
 */
function decodeNdefTextPayload(payload: number[], encoding?: string): string {
  if (payload.length < 3) return '';
  const statusByte = payload[0];
  const langLen = statusByte & 0x3f;
  const isUtf16 = (statusByte & 0x80) !== 0;
  const textBytes = new Uint8Array(payload.slice(1 + langLen));
  const charset = isUtf16 ? 'utf-16' : (encoding ?? 'utf-8');
  try {
    return new TextDecoder(charset).decode(textBytes);
  } catch {
    return new TextDecoder('utf-8').decode(textBytes);
  }
}

/**
 * Decodes an NDEF URI record payload.
 * Format: [prefix byte][uri bytes]
 */
function decodeNdefUriPayload(payload: number[]): string {
  const prefixes = [
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
  const prefix = prefixes[payload[0]] ?? '';
  const uriBytes = new Uint8Array(payload.slice(1));
  return prefix + new TextDecoder('utf-8').decode(uriBytes);
}
