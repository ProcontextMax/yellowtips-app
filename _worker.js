export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // === MANEJO DE CORS PREFLIGHT ===
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    // === FIN MANEJO DE CORS PREFLIGHT ===

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

    // Verify access code
    if (path === '/api/verify-code' && request.method === 'POST') {
      try {
        const body = await request.json();
        const code = (body.code || '').trim().toUpperCase();
        if (!code) {
          return new Response(JSON.stringify({ valid: false, reason: 'missing' }), {
            status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const row = await env.DB.prepare(
          'SELECT email, expires_at FROM access_codes WHERE code = ?'
        ).bind(code).first();
        if (!row) {
          return new Response(JSON.stringify({ valid: false, reason: 'invalid' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        if (new Date(row.expires_at) < new Date()) {
          return new Response(JSON.stringify({ valid: false, reason: 'expired' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        return new Response(JSON.stringify({ valid: true, expires_at: row.expires_at }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ valid: false, reason: 'server_error' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

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