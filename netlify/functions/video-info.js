const { http } = require('../lib/scrapers');

exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;
  if (!url) return { statusCode: 400, body: JSON.stringify({ error: 'url required' }) };

  try {
    const r = await http.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r.data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
