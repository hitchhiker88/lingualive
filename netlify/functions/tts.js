const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  try {
    const store = getStore({
      name: 'lingua-live-audio',
      consistency: 'strong'
    });

    // Audience retrieves existing shared audio
    if (event.httpMethod === 'GET') {
      const session = event.queryStringParameters?.session;
      const seq = event.queryStringParameters?.seq;
      const lang = event.queryStringParameters?.lang;

      if (!session || !seq || !lang) {
        return {
          statusCode: 400,
          body: 'Missing session, seq or lang'
        };
      }

      const key =
        `${session}-${seq}-${lang}.mp3`;

      const audio = await store.get(
        key,
        {
          type: 'arrayBuffer',
          consistency: 'strong'
        }
      );

      if (!audio) {
        return {
          statusCode: 404,
          body: 'Audio not found'
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=3600'
        },
        isBase64Encoded: true,
        body: Buffer.from(audio).toString('base64')
      };
    }

    // Host generates audio once
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method Not Allowed'
      };
    }

    const {
      text,
      voiceId,
      session,
      seq,
      lang
    } = JSON.parse(event.body || '{}');

    if (
      !text ||
      !voiceId ||
      !session ||
      seq === undefined ||
      !lang
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'Missing text, voiceId, session, seq or lang'
        })
      };
    }

    const apiKey =
      process.env.ELEVEN_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            'ELEVEN_KEY is not configured'
        })
      };
    }

    const key =
      `${session}-${seq}-${lang}.mp3`;

    // Do not regenerate if this phrase already exists
    const existing =
      await store.getMetadata(
        key,
        {
          consistency: 'strong'
        }
      );

    if (existing) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ok: true,
          cached: true,
          url:
            '/.netlify/functions/tts' +
            '?session=' +
            encodeURIComponent(session) +
            '&seq=' +
            encodeURIComponent(seq) +
            '&lang=' +
            encodeURIComponent(lang)
        })
      };
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          'xi-api-key':
            apiKey
        },
        body: JSON.stringify({
          text,
          model_id:
            'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 1.0
          }
        })
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        'ElevenLabs TTS error:',
        response.status,
        errorText
      );

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error:
            'ElevenLabs TTS request failed'
        })
      };
    }

    const audio =
      await response.arrayBuffer();

    await store.set(
      key,
      audio,
      {
        metadata: {
          session,
          lang,
          seq: String(seq),
          createdAt: Date.now()
        }
      }
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type':
          'application/json'
      },
      body: JSON.stringify({
        ok: true,
        cached: false,
        url:
          '/.netlify/functions/tts' +
          '?session=' +
          encodeURIComponent(session) +
          '&seq=' +
          encodeURIComponent(seq) +
          '&lang=' +
          encodeURIComponent(lang)
      })
    };

  } catch (error) {
    console.error(
      'TTS function error:',
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
