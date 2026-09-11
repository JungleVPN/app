import fs from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.WEB_PORT || 7080;

// Cache production assets at startup
const templateHtml = isProduction
  ? await fs.readFile(resolve(__dirname, 'dist/client/index.html'), 'utf-8')
  : '';

const serverModule = isProduction
  ? await import(resolve(__dirname, 'dist/server/entry-server.js'))
  : null;

const app = express();

let vite;
if (!isProduction) {
  const { createServer } = await import('vite');
  vite = await createServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);
} else {
  const compression = (await import('compression')).default;
  const sirv = (await import('sirv')).default;
  app.use(compression());
  app.use(sirv(resolve(__dirname, 'dist/client'), { extensions: [] }));
}

// Loads the SSR entry module: the built bundle in production, transformed
// source via Vite's SSR pipeline in dev. Same module either way, so /llms.txt,
// the .md mirrors and the HTML route all render through one implementation.
async function loadServerModule() {
  return isProduction ? serverModule : vite.ssrLoadModule('/src/entry-server.tsx');
}

function toRequest(req, pathname = req.originalUrl) {
  return new Request(`http://${req.headers.host}${pathname}`, {
    method: req.method,
    headers: new Headers(
      Object.entries(req.headers).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((val) => [k, val]) : typeof v === 'string' ? [[k, v]] : [],
      ),
    ),
  });
}

function sendMarkdown(res, { status, markdown, htmlPath }, hostname) {
  if (status >= 400) {
    res.status(status).end();
    return;
  }
  const htmlUrl = `https://${hostname}${htmlPath}`;
  res
    .status(200)
    .set({
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
      Link: `<${htmlUrl}>; rel="alternate"; type="text/html"`,
    })
    .send(markdown);
}

// This marketing site's public pages (landing, terms, privacy, affiliates) are
// short enough that a full concatenation adds little over the curated llms.txt —
// redirect rather than maintain a second generated file.
app.get('/llms-full.txt', (_req, res) => res.redirect(302, '/index.md'));

app.get('/llms.txt', async (req, res) => {
  try {
    const { llmsTxt } = await loadServerModule();
    res
      .status(200)
      .set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' })
      .send(llmsTxt(req.hostname));
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.error(e.stack);
    res.status(500).end();
  }
});

// .md mirror of a crawlable page (e.g. /terms.md, /index.md for the root).
app.use(async (req, res, next) => {
  if (!req.path.endsWith('.md')) {
    next();
    return;
  }
  try {
    const { renderMarkdown } = await loadServerModule();
    const result = await renderMarkdown(toRequest(req), req.hostname);
    sendMarkdown(res, result, req.hostname);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.error(e.stack);
    res.status(500).end();
  }
});

app.use(async (req, res, next) => {
  if (/\.[a-zA-Z0-9]+$/.test(req.path) && !req.path.endsWith('.html')) {
    res.status(404).end();
    return;
  }
  next();
});

app.use(async (req, res) => {
  try {
    const hostname = req.hostname;
    const { render, renderMarkdown, isCrawlablePath, markdownPathFor, negotiateRepresentation } =
      await loadServerModule();

    const crawlable = isCrawlablePath(req.path);
    const representation = crawlable ? negotiateRepresentation(req.headers.accept) : 'html';

    if (representation === 'none') {
      res.status(406).set({ Vary: 'Accept' }).end();
      return;
    }

    if (representation === 'markdown') {
      const mdRequest = toRequest(req, markdownPathFor(req.path));
      const result = await renderMarkdown(mdRequest, hostname);
      sendMarkdown(res, result, hostname);
      return;
    }

    let template;
    if (!isProduction) {
      template = await fs.readFile(resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
    } else {
      template = templateHtml;
    }

    const result = await render(toRequest(req), hostname);

    if (result instanceof Response) {
      const location = result.headers.get('Location');
      res.redirect(result.status, location ?? '/');
      return;
    }

    const { html, head, pointer, lang, dir, status } = result;

    if (status >= 400) {
      // No page was matched, so there is nothing to send a body for. Answering
      // with the real status is what lets webhook providers retry a misrouted
      // delivery instead of recording a phantom success.
      res.status(status).end();
      return;
    }

    const fullHtml = template
      .replace(/(<html[^>]*)\slang="[^"]*"/, `$1 lang="${lang}"`)
      .replace(/(<html[^>]*)\sdir="[^"]*"/, '$1')
      .replace(/<html([^>]*)>/, `<html$1 dir="${dir}">`)
      .replace('<!--app-head-->', head ?? '')
      .replace('<!--app-html-->', html)
      .replace('<!--app-pointer-->', pointer ?? '');

    const headers = { 'Content-Type': 'text/html' };
    if (crawlable) {
      headers.Vary = 'Accept';
      headers.Link = `<https://${hostname}${markdownPathFor(req.path)}>; rel="alternate"; type="text/markdown"`;
    }

    res.status(status).set(headers).send(fullHtml);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.error(e.stack);
    res.status(500).end(e.stack);
  }
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
