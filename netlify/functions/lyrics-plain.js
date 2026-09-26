const { http } = require('../lib/scrapers');

exports.handler = async (event) => {
  const { artist = '', title = '' } = event.queryStringParameters || {};
  try {
    const r = await http.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r.data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
