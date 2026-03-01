"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bookings_service_1 = require("./bookings.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const update_booking_status_dto_1 = require("./dto/update-booking-status.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let BookingsController = class BookingsController {
    bookingsService;
    constructor(bookingsService) {
        this.bookingsService = bookingsService;
    }
    async create(dto, req) {
        const user = req.user;
        let phone;
        let name;
        if (user.role === 'CLIENT') {
            phone = user.phone ?? '';
            name = user.firstName ?? undefined;
            if (!phone) {
                throw new common_1.BadRequestException('Client phone is required');
            }
        }
        else {
            phone = '';
            name = undefined;
        }
        return this.bookingsService.create(dto, phone, name, user);
    }
    async findAllForMaster(masterId, req, status) {
        const user = req.user;
        if (user.role !== 'ADMIN') {
            const master = user.masterProfile;
            if (!master || master.id !== masterId) {
                throw new common_1.ForbiddenException('You can only view your own bookings');
            }
        }
        return this.bookingsService.findAllForMaster(masterId, status);
    }
    async getCalendar(masterId, req, status, startDate, endDate) {
        const user = req.user;
        if (user.role !== 'ADMIN') {
            const master = user.masterProfile;
            if (!master || master.id !== masterId) {
                throw new common_1.BadRequestException('You can only view your own calendar');
            }
        }
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        return this.bookingsService.getCalendar(masterId, status, start, end);
    }
    async findAllForClient(req) {
        const user = req.user;
        if (user.role !== 'CLIENT') {
            throw new common_1.BadRequestException('This endpoint is only for clients');
        }
        const phone = user.phone || '';
        return this.bookingsService.findAllForClient(user.id, phone);
    }
    async getAvailableSlots(masterId, date) {
        return this.bookingsService.getAvailableSlots(masterId, date);
    }
    async updateStatus(id, dto, req) {
        const master = req.user.masterProfile;
        if (!master) {
            throw new common_1.ForbiddenException('Master profile not found');
        }
        return this.bookingsService.updateStatus(id, master.id, dto);
    }
    async getRebookInfo(bookingId, req) {
        return this.bookingsService.getRebookInfo(bookingId, req.user.id);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create booking (CLIENT: for self, optionally from lead; MASTER: from lead only)',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Booking created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_booking_dto_1.CreateBookingDto, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('master/:masterId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get bookings for master' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "findAllForMaster", null);
__decorate([
    (0, common_1.Get)('master/:masterId/calendar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get calendar data: bookings + leads without booking',
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, example: '2024-01-01' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, example: '2024-03-31' }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getCalendar", null);
__decorate([
    (0, common_1.Get)('my-bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my bookings (for clients)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "findAllForClient", null);
__decorate([
    (0, common_1.Get)('master/:masterId/available-slots'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available booking slots for master on a date' }),
    (0, swagger_1.ApiQuery)({ name: 'date', required: true, example: '2024-01-20' }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getAvailableSlots", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update booking status' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_status_dto_1.UpdateBookingStatusDto, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)(':id/rebook-info'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get rebook info from previous booking (for "Book Again" feature)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getRebookInfo", null);
exports.BookingsController = BookingsController = __decorate([
    (0, swagger_1.ApiTags)('Bookings'),
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map