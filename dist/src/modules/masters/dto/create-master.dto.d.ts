export declare enum MasterServicePriceType {
    FIXED = "FIXED",
    NEGOTIABLE = "NEGOTIABLE"
}
export declare enum MasterServiceCurrency {
    MDL = "MDL",
    EUR = "EUR",
    USD = "USD"
}
export declare class MasterServiceDto {
    title: string;
    priceType: MasterServicePriceType;
    price?: number;
    currency?: MasterServiceCurrency;
}
export declare class CreateMasterDto {
    description?: string;
    avatar?: string;
    cityId: string;
    categoryId: string;
    experienceYears?: number;
    services?: MasterServiceDto[];
    latitude?: number;
    longitude?: number;
}
