// Shared helpers for KMapp API functions

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ success: false, error: message }, status);
}

export async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
