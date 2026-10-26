export async function onRequestGet(context) {
  const request = context.request;
  const env = context.env;
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (!id) {
    return new Response(JSON.stringify({ error: { message: 'missing id' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const apiUrl = 'https://api.yellowtips.com/v1/legal/sentencia?id=' + encodeURIComponent(id);
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'X-API-Key': env.YELLOWTIPS_API_KEY }
    });
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: { message: 'proxy error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}