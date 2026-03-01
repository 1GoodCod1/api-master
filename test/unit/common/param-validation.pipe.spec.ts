import { BadRequestException } from '@nestjs/common';
import {
  ValidateSlugPipe,
  ValidateIdPipe,
  ValidateParamPipe,
} from '../../../src/common/pipes/param-validation.pipe';

describe('ValidateSlugPipe', () => {
  const pipe = new ValidateSlugPipe();

  it('returns valid slug', () => {
    expect(pipe.transform('john-doe-plumber')).toBe('john-doe-plumber');
    expect(pipe.transform('category_123')).toBe('category_123');
  });

  it('throws for invalid slug', () => {
    expect(() => pipe.transform('john<script>')).toThrow(BadRequestException);
    expect(() => pipe.transform('../../../etc')).toThrow(BadRequestException);
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });
});

describe('ValidateIdPipe', () => {
  const pipe = new ValidateIdPipe();

  it('returns valid UUID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('returns valid numeric id', () => {
    expect(pipe.transform('12345')).toBe('12345');
  });

  it('throws for invalid id', () => {
    expect(() => pipe.transform('<script>')).toThrow(BadRequestException);
    expect(() => pipe.transform('invalid')).toThrow(BadRequestException);
  });
});

describe('ValidateParamPipe', () => {
  const pipe = new ValidateParamPipe();

  it('accepts valid id', () => {
    expect(pipe.transform('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('accepts valid slug', () => {
    expect(pipe.transform('john-doe')).toBe('john-doe');
  });

  it('throws for invalid param', () => {
    expect(() => pipe.transform('<script>alert(1)</script>')).toThrow(
      BadRequestException,
    );
  });
});
