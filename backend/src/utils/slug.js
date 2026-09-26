const slugify = require('slugify');

function generateSlug(text) {
  return slugify(text, { lower: true, strict: true, trim: true });
}

module.exports = { generateSlug };
