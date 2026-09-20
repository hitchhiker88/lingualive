exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method Not Allowed'
      })
    };
  }

  try {
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
      'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey
        }
      }
    );

    const body = await response.text();

    if (!response.ok) {
      console.error(
        'ElevenLabs token error:',
        response.status,
        body
      );

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Unable to create Scribe token'
        })
      };
    }

    const data = JSON.parse(body);

    return {
      statusCode: 200,

      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },

      body: JSON.stringify({
        token: data.token
      })
    };

  } catch (error) {

    console.error(
      'Scribe token function error:',
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
