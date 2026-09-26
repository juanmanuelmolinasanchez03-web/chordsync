const { ugFetch } = require('../lib/scrapers');

exports.handler = async (event) => {
  const { url = '' } = event.queryStringParameters || {};
  if (!url) return { statusCode: 400, body: JSON.stringify({ error: 'url required' }) };

  try {
    const result = await ugFetch(url);
    if (result) return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result),
    };
    return { statusCode: 404, body: JSON.stringify({ error: 'not found' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
