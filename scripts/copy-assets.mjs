import { copyFile, mkdir } from 'node:fs/promises'

const outputDir = new URL('../dist/', import.meta.url)
await mkdir(outputDir, { recursive: true })
await copyFile(
  new URL('../src/soul.json', import.meta.url),
  new URL('soul.json', outputDir),
)
