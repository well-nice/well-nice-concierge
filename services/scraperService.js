const got = require('got');
const metascraper = require('metascraper')([
  require('metascraper-title')(),
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-url')()
]);

async function fetchPreviewData(targetUrl) {
  const { body: html, url } = await got(targetUrl);
  const metadata = await metascraper({ html, url });
  return metadata;
}

module.exports = { fetchPreviewData };