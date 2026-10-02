import { pageCount, pageQuery, paginated } from './pagination';

describe('pagination', () => {
  it('turns a 1-based page into skip/take', () => {
    expect(pageQuery(1, 10)).toEqual({ skip: 0, take: 10 });
    expect(pageQuery(3, 12)).toEqual({ skip: 24, take: 12 });
  });

  it('counts pages, rounding up (0 items = 0 pages)', () => {
    expect(pageCount(0, 10)).toBe(0);
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
  });

  it('wraps items in the shape the web expects', () => {
    expect(paginated(['a'], 21, 3, 10)).toEqual({
      items: ['a'],
      total: 21,
      page: 3,
      totalPages: 3,
    });
  });
});
