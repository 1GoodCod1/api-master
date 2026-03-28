import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_ASC } from '../../../../common/constants';
import type { TemplateOverrideRow } from '../types';

export type { TemplateOverrideRow };

type Delegate = Prisma.EmailTemplateOverrideDelegate;

@Injectable()
export class EmailTemplateOverrideRepository {
  private readonly delegate: Delegate;

  constructor(private readonly prisma: PrismaService) {
    this.delegate = prisma.emailTemplateOverride;
  }

  async findMany(): Promise<TemplateOverrideRow[]> {
    return this.delegate.findMany({
      orderBy: [{ templateId: SORT_ASC }, { lang: SORT_ASC }],
      select: { templateId: true, lang: true, subject: true, bodyHtml: true },
    });
  }

  async findUnique(
    templateId: string,
    lang: string,
  ): Promise<{ subject: string | null; bodyHtml: string | null } | null> {
    return this.delegate.findUnique({
      where: { templateId_lang: { templateId, lang } },
      select: { subject: true, bodyHtml: true },
    });
  }

  async upsert(
    templateId: string,
    lang: string,
    data: { subject?: string; bodyHtml?: string },
  ): Promise<void> {
    await this.delegate.upsert({
      where: { templateId_lang: { templateId, lang } },
      create: {
        templateId,
        lang,
        subject: data.subject ?? null,
        bodyHtml: data.bodyHtml ?? null,
      },
      update: {
        subject: data.subject ?? undefined,
        bodyHtml: data.bodyHtml ?? undefined,
      },
    });
  }
}
