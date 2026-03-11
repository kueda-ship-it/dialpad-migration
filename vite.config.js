import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Windows/Unix パス正規化ヘルパー
const norm = (p) => p.replace(/\\/g, '/')
const root = norm(path.resolve('.'))

// Tailwind v4 は compiler.root===null の場合 **/* をスキャンし
// addWatchFile で全プロジェクトファイルをウォッチする。
// OneDrive 環境では .claude/ や *.md が頻繁に更新され無限リロードが発生する。
// ─── 対策 ①: server.watcher.add をインターセプトして外部ファイルを追加させない
// ─── 対策 ②: hotUpdate で外部ファイル変更を検知 → ws.send full-reload を DROP

const BLOCK_PREFIXES = [
  root + '/.claude/',
  root + '/.git/',
  root + '/node_modules/',
  root + '/.gemini/',
]
const BLOCK_EXT_RE = /\.(md|log|tmp|json)$/i

function isBlockedPath(p) {
  const np = norm(path.resolve(p)) // Ensure absolute path for comparison
  const blocked = (
    BLOCK_PREFIXES.some((b) => np.startsWith(b)) ||
    BLOCK_EXT_RE.test(np)
  )
  return blocked
}

let externalChangePending = false

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'tailwind-reload-guard',
      enforce: 'pre',

      configureServer(server) {
        const _add = server.watcher.add.bind(server.watcher)
        server.watcher.add = (paths) => {
          if (typeof paths === 'string') {
            if (isBlockedPath(paths)) return server.watcher
            return _add(paths)
          }
          if (Array.isArray(paths)) {
            const ok = paths.filter((p) => !isBlockedPath(p))
            return ok.length ? _add(ok) : server.watcher
          }
          return _add(paths)
        }

        const _send = server.ws.send.bind(server.ws)
        server.ws.send = (payload) => {
          if (payload?.type === 'full-reload') {
            if (externalChangePending) {
              console.log(`--- RELOAD DROP: ignoring change at ${new Date().toLocaleTimeString()} ---`)
              externalChangePending = false
              return
            }
            console.log(`--- RELOAD SEND: normal reload at ${new Date().toLocaleTimeString()} ---`)
          }
          return _send(payload)
        }
      },

      hotUpdate({ file }) {
        if (isBlockedPath(file)) {
          console.log(`--- BLOCKED PATH CHANGE: ${file} ---`)
          externalChangePending = true
          setTimeout(() => { externalChangePending = false }, 1000)
        }
      },
    },
  ],
  server: {
    port: 5176,
    host: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 1000, // Wait 1s between polls to avoid OneDrive race conditions
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.claude/**',
        '**/.gemini/**',
        '**/memory.md',
        '**/*.md',
        '**/nul',
        '**/local.db*',
        '**/dist/**',
      ],
    },
  },
})
