import { SetMetadata } from '@nestjs/common';

export const VERIFIED_KEY = 'verified';
export const Verified = (required: boolean = true) =>
  SetMetadata(VERIFIED_KEY, required);
