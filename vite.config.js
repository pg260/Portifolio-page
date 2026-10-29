import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Benchmarks do detect-gpu servidos pelo próprio site (o padrão buscaria no unpkg em tempo de execução).
const BENCH_DIR = 'node_modules/detect-gpu/dist/benchmarks'
const BENCH_FILE = /^[a-z0-9-]+\.json$/i

function gpuBenchmarks() {
  return {
    name: 'gpu-benchmarks',
    configureServer(server) {
      server.middlewares.use('/gpu-benchmarks', (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\//, '')
        if (!BENCH_FILE.test(name)) return next()
        try {
          res.setHeader('Content-Type', 'application/json')
          res.end(readFileSync(join(BENCH_DIR, name)))
        } catch {
          next()
        }
      })
    },
    generateBundle() {
      for (const name of readdirSync(BENCH_DIR)) {
        if (BENCH_FILE.test(name)) this.emitFile({ type: 'asset', fileName: `gpu-benchmarks/${name}`, source: readFileSync(join(BENCH_DIR, name)) })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gpuBenchmarks()],
})
