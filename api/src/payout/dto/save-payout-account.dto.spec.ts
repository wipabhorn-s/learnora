import { BANK_CODES, bankNameOf } from '@/payout/banks';
import { SavePayoutAccountDto } from '@/payout/dto/save-payout-account.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const errorsFor = async (body: Record<string, unknown>) => {
  const dto = plainToInstance(SavePayoutAccountDto, {
    accountName: 'Jane Doe',
    accountNumber: '1234567890',
    ...body,
  });
  const errors = await validate(dto);
  return errors.map((error) => error.property);
};

describe('SavePayoutAccountDto', () => {
  it('accepts a bank code that Opn supports', async () => {
    expect(await errorsFor({ bankCode: 'kbank' })).toEqual([]);
  });

  it('rejects a free-text bank name or unknown code', async () => {
    expect(await errorsFor({ bankCode: 'Kasikorn' })).toEqual(['bankCode']);
    expect(await errorsFor({ bankCode: 'xyz' })).toEqual(['bankCode']);
    expect(await errorsFor({})).toEqual(['bankCode']);
  });
});

describe('THAI_BANKS', () => {
  it('has unique codes that fit the bank_code column', () => {
    expect(new Set(BANK_CODES).size).toBe(BANK_CODES.length);
    expect(BANK_CODES.every((code) => code.length <= 10)).toBe(true);
  });

  it('looks up the display name from the code', () => {
    expect(bankNameOf('scb')).toBe('Siam Commercial Bank');
  });
});
