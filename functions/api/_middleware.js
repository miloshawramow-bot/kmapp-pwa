// CORS + D1 check middleware for all /api/* routes
async function handleRequest(context) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'D1 database not configured. Create a D1 database named "kmapp-db" in Cloudflare dashboard and bind it to this Pages project.' 
    }), {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    return await context.next();
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export const onRequest = handleRequest;
export const onRequestGet = handleRequest;
export const onRequestPost = handleRequest;
