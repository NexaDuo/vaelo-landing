// http, www.vaelo.club and the trailing slash answer with permanent redirects to
// the canonical URL: search engines read the assets 307 as temporary.
// /fundadores is served with the real lot count already in the HTML (vaelo#203): without JavaScript the page used to
// say "restam 100 de 100" whatever the sales. fundadores.js still refreshes it in the browser and fills the names.

const BOARD_URL = 'https://ysbbyknhnusivprotutt.supabase.co/functions/v1/founder-board';
const BOARD_TIMEOUT_MS = 1500;

// The same checks as fundadores.js: anything else leaves the HTML as written.
export function lotState(board) {
  if (!board || !Number.isInteger(board.sold) || !Number.isInteger(board.total) || board.total < 1) return null;
  const sold = Math.max(0, Math.min(board.sold, board.total));
  return {
    sold,
    total: board.total,
    left: board.total - sold,
    percent: Math.round((sold / board.total) * 100),
    soldOut: sold >= board.total,
  };
}

async function fetchBoard() {
  try {
    const response = await fetch(BOARD_URL, {
      headers: { Accept: 'application/json', Origin: 'https://vaelo.club' },
      signal: AbortSignal.timeout(BOARD_TIMEOUT_MS),
      // The function already caches 60 s; the edge keeps it as long, so a page view rarely waits on Stripe.
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (!response.ok) return null;
    return lotState(await response.json());
  } catch {
    // Timeout or network: the page keeps its written values and fundadores.js tries again in the browser.
    return null;
  }
}

function withLot(response, lot) {
  const rewriter = new HTMLRewriter()
    .on('#lot-left', { element(el) { el.setInnerContent(String(lot.left)); } })
    .on('.lot-fill', { element(el) { el.setAttribute('style', `width:${lot.percent}%`); } })
    .on('.lot-bar', { element(el) { el.setAttribute('aria-label', `${lot.sold} de ${lot.total} vagas de Fundador preenchidas`); } });
  if (lot.soldOut) {
    rewriter.on('#buy-founder', {
      element(el) {
        el.setInnerContent('Vagas esgotadas');
        el.removeAttribute('href');
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('style', 'opacity:.55;pointer-events:none');
      },
    });
  }
  const out = rewriter.transform(response);
  const headers = new Headers(out.headers);
  // The body now changes with the sales: no validator from the static file, and no long cache.
  headers.delete('ETag');
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(out.body, { status: out.status, statusText: out.statusText, headers });
}

function withoutConditionals(headers) {
  const copy = new Headers(headers);
  copy.delete('If-None-Match');
  copy.delete('If-Modified-Since');
  return copy;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.vaelo.club' || (url.protocol === 'http:' && url.hostname === 'vaelo.club')) {
      url.hostname = 'vaelo.club';
      url.protocol = 'https:';
      // One hop: the pages are directories, so the slash always goes.
      if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(url.toString(), 301);
    }
    const founders = url.pathname === '/fundadores' && (request.method === 'GET' || request.method === 'HEAD');
    // A conditional request would get a 304 for the static file and keep a stale count in the browser.
    const assetRequest = founders ? new Request(request, { headers: withoutConditionals(request.headers) }) : request;
    const [response, lot] = await Promise.all([env.ASSETS.fetch(assetRequest), founders ? fetchBoard() : null]);
    if (response.status === 307) {
      const location = response.headers.get('Location');
      if (location) {
        const headers = new Headers(response.headers);
        headers.set('Location', new URL(location, url).toString());
        return new Response(null, { status: 301, headers });
      }
    }
    if (lot && response.status === 200 && (response.headers.get('Content-Type') ?? '').includes('text/html')) {
      return withLot(response, lot);
    }
    return response;
  },
};
