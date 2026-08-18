exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { text, langs } = JSON.parse(event.body);
    // Only translate into languages that have active listeners
    const allLangs = {
      zh: 'Mandarin Chinese (Simplified)',
      yue: 'Cantonese (Traditional Chinese characters)',
      ko: 'Korean',
      de: 'German',
      id: 'Indonesian',
      tl: 'Filipino/Tagalog',
      th: 'Thai',
      km: 'Khmer (Cambodian)',
      vi: 'Vietnamese',
      hi: 'Hindi',
      ru: 'Russian',
      uk: 'Ukrainian'
    };
    const activeLangs = langs && langs.length > 0
      ? langs.filter(l => allLangs[l])
      : Object.keys(allLangs);

    const langList = activeLangs.map(l => `"${l}": ${allLangs[l]}`).join(', ');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Translate this English text into the following languages: ${langList}. Return ONLY a valid JSON object where the keys are the language codes and values are the translations. No markdown, no extra text.\n\nEnglish: "${text}"`
        }]
      })
    });
    const data = await response.json();
    if (!response.ok) return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || 'API error' }) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: data.content[0].text };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

