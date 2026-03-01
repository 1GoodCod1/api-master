"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateParamPipe = exports.ValidateIdPipe = exports.ValidateSlugPipe = void 0;
const common_1 = require("@nestjs/common");
const slug_validator_util_1 = require("../../modules/shared/utils/slug-validator.util");
let ValidateSlugPipe = class ValidateSlugPipe {
    transform(value) {
        const sanitized = (0, slug_validator_util_1.validateSlug)(value);
        if (!sanitized) {
            throw new common_1.BadRequestException('Invalid slug format');
        }
        return sanitized;
    }
};
exports.ValidateSlugPipe = ValidateSlugPipe;
exports.ValidateSlugPipe = ValidateSlugPipe = __decorate([
    (0, common_1.Injectable)()
], ValidateSlugPipe);
let ValidateIdPipe = class ValidateIdPipe {
    transform(value) {
        if (!(0, slug_validator_util_1.validateId)(value)) {
            throw new common_1.BadRequestException('Invalid ID format');
        }
        return value;
    }
};
exports.ValidateIdPipe = ValidateIdPipe;
exports.ValidateIdPipe = ValidateIdPipe = __decorate([
    (0, common_1.Injectable)()
], ValidateIdPipe);
let ValidateParamPipe = class ValidateParamPipe {
    transform(value) {
        if ((0, slug_validator_util_1.validateId)(value)) {
            return value;
        }
        const sanitizedSlug = (0, slug_validator_util_1.validateSlug)(value);
        if (sanitizedSlug) {
            return sanitizedSlug;
        }
        throw new common_1.BadRequestException('Invalid parameter format');
    }
};
exports.ValidateParamPipe = ValidateParamPipe;
exports.ValidateParamPipe = ValidateParamPipe = __decorate([
    (0, common_1.Injectable)()
], ValidateParamPipe);
//# sourceMappingURL=param-validation.pipe.js.map