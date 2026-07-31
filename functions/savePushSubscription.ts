export default async function savePushSubscription(req, res) {
  try {
    const { username, subscription } = req.body || {};
    if (!username || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Missing username or subscription' });
    }

    const existing = await base44.entities.PushSubscription.list();
    const found = existing.find(s => s.data.endpoint === subscription.endpoint);

    if (found) {
      await base44.entities.PushSubscription.update(found.id, {
        username: username,
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys?.p256dh || '',
        keys_auth: subscription.keys?.auth || '',
        subscription: JSON.stringify(subscription)
      });
      return res.json({ success: true, action: 'updated' });
    }

    await base44.entities.PushSubscription.create({
      username: username,
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys?.p256dh || '',
      keys_auth: subscription.keys?.auth || '',
      subscription: JSON.stringify(subscription)
    });

    return res.json({ success: true, action: 'created' });
  } catch (error) {
    console.error('savePushSubscription error:', error);
    return res.status(500).json({ error: error.message });
  }
}
