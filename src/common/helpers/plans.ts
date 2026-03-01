type TariffType = 'BASIC' | 'VIP' | 'PREMIUM';

interface MasterTariffFields {
  tariffType?: TariffType;
  tariffExpiresAt?: Date | string | null;
}

export function getEffectiveTariff(
  master: MasterTariffFields | null | undefined,
): TariffType {
  const type = master?.tariffType ?? 'BASIC';

  if (type === 'BASIC') return 'BASIC';

  const expRaw = master?.tariffExpiresAt ?? null;
  const exp = expRaw ? new Date(expRaw) : null;

  if (!exp) return 'BASIC';
  if (Number.isNaN(exp.getTime())) return 'BASIC';
  if (exp.getTime() <= Date.now()) return 'BASIC';

  return type;
}

interface MasterWithUser extends MasterTariffFields {
  user?: {
    phone?: string | null;
    email?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Санитизация публичного профиля мастера: контакты (телефон, email) не отдаём на публику.
 * Клиент видит телефон и email мастера только в своём кабинете после отправки заявки (в списке лидов).
 */
export function sanitizePublicMaster(master: MasterWithUser) {
  const eff = getEffectiveTariff(master);

  if (master?.user) {
    return {
      ...master,
      effectiveTariffType: eff,
      user: {
        ...master.user,
        phone: null,
        email: null,
      },
    };
  }

  return { ...master, effectiveTariffType: eff };
}

export function maskPhone(phone?: string | null) {
  const p = String(phone ?? '').trim();
  if (!p) return null;

  const raw = p.replace(/\s+/g, '');

  const last2 = raw.slice(-2);

  if (raw.startsWith('+373') && raw.length >= 4) {
    const next = raw[4] ?? '';
    return `+373 ${next}** ** *${last2}`;
  }

  if (raw.startsWith('0') && raw.length >= 2) {
    return `0** ** *${last2}`;
  }

  return `*** *** *${last2}`;
}
