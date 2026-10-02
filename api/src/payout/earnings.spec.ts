import { Prisma } from '@/database/generated/prisma/client';
import { instructorShare, summarizeEarnings } from '@/payout/earnings';

const D = (value: number | string) => new Prisma.Decimal(value);
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-01T00:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

describe('instructorShare', () => {
  it('takes the share percent of the price', () => {
    expect(instructorShare(D(1000), 70).toFixed(2)).toBe('700.00');
  });

  it('rounds to satang (2 decimals)', () => {
    expect(instructorShare(D('99.99'), 70).toFixed(2)).toBe('69.99');
    expect(instructorShare(D('0.05'), 70).toFixed(2)).toBe('0.04');
  });
});

describe('summarizeEarnings', () => {
  it('keeps sales inside the 14-day refund window as pending', () => {
    const summary = summarizeEarnings(
      [{ price: D(1000), purchasedAt: daysAgo(3), refundPending: false }],
      D(0),
      70,
      NOW,
    );

    expect(summary.pending.toFixed(2)).toBe('700.00');
    expect(summary.available.toFixed(2)).toBe('0.00');
    expect(summary.totalEarned.toFixed(2)).toBe('700.00');
  });

  it('makes sales available once the refund window has passed', () => {
    const summary = summarizeEarnings(
      [{ price: D(1000), purchasedAt: daysAgo(15), refundPending: false }],
      D(0),
      70,
      NOW,
    );

    expect(summary.pending.toFixed(2)).toBe('0.00');
    expect(summary.available.toFixed(2)).toBe('700.00');
  });

  it('holds back a sale with a refund request still under review', () => {
    const summary = summarizeEarnings(
      [{ price: D(1000), purchasedAt: daysAgo(30), refundPending: true }],
      D(0),
      70,
      NOW,
    );

    expect(summary.pending.toFixed(2)).toBe('700.00');
    expect(summary.available.toFixed(2)).toBe('0.00');
  });

  it('subtracts what was already paid out', () => {
    const summary = summarizeEarnings(
      [
        { price: D(1000), purchasedAt: daysAgo(20), refundPending: false },
        { price: D(500), purchasedAt: daysAgo(20), refundPending: false },
      ],
      D(600),
      70,
      NOW,
    );

    expect(summary.paidOut.toFixed(2)).toBe('600.00');
    expect(summary.available.toFixed(2)).toBe('450.00');
  });

  it('can go negative when a paid-out sale is refunded later', () => {
    const summary = summarizeEarnings([], D(700), 70, NOW);
    expect(summary.available.toFixed(2)).toBe('-700.00');
  });
});
