const { buildPaginationMeta, getSkip } = require('../../../src/utils/pagination');

describe('pagination helpers', () => {
  describe('getSkip', () => {
    it.each([
      [1, 20, 0],
      [2, 20, 20],
      [3, 10, 20],
      [5, 1, 4],
    ])('page %i with limit %i skips %i rows', (page, limit, expected) => {
      expect(getSkip(page, limit)).toBe(expected);
    });
  });

  describe('buildPaginationMeta', () => {
    it('rounds totalPages up for a partial last page', () => {
      expect(buildPaginationMeta(21, 1, 10)).toEqual({
        page: 1,
        limit: 10,
        total: 21,
        totalPages: 3,
      });
    });

    it('does not add an extra page when total divides evenly', () => {
      expect(buildPaginationMeta(20, 2, 10).totalPages).toBe(2);
    });

    it('reports zero pages for an empty result set', () => {
      expect(buildPaginationMeta(0, 1, 20)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    it('echoes an out-of-range page as-is (the query just returns no rows)', () => {
      expect(buildPaginationMeta(5, 9, 10)).toMatchObject({ page: 9, totalPages: 1 });
    });
  });
});
