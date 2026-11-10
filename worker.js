// www.vaelo.club and the missing trailing slash answer with permanent
// redirects, like GitHub Pages did: search engines read 307 as temporary.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.vaelo.club') {
      url.hostname = 'vaelo.club';
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
