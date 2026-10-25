export async function onRequestGet(context) {
  const request = context.request;
  const env = context.env;
  const url = new URL(request.url);
  const params = url.search;
  const apiUrl = 'https://api.yellowtips.com/v1/legal/argument' + params;
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'X-API-Key': env.YELLOWTIPS_API_KEY }
    });
    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error en el proxy' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}