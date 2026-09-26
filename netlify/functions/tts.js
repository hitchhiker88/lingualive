exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text, voiceId } = JSON.parse(event.body || '{}');

    if (!text || !voiceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing text or voiceId'
        })
      };
    }

    const apiKey = process.env.ELEVEN_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'ELEVEN_KEY is not configured'
        })
      };
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 1.0
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        'ElevenLabs TTS error:',
        response.status,
        errorText
      );

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'ElevenLabs TTS request failed'
        })
      };
    }

    const audioBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    return {
      statusCode: 200,

      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      },

      isBase64Encoded: true,
      body: audioBuffer.toString('base64')
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
