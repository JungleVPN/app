import fs from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.WEB_PORT || 7080

// Cache production assets at startup
const templateHtml = isProduction
  ? await fs.readFile(resolve(__dirname, 'dist/client/index.html'), 'utf-8')
  : ''

const renderFn = isProduction
  ? (await import(resolve(__dirname, 'dist/server/entry-server.js'))).render
  : null

const app = express()

let vite
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'custom',
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(sirv(resolve(__dirname, 'dist/client'), { extensions: [] }))
}

app.use(async (req, res) => {
  try {
    const hostname = req.hostname

    let template
    let render
    if (!isProduction) {
      template = await fs.readFile(resolve(__dirname, 'index.html'), 'utf-8')
      template = await vite.transformIndexHtml(req.originalUrl, template)
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
    } else {
      template = templateHtml
      render = renderFn
    }

    const request = new Request(`http://${req.headers.host}${req.originalUrl}`, {
      method: req.method,
      headers: new Headers(
        Object.entries(req.headers).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((val) => [k, val]) : typeof v === 'string' ? [[k, v]] : [],
        ),
      ),
    })

    const result = await render(request, hostname)

    if (result instanceof Response) {
      const location = result.headers.get('Location')
      res.redirect(result.status, location ?? '/')
      return
    }

    const { html, head, lang, dir } = result

    const fullHtml = template
      .replace(/(<html[^>]*)\slang="[^"]*"/, `$1 lang="${lang}"`)
      .replace(/(<html[^>]*)\sdir="[^"]*"/, '$1')
      .replace(/<html([^>]*)>/, `<html$1 dir="${dir}">`)
      .replace('<!--app-head-->', head ?? '')
      .replace('<!--app-html-->', html)

    res.status(200).set({ 'Content-Type': 'text/html' }).send(fullHtml)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.error(e.stack)
    res.status(500).end(e.stack)
  }
})

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})
