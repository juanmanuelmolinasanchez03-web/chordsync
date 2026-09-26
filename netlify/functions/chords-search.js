const { searchChords } = require('../lib/scrapers');

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  const { artist = '', title = '' } = event.queryStringParameters || {};
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'title required' }) };

  try {
    const result = await searchChords(artist, title);
    if (result) return { statusCode: 200, headers, body: JSON.stringify(result) };
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'not found', tried: ['Ultimate Guitar', 'E-Chords', 'CifraClub', 'Chordie'] }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
