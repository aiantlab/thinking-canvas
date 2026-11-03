import type { AspectRatio, StylePreset, ViewAngle } from './types'

const STYLE_PALETTE: Record<StylePreset, [string, string, string]> = {
  modern: ['#1a2332', '#3d5a80', '#98c1d9'],
  'neo-chinese': ['#2c1810', '#8b4513', '#d4a574'],
  minimal: ['#f5f5f0', '#d0d0c8', '#8a8a82'],
  luxury: ['#1a1410', '#c9a46c', '#4a3728'],
  brutalist: ['#2a2a2a', '#6b6b6b', '#c4c4c4'],
  scandi: ['#e8efe8', '#a8c5a8', '#5a7a5a'],
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function aspectSize(aspect: AspectRatio): { w: number; h: number } {
  switch (aspect) {
    case '16:9':
      return { w: 960, h: 540 }
    case '4:3':
      return { w: 800, h: 600 }
    case '1:1':
      return { w: 720, h: 720 }
    case '9:16':
      return { w: 540, h: 960 }
  }
}

function buildingPaths(view: ViewAngle, seed: number): string {
  const r = (n: number) => ((seed * (n + 3) * 9301 + 49297) % 233280) / 233280
  if (view === 'bird') {
    return `
      <rect x="120" y="160" width="280" height="180" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
      <rect x="420" y="200" width="160" height="120" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <rect x="200" y="120" width="80" height="60" fill="rgba(255,255,255,0.18)"/>
      <path d="M80 380 Q480 ${320 + r(1) * 40} 880 360" fill="none" stroke="rgba(110,231,183,0.5)" stroke-width="3"/>
    `
  }
  if (view === 'elevation') {
    const bars = Array.from({ length: 8 }, (_, i) => {
      const x = 80 + i * 100
      const h = 180 + r(i) * 220
      return `<rect x="${x}" y="${480 - h}" width="70" height="${h}" fill="rgba(255,255,255,${0.08 + r(i + 2) * 0.15})" stroke="rgba(255,255,255,0.25)"/>`
    }).join('')
    return bars
  }
  // eye level
  const towers = Array.from({ length: 5 }, (_, i) => {
    const x = 60 + i * 170 + r(i) * 30
    const w = 90 + r(i + 1) * 50
    const h = 200 + r(i + 2) * 200
    const y = 480 - h
    const windows = Array.from({ length: Math.floor(h / 28) }, (_, row) => {
      return Array.from({ length: 3 }, (_, col) => {
        const wx = x + 12 + col * ((w - 24) / 3)
        const wy = y + 16 + row * 28
        return `<rect x="${wx}" y="${wy}" width="14" height="10" fill="rgba(201,164,108,${0.25 + r(row + col) * 0.45})"/>`
      }).join('')
    }).join('')
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.28)"/>${windows}`
  }).join('')
  return `
    <path d="M0 480 L960 480 L960 540 L0 540 Z" fill="rgba(0,0,0,0.35)"/>
    ${towers}
  `
}

/** Build a data-URL SVG that looks like an architectural concept render. */
export function buildPlaceholderImage(opts: {
  seed: number
  style: StylePreset
  view: ViewAngle
  aspect: AspectRatio
  title: string
}): string {
  const { w, h } = aspectSize(opts.aspect)
  const [c1, c2, c3] = STYLE_PALETTE[opts.style]
  const title = escapeXml(opts.title.slice(0, 48) || '效果图')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="70%" cy="20%" r="50%">
      <stop offset="0%" stop-color="rgba(255,220,160,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,220,160,0)"/>
    </radialGradient>
  </defs>
  <rect width="960" height="540" fill="url(#sky)"/>
  <rect width="960" height="540" fill="url(#glow)"/>
  ${buildingPaths(opts.view, opts.seed)}
  <rect x="24" y="24" width="280" height="64" rx="10" fill="rgba(0,0,0,0.45)"/>
  <text x="40" y="50" fill="#e8edf5" font-family="system-ui,sans-serif" font-size="14" font-weight="600">思维无限画布 · Mock</text>
  <text x="40" y="72" fill="#c9a46c" font-family="system-ui,sans-serif" font-size="12">seed ${opts.seed} · ${escapeXml(opts.style)} · ${escapeXml(opts.view)}</text>
  <text x="40" y="500" fill="rgba(232,237,245,0.75)" font-family="system-ui,sans-serif" font-size="13">${title}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 900000) + 100000
}

export function mockDelayMs(): number {
  return 2000 + Math.floor(Math.random() * 2000)
}
