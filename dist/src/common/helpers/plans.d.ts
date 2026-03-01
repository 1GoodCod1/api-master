type TariffType = 'BASIC' | 'VIP' | 'PREMIUM';
interface MasterTariffFields {
    tariffType?: TariffType;
    tariffExpiresAt?: Date | string | null;
}
export declare function getEffectiveTariff(master: MasterTariffFields | null | undefined): TariffType;
interface MasterWithUser extends MasterTariffFields {
    user?: {
        phone?: string | null;
        email?: string | null;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
export declare function sanitizePublicMaster(master: MasterWithUser): {
    effectiveTariffType: TariffType;
    user?: {
        phone?: string | null;
        email?: string | null;
        [key: string]: unknown;
    };
    tariffType?: TariffType;
    tariffExpiresAt?: Date | string | null;
};
export declare function maskPhone(phone?: string | null): string | null;
export {};
