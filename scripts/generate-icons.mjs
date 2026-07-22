// Generates the PWA icons: the app's streak heatmap as an icon — a grid of
// rounded squares in the app's blues/green on the app's dark background.
// Dependency-free (node:zlib PNG encoding) so icon regeneration never needs
// native image tooling. Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const BG = hex('#0b1220')
const PALETTE = { 0: hex('#1f2937'), 1: hex('#1e3a8a'), 2: hex('#1d4ed8'), 3: hex('#3b82f6'), 4: hex('#22c55e') }
// The streak: strong weeks, one dip, finishing green — same story the app tells.
const GRID = [
  [1, 3, 3, 2, 3, 1, 0],
  [3, 3, 4, 3, 3, 2, 1],
  [2, 0, 1, 3, 4, 3, 2],
  [3, 4, 4, 4, 4, 4, 4],
]

function drawIcon(size, padRatio) {
  const rgba = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = BG[0]; rgba[i * 4 + 1] = BG[1]; rgba[i * 4 + 2] = BG[2]; rgba[i * 4 + 3] = 255
  }
  const pad = Math.round(size * padRatio)
  const cols = 7, rows = 4
  const inner = size - pad * 2
  const gap = Math.max(1, Math.round(inner * 0.035))
  const cellW = Math.floor((inner - gap * (cols - 1)) / cols)
  const cellH = Math.floor((inner - gap * (rows - 1)) / rows)
  const gridW = cellW * cols + gap * (cols - 1)
  const gridH = cellH * rows + gap * (rows - 1)
  const x0 = Math.floor((size - gridW) / 2)
  const y0 = Math.floor((size - gridH) / 2)
  const r = Math.max(1, Math.round(cellW * 0.22)) // corner radius

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const [cr, cg, cb] = PALETTE[GRID[gy][gx]]
      const cx0 = x0 + gx * (cellW + gap)
      const cy0 = y0 + gy * (cellH + gap)
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          // rounded-corner test
          const dx = x < r ? r - x : x >= cellW - r ? x - (cellW - r - 1) : 0
          const dy = y < r ? r - y : y >= cellH - r ? y - (cellH - r - 1) : 0
          if (dx * dx + dy * dy > r * r) continue
          const p = ((cy0 + y) * size + cx0 + x) * 4
          rgba[p] = cr; rgba[p + 1] = cg; rgba[p + 2] = cb; rgba[p + 3] = 255
        }
      }
    }
  }
  return encodePNG(size, size, rgba)
}

mkdirSync('public', { recursive: true })
writeFileSync('public/pwa-192.png', drawIcon(192, 0.14))
writeFileSync('public/pwa-512.png', drawIcon(512, 0.14))
// Maskable: extra safe-zone padding so launchers can crop to any shape.
writeFileSync('public/pwa-maskable-512.png', drawIcon(512, 0.26))
console.log('icons written: pwa-192.png, pwa-512.png, pwa-maskable-512.png')
