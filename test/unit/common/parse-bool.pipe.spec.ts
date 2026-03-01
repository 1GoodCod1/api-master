import { BadRequestException } from '@nestjs/common';
import { ParseBoolPipe } from '../../../src/common/pipes/parse-bool.pipe';

describe('ParseBoolPipe', () => {
  const pipe = new ParseBoolPipe();

  it('returns true for "true"', () => {
    expect(pipe.transform('true')).toBe(true);
  });

  it('returns true for "1"', () => {
    expect(pipe.transform('1')).toBe(true);
  });

  it('returns false for "false"', () => {
    expect(pipe.transform('false')).toBe(false);
  });

  it('returns false for "0"', () => {
    expect(pipe.transform('0')).toBe(false);
  });

  it('throws BadRequestException for invalid value', () => {
    expect(() => pipe.transform('yes')).toThrow(BadRequestException);
    expect(() => pipe.transform('')).toThrow(BadRequestException);
    expect(() => pipe.transform('2')).toThrow(BadRequestException);
    expect(() => pipe.transform('maybe')).toThrow(BadRequestException);
  });
});
