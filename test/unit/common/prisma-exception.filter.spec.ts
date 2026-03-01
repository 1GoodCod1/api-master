import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from '../../../src/common/filters/prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  const createMockHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const ctx = { getResponse: () => response };
    const host = { switchToHttp: () => ctx } as never;
    return { host, response, json, status };
  };

  it('handles P2002 unique constraint', () => {
    const { host, status, json } = createMockHost();
    const error = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: '5',
      meta: { target: ['email'] },
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Unique constraint violation',
      fields: ['email'],
    });
  });

  it('handles P2025 record not found', () => {
    const { host, status, json } = createMockHost();
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5',
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Record not found',
    });
  });

  it('handles P2003 foreign key constraint', () => {
    const { host, status, json } = createMockHost();
    const error = new Prisma.PrismaClientKnownRequestError('FK failed', {
      code: 'P2003',
      clientVersion: '5',
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Foreign key constraint failed',
    });
  });
});
