// www.vaelo.club and the trailing slash answer with permanent redirects to
// the canonical URL: search engines read the assets 307 as temporary.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.vaelo.club') {
      url.hostname = 'vaelo.club';
      // One hop: the pages are directories, so the slash always goes.
      if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(url.toString(), 301);
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status === 307) {
      const location = response.headers.get('Location');
      if (location) {
        const headers = new Headers(response.headers);
        headers.set('Location', new URL(location, url).toString());
        return new Response(null, { status: 301, headers });
      }
    }
    return response;
  },
};
