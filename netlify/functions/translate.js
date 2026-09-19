exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { text, langs, context = [], seq = null } = JSON.parse(event.body || '{}');

    if (!text || typeof text !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing text' }) };
    }

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

    const activeLangs = Array.isArray(langs) && langs.length > 0
      ? langs.filter(l => allLangs[l])
      : Object.keys(allLangs);

    if (!activeLangs.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No valid target languages' }) };
    }

    const langList = activeLangs.map(l => `"${l}": ${allLangs[l]}`).join(', ');
    const safeContext = Array.isArray(context)
      ? context.filter(x => typeof x === 'string' && x.trim()).slice(-2)
      : [];

    const contextBlock = safeContext.length
      ? `Previous English context (context only; do NOT translate it again):\n${safeContext.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n`
      : '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content:
            `You are a simultaneous interpreter for a live presentation.\n` +
            `Translate ONLY the new English segment into these languages: ${langList}.\n` +
            `Use the previous context only to resolve pronouns, names and meaning.\n` +
            `Keep the translation concise, natural and easy to speak aloud.\n` +
            `Render numbers, dates, currencies and abbreviations in a natural speakable form for each target language when appropriate.\n` +
            `Do not omit information and do not add commentary.\n` +
            `Return ONLY one valid JSON object whose keys are exactly the requested language codes. No markdown.\n\n` +
            contextBlock +
            `New English segment: "${text.replace(/"/g, '\\"')}"`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.error?.message || 'Anthropic API error',
          seq
        })
      };
    }

    const raw = data.content?.[0]?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seq,
        translations: parsed
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
