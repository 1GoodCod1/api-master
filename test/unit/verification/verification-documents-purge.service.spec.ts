jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { unlink } from 'fs/promises';
import { VerificationDocumentsPurgeService } from '../../../src/modules/verification/services/verification-documents-purge.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { ConfigService } from '@nestjs/config';

describe('VerificationDocumentsPurgeService', () => {
  const masterVerification = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const file = {
    deleteMany: jest.fn(),
  };

  const prisma = {
    masterVerification,
    file,
  } as unknown as PrismaService;

  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  let service: VerificationDocumentsPurgeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VerificationDocumentsPurgeService(prisma, configService);
  });

  describe('purgeVerificationFilesById', () => {
    it('returns early when verification is missing', async () => {
      masterVerification.findUnique.mockResolvedValue(null);

      await service.purgeVerificationFilesById('v1');

      expect(masterVerification.update).not.toHaveBeenCalled();
      expect(file.deleteMany).not.toHaveBeenCalled();
    });

    it('returns early when documents already deleted', async () => {
      masterVerification.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'APPROVED',
        documentsDeletedAt: new Date(),
        documentFront: null,
        documentBack: null,
        selfie: null,
      } as never);

      await service.purgeVerificationFilesById('v1');

      expect(unlink).not.toHaveBeenCalled();
      expect(masterVerification.update).not.toHaveBeenCalled();
    });

    it('returns early when status is not APPROVED', async () => {
      masterVerification.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'PENDING',
        documentsDeletedAt: null,
        documentFrontId: 'f1',
        documentFront: { id: 'f1', path: 'local.jpg' },
        documentBack: null,
        selfie: null,
      } as never);

      await service.purgeVerificationFilesById('v1');

      expect(unlink).not.toHaveBeenCalled();
    });

    it('returns early when there are no file records', async () => {
      masterVerification.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'APPROVED',
        documentsDeletedAt: null,
        documentFrontId: null,
        documentBackId: null,
        selfieId: null,
        documentFront: null,
        documentBack: null,
        selfie: null,
      } as never);

      await service.purgeVerificationFilesById('v1');

      expect(unlink).not.toHaveBeenCalled();
    });

    it('deletes local files, clears FKs, and removes file rows', async () => {
      masterVerification.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'APPROVED',
        documentsDeletedAt: null,
        documentFrontId: 'f1',
        documentFront: { id: 'f1', path: 'uploads/doc.jpg' },
        documentBack: null,
        selfie: null,
      } as never);
      masterVerification.update.mockResolvedValue({} as never);
      file.deleteMany.mockResolvedValue({ count: 1 } as never);

      await service.purgeVerificationFilesById('v1');

      expect(unlink).toHaveBeenCalledWith('uploads/doc.jpg');
      expect(masterVerification.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: {
          documentFrontId: null,
          documentBackId: null,
          selfieId: null,
          documentsDeletedAt: expect.any(Date),
        },
      });
      expect(file.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['f1'] } },
      });
    });
  });

  describe('purgeRemainingApprovedVerificationFiles', () => {
    it('does nothing when list is empty', async () => {
      masterVerification.findMany.mockResolvedValue([]);

      await service.purgeRemainingApprovedVerificationFiles();

      expect(masterVerification.update).not.toHaveBeenCalled();
    });

    it('processes each verification returned by findMany', async () => {
      masterVerification.findMany.mockResolvedValue([
        {
          id: 'v1',
          status: 'APPROVED',
          documentsDeletedAt: null,
          documentFrontId: 'f1',
          documentFront: { id: 'f1', path: 'a.jpg' },
          documentBack: null,
          selfie: null,
        },
      ] as never);
      masterVerification.update.mockResolvedValue({} as never);
      file.deleteMany.mockResolvedValue({ count: 1 } as never);

      await service.purgeRemainingApprovedVerificationFiles();

      expect(unlink).toHaveBeenCalledWith('a.jpg');
      expect(masterVerification.update).toHaveBeenCalled();
    });
  });
});
