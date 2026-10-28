import { BadRequestException } from '@nestjs/common';

// Money is handled as integer minor units end to end, so no line total drifts
// the way repeated float arithmetic would.
export const toMinor = (value: string | number): bigint => {
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new BadRequestException(`"${value}" is not a valid amount`);
  }
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const cents = `${fraction}00`.slice(0, 2);
  const magnitude = BigInt(whole) * 100n + BigInt(cents);
  return negative ? -magnitude : magnitude;
};

export const fromMinor = (value: bigint): string => {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const whole = magnitude / 100n;
  const cents = magnitude % 100n;
  return `${negative ? '-' : ''}${whole}.${String(cents).padStart(2, '0')}`;
};

// Quantities carry three decimals, so they scale by 1000 rather than 100.
export const toMilli = (value: string | number): bigint => {
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new BadRequestException(`"${value}" is not a valid quantity`);
  }
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const milli = `${fraction}000`.slice(0, 3);
  const magnitude = BigInt(whole) * 1000n + BigInt(milli);
  return text.startsWith('-') ? -magnitude : magnitude;
};

export const fromMilli = (value: bigint): string => {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  return `${negative ? '-' : ''}${magnitude / 1000n}.${String(
    magnitude % 1000n,
  ).padStart(3, '0')}`;
};

export const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Prices a set of document lines: quantity x price per line, summed. Rejects
 * non-positive quantities and negative prices.
 */
export const priceLines = <T extends { quantity: string; price?: string }>(
  lines: T[],
) => {
  let total = 0n;
  const items = lines.map((line) => {
    const quantity = toMilli(line.quantity);
    if (quantity <= 0n) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    const price = toMinor(line.price ?? '0');
    if (price < 0n) {
      throw new BadRequestException('Price cannot be negative');
    }
    const amount = (quantity * price) / 1000n;
    total += amount;
    return {
      line,
      quantityMilli: quantity,
      quantity: fromMilli(quantity),
      price: fromMinor(price),
      amount: fromMinor(amount),
    };
  });
  return { items, total };
};
