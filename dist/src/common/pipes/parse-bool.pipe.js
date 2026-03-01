"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseBoolPipe = void 0;
const common_1 = require("@nestjs/common");
let ParseBoolPipe = class ParseBoolPipe {
    transform(value) {
        if (value === 'true' || value === '1')
            return true;
        if (value === 'false' || value === '0')
            return false;
        throw new common_1.BadRequestException('Validation failed (boolean string is expected)');
    }
};
exports.ParseBoolPipe = ParseBoolPipe;
exports.ParseBoolPipe = ParseBoolPipe = __decorate([
    (0, common_1.Injectable)()
], ParseBoolPipe);
//# sourceMappingURL=parse-bool.pipe.js.map