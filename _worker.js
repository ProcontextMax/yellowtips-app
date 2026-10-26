export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Proxy: /api/argument -> api.yellowtips.com/v1/legal/argument/hybrid
    if (path === '/api/argument') {
      const target = 'https://api.yellowtips.com/v1/legal/argument/hybrid' + url.search;
      try {
        const res = await fetch(target, {
          headers: { 'X-API-Key': env.YELLOWTIPS_API_KEY }
        });
        return new Response(res.body, {
          status: res.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: { message: 'proxy error' } }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Proxy: /api/sentencia -> api.yellowtips.com/v1/legal/sentencia
    if (path === '/api/sentencia') {
      const id = url.searchParams.get('id') || '';
      const target = 'https://api.yellowtips.com/v1/legal/sentencia?id=' + encodeURIComponent(id);
      try {
        const res = await fetch(target, {
          headers: { 'X-API-Key': env.YELLOWTIPS_API_KEY }
        });
        return new Response(res.body, {
          status: res.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: { message: 'proxy error' } }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Fallback: servir assets estáticos (index.html, etc.)
    return env.ASSETS.fetch(request);
  }
};