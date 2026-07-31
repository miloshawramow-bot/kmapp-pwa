import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { username, subscription } = body;
    
    if (!username || !subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: "Missing username or subscription" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const existing = await base44.asServiceRole.entities.PushSubscription.list();
    const found = existing.find(s => s.endpoint === subscription.endpoint);
    
    if (found) {
      await base44.asServiceRole.entities.PushSubscription.update(found.id, {
        username: username,
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys?.p256dh || '',
        keys_auth: subscription.keys?.auth || '',
        subscription: JSON.stringify(subscription)
      });
      return new Response(JSON.stringify({ success: true, action: "updated" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    await base44.asServiceRole.entities.PushSubscription.create({
      username: username,
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys?.p256dh || '',
      keys_auth: subscription.keys?.auth || '',
      subscription: JSON.stringify(subscription)
    });
    
    return new Response(JSON.stringify({ success: true, action: "created" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
