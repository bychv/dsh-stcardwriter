import { deflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export interface PngChunk {
  type: string
  data: Buffer
}

let crcTable: Uint32Array | undefined

function table(): Uint32Array {
  if (crcTable) return crcTable
  crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c >>> 0
  }
  return crcTable
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  const values = table()
  for (const value of bytes) crc = values[(crc ^ value) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function encodeChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const body = Buffer.from(data)
  const result = Buffer.allocUnsafe(body.length + 12)
  result.writeUInt32BE(body.length, 0)
  typeBytes.copy(result, 4)
  body.copy(result, 8)
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, body])), body.length + 8)
  return result
}

export function parsePngChunks(input: Uint8Array): PngChunk[] {
  const bytes = Buffer.from(input)
  if (bytes.length < 20 || !bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error('不是有效的 PNG 文件')
  const chunks: PngChunk[] = []
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const end = offset + 12 + length
    if (end > bytes.length) throw new Error('PNG chunk 长度越界')
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    chunks.push({ type, data: Buffer.from(bytes.subarray(offset + 8, offset + 8 + length)) })
    offset = end
    if (type === 'IEND') break
  }
  if (chunks.at(-1)?.type !== 'IEND') throw new Error('PNG 缺少 IEND chunk')
  return chunks
}

export function decodeText(chunk: PngChunk): { keyword: string; value: string } | undefined {
  if (chunk.type !== 'tEXt') return undefined
  const zero = chunk.data.indexOf(0)
  if (zero < 1) return undefined
  return {
    keyword: chunk.data.toString('latin1', 0, zero),
    value: chunk.data.toString('latin1', zero + 1),
  }
}

export function readCharacterFromPng(input: Uint8Array): unknown {
  const texts = parsePngChunks(input).map(decodeText).filter((v): v is { keyword: string; value: string } => Boolean(v))
  const payload = texts.find(value => value.keyword === 'ccv3') ?? texts.find(value => value.keyword === 'chara')
  if (!payload) throw new Error('PNG 中没有 ccv3 或 chara 角色卡元数据')
  return JSON.parse(Buffer.from(payload.value, 'base64').toString('utf8'))
}

export function readExtendedAssetsFromPng(input: Uint8Array): { path: string; bytes: Buffer }[] {
  return parsePngChunks(input).map(decodeText)
    .filter((value): value is { keyword: string; value: string } => Boolean(value))
    .filter(value => value.keyword.startsWith('chara-ext-asset_:'))
    .map(value => ({
      path: value.keyword.slice('chara-ext-asset_:'.length).replaceAll('\\', '/').replace(/^\/+/, ''),
      bytes: Buffer.from(value.value, 'base64'),
    }))
}

export function makePlaceholderPng(width = 512, height = 768): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0
    for (let x = 0; x < width; x += 1) {
      const at = y * stride + 1 + x * 4
      raw[at] = 33
      raw[at + 1] = 28
      raw[at + 2] = 49
      raw[at + 3] = 255
    }
  }
  return Buffer.concat([
    SIGNATURE,
    encodeChunk('IHDR', ihdr),
    encodeChunk('IDAT', deflateSync(raw, { level: 9 })),
    encodeChunk('IEND', Buffer.alloc(0)),
  ])
}

export function writeCharacterToPng(
  input: Uint8Array | undefined,
  v2: unknown,
  v3: unknown,
  extendedAssets?: readonly { path: string; bytes: Uint8Array }[],
): Buffer {
  const chunks = parsePngChunks(input ?? makePlaceholderPng())
  const meta = new Map([
    ['chara', Buffer.from(JSON.stringify(v2), 'utf8').toString('base64')],
    ['ccv3', Buffer.from(JSON.stringify(v3), 'utf8').toString('base64')],
  ])
  const encodedMeta = [...meta].map(([keyword, value]) => encodeChunk('tEXt', Buffer.from(`${keyword}\0${value}`, 'latin1')))
  const encodedAssets = extendedAssets?.map(resource => encodeChunk('tEXt', Buffer.from(
    `chara-ext-asset_:${resource.path}\0${Buffer.from(resource.bytes).toString('base64')}`,
    'latin1',
  ))) ?? []
  const output: Buffer[] = [SIGNATURE]
  for (const chunk of chunks) {
    const text = decodeText(chunk)
    if (text && meta.has(text.keyword)) continue
    if (extendedAssets && text?.keyword.startsWith('chara-ext-asset_:')) continue
    if (chunk.type === 'IEND') output.push(...encodedMeta, ...encodedAssets)
    output.push(encodeChunk(chunk.type, chunk.data))
  }
  return Buffer.concat(output)
}
