async function sendWebhook(url, payload) {
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (err) {
    console.error('Webhook error:', err.message);
    return false;
  }
}

module.exports = {
  sendWebhook
};