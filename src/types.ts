export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export type AssetKind = 'character' | 'worldbook' | 'preset'
export type AssetFormat = 'character-v1' | 'character-v2' | 'character-v3' | 'worldbook' | 'chat-completion-preset' | 'context-preset' | 'instruct-preset' | 'textgen-preset' | 'unknown-preset'

export interface BinaryFileReference {
  /** Slash-normalized path relative to the ProjectStore root. */
  file: string
  bytes: number
  sha256: string
}

export interface AttachedResource {
  id: string
  /** CHARX archive path or PNG chara-ext-asset_ path, always slash-normalized. */
  path: string
  container: 'charx' | 'png'
  mimeType?: string
  /** Runtime/import compatibility field. ProjectStore externalizes it before writing project JSON. */
  dataBase64?: string
  binary?: BinaryFileReference
}

export interface InlineBinaryReference {
  token: string
  mimeType?: string
  binary: BinaryFileReference
}

export interface TavernAsset {
  id: string
  kind: AssetKind
  format: AssetFormat
  name: string
  data: JsonObject
  source?: {
    filename: string
    mimeType?: string
    pngBase64?: string
    pngFile?: BinaryFileReference
    container?: 'json' | 'png' | 'charx'
  }
  /** Opaque embedded bytes. They are preserved even when this editor does not understand them. */
  resources?: AttachedResource[]
  /** Binary data: URIs externalized by ProjectStore; tokens are restored on load/export. */
  inlineBinaries?: InlineBinaryReference[]
  createdAt: string
  updatedAt: string
}

export interface TavernProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  assets: TavernAsset[]
}

export interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  assetCount: number
  counts: Record<AssetKind, number>
}

export interface ExportedFile {
  filename: string
  mimeType: string
  bytes: Uint8Array
}
