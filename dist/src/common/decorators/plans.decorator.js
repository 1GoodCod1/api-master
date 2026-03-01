"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plans = exports.PLANS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PLANS_KEY = 'plans';
const Plans = (...plans) => (0, common_1.SetMetadata)(exports.PLANS_KEY, plans);
exports.Plans = Plans;
//# sourceMappingURL=plans.decorator.js.map