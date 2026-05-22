exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { text, anthropicKey } = JSON.parse(event.body);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Translate this English text into Mandarin Chinese (Simplified), Korean, and German. Return ONLY a valid JSON object with keys "zh","ko","de". No markdown, no extra text.\n\nEnglish: "${text}"`
      }]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: data.error?.message || 'API error' })
    };
  }

  const content = data.content[0].text;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: content
  };
};
