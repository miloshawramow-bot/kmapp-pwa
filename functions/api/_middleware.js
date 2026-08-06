// CORS + error handling middleware for all /api/* routes
export async function onRequest(context) {
  const { request, env, next } = context;
  
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // Check if D1 is bound
  if (!env.DB) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'D1 database not configured. Create a D1 database named "kmapp-db" in Cloudflare dashboard and bind it to this Pages project.' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    return await next();
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
