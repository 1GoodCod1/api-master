"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTariffDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_tariff_dto_1 = require("./create-tariff.dto");
class UpdateTariffDto extends (0, swagger_1.PartialType)(create_tariff_dto_1.CreateTariffDto) {
}
exports.UpdateTariffDto = UpdateTariffDto;
//# sourceMappingURL=update-tariff.dto.js.map