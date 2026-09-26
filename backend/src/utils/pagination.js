function getSkip(page, limit) {
  return (page - 1) * limit;
}

function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { getSkip, buildPaginationMeta };
