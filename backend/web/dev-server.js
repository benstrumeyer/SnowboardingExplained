import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

async function createDevServer() {
  const server = await createServer({
    plugins: [react()],
    server: {
      middlewareMode: true,
    },
  })

  // Custom middleware to serve index.html for SPA routing
  server.middlewares.use((req, res, next) => {
    // If it's not a file request and not an API request, serve index.html
    if (!req.url.includes('.') && !req.url.startsWith('/api')) {
      req.url = '/index.html'
    }
    next()
  })

  const app = server.middlewares
  
  // Fallback for root path
  app.use((req, res, next) => {
    if (req.url === '/') {
      const indexPath = path.join(__dirname, 'index.html')
      res.end(fs.readFileSync(indexPath, 'utf-8'))
    } else {
      next()
    }
  })

  const httpServer = require('http').createServer(app)
  
  await new Promise((resolve) => {
    httpServer.listen(5173, '0.0.0.0', () => {
      console.log('Dev server listening on http://0.0.0.0:5173')
      resolve()
    })
  })

  return { server, httpServer }
}

createDevServer().catch(console.error)
