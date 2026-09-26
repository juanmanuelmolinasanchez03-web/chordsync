const { fetchLyricsMulti } = require('../lib/scrapers');

exports.handler = async (event) => {
  const { artist = '', title = '' } = event.queryStringParameters || {};
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'title required' }) };

  try {
    const result = await fetchLyricsMulti(artist, title);
    if (result) return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(result) };
    return { statusCode: 404, body: JSON.stringify({ error: 'not found' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
