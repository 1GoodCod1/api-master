"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePromotionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_promotion_dto_1 = require("./create-promotion.dto");
class UpdatePromotionDto extends (0, swagger_1.PartialType)(create_promotion_dto_1.CreatePromotionDto) {
}
exports.UpdatePromotionDto = UpdatePromotionDto;
//# sourceMappingURL=update-promotion.dto.js.map