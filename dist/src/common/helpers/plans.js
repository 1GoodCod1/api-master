"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveTariff = getEffectiveTariff;
exports.sanitizePublicMaster = sanitizePublicMaster;
exports.maskPhone = maskPhone;
function getEffectiveTariff(master) {
    const type = master?.tariffType ?? 'BASIC';
    if (type === 'BASIC')
        return 'BASIC';
    const expRaw = master?.tariffExpiresAt ?? null;
    const exp = expRaw ? new Date(expRaw) : null;
    if (!exp)
        return 'BASIC';
    if (Number.isNaN(exp.getTime()))
        return 'BASIC';
    if (exp.getTime() <= Date.now())
        return 'BASIC';
    return type;
}
function sanitizePublicMaster(master) {
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
function maskPhone(phone) {
    const p = String(phone ?? '').trim();
    if (!p)
        return null;
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
//# sourceMappingURL=plans.js.map