const { ugSearch } = require('../lib/scrapers');

exports.handler = async (event) => {
  const { q = '' } = event.queryStringParameters || {};
  if (!q) return { statusCode: 400, body: JSON.stringify({ error: 'q required' }) };

  try {
    const results = await ugSearch(q);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(results),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
