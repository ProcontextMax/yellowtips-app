export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();

    if (!code) {
      return Response.json({ valid: false, reason: 'missing' }, { status: 400 });
    }

    const row = await env.DB.prepare(
      'SELECT email, expires_at FROM access_codes WHERE code = ?'
    ).bind(code).first();

    if (!row) {
      return Response.json({ valid: false, reason: 'invalid' });
    }

    if (new Date(row.expires_at) < new Date()) {
      return Response.json({ valid: false, reason: 'expired' });
    }

    return Response.json({ valid: true, expires_at: row.expires_at });

  } catch (e) {
    return Response.json({ valid: false, reason: 'server_error' }, { status: 500 });
  }
}