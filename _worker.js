export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // === RATE LIMITING (solo /api/*) ===
    if (path.startsWith('/api/')) {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      const key = 'rate:' + ip + ':' + path;
      try {
        const current = parseInt(await env.RATE_LIMIT_KV.get(key) || '0', 10);
        if (current >= 20) {
          return new Response(JSON.stringify({
            error: { code: 'E429', message: 'rate_limit_exceeded', hint: 'Máximo 20 requests por minuto. Esperá y reintentá.' }
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: 60 });
      } catch (e) {
        console.error('RATE_LIMIT_ERROR:', String(e && e.message || e));
      }
    }
    // === FIN RATE LIMITING ===

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