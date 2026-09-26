const { http } = require('../lib/scrapers');

exports.handler = async (event) => {
  try {
    const r = await http.get('https://lrclib.net/api/get', { params: event.queryStringParameters });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r.data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
