exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ablyKey: process.env.ABLY_KEY || '',
      elevenKey: process.env.ELEVEN_KEY || '',
      hostPassword: process.env.HOST_PASSWORD || ''
    })
  };
};
