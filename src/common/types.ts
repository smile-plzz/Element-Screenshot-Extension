export interface ExtensionSettings {
  saveToDisk: boolean;
  copyToClipboard: boolean;
  subfolder: string;
  filenameTemplate: string;
  padding: number;
  stayInPickMode: boolean;
  includeTimestamp: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  saveToDisk: true,
  copyToClipboard: true,
  subfolder: 'ElementShots',
  filenameTemplate: '{domain}_{tag}_{date}_{time}',
  padding: 0,
  stayInPickMode: false,
  includeTimestamp: true,
};

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ElementMeta {
  tagName: string;
  id?: string;
  className?: string;
  domain: string;
  pageTitle: string;
  pageUrl: string;
}

export interface CaptureRequestPayload {
  rect: CropRect;
  dpr: number;
  viewport: ViewportSize;
  meta: ElementMeta;
  isPartial: boolean;
}

export interface CaptureResponsePayload {
  success: boolean;
  saved: boolean;
  copied: boolean;
  filename?: string;
  isPartial?: boolean;
  error?: string;
}

export type ExtensionMessage =
  | { type: 'TOGGLE_PICK_MODE' }
  | { type: 'START_PICK' }
  | { type: 'STOP_PICK' }
  | { type: 'CAPTURE_REQUEST'; payload: CaptureRequestPayload }
  | { type: 'CAPTURE_RESPONSE'; payload: CaptureResponsePayload }
  | { type: 'WRITE_CLIPBOARD'; payload: { dataUrl: string } }
  | { type: 'CLIPBOARD_RESULT'; payload: { success: boolean; error?: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_RESPONSE'; payload: ExtensionSettings };
