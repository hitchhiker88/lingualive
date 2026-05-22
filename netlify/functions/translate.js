exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { text } = JSON.parse(event.body);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Translate this English text into Mandarin Chinese (Simplified), Korean, and German. Return ONLY a valid JSON object with keys "zh","ko","de". No markdown, no extra text.\n\nEnglish: "${text}"`
        }]
      })
    });
    const data = await response.json();
    if (!response.ok) return {
      statusCode: response.status,
      body: JSON.stringify({ error: data.error?.message || 'API error' })
    };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: data.content[0].text
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
