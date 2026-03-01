"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decimalToNumber = decimalToNumber;
exports.isDecimal = isDecimal;
const client_1 = require("@prisma/client");
function decimalToNumber(value) {
    if (!value)
        return 0;
    if (typeof value === 'number') {
        return value;
    }
    if (value instanceof client_1.Prisma.Decimal) {
        return value.toNumber();
    }
    return Number(value) || 0;
}
function isDecimal(value) {
    return value instanceof client_1.Prisma.Decimal;
}
//# sourceMappingURL=decimal.utils.js.map