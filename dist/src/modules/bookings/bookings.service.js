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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const constants_1 = require("../../common/constants");
const prisma_service_1 = require("../shared/database/prisma.service");
const in_app_notification_service_1 = require("../notifications/services/in-app-notification.service");
const masters_availability_service_1 = require("../masters/services/masters-availability.service");
const VALID_STATUS_TRANSITIONS = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
};
let BookingsService = class BookingsService {
    prisma;
    inAppNotifications;
    availabilityService;
    constructor(prisma, inAppNotifications, availabilityService) {
        this.prisma = prisma;
        this.inAppNotifications = inAppNotifications;
        this.availabilityService = availabilityService;
    }
    async create(dto, clientPhone, clientName, authUser) {
        if (!authUser) {
            throw new common_1.ForbiddenException('Only authorized users can create bookings. Please log in.');
        }
        if (authUser.role !== 'CLIENT' && authUser.role !== 'MASTER') {
            throw new common_1.ForbiddenException('Only clients or masters can create bookings.');
        }
        const { masterId, startTime, endTime, notes, leadId } = dto;
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        if (!master) {
            throw new common_1.NotFoundException('Master not found');
        }
        let resolvedPhone = clientPhone;
        let resolvedName = clientName;
        let resolvedClientId = null;
        const resolvedLeadId = leadId ?? null;
        if (authUser.role === 'MASTER') {
            if (!leadId) {
                throw new common_1.BadRequestException('Master can only create bookings from a lead (leadId required).');
            }
            const masterProfileId = authUser.masterProfile?.id;
            if (!masterProfileId || masterProfileId !== masterId) {
                throw new common_1.ForbiddenException('You can only create bookings for your own profile.');
            }
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                select: {
                    id: true,
                    masterId: true,
                    status: true,
                    clientPhone: true,
                    clientName: true,
                    clientId: true,
                },
            });
            if (!lead || lead.masterId !== masterId) {
                throw new common_1.BadRequestException('Lead not found or does not belong to this master.');
            }
            if (lead.status === 'CLOSED' || lead.status === 'SPAM') {
                throw new common_1.BadRequestException(`Cannot create booking from a ${lead.status} lead.`);
            }
            resolvedPhone = lead.clientPhone;
            resolvedName = lead.clientName ?? undefined;
            resolvedClientId = lead.clientId;
        }
        else {
            if (authUser.phoneVerified === false) {
                throw new common_1.ForbiddenException('Phone verification required to create bookings. Please verify your phone number first.');
            }
            resolvedClientId = authUser.id;
            if (leadId) {
                const lead = await this.prisma.lead.findUnique({
                    where: { id: leadId },
                    select: { id: true, masterId: true, clientId: true, status: true },
                });
                if (!lead || lead.masterId !== masterId) {
                    throw new common_1.BadRequestException('Lead not found or does not belong to this master.');
                }
                if (lead.status === 'CLOSED' || lead.status === 'SPAM') {
                    throw new common_1.BadRequestException(`Cannot create booking from a ${lead.status} lead.`);
                }
                if (lead.clientId !== authUser.id) {
                    throw new common_1.ForbiddenException('You can only create a booking for your own lead.');
                }
            }
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
            throw new common_1.BadRequestException('Start time must be before end time');
        }
        if (start < new Date()) {
            throw new common_1.BadRequestException('Start time cannot be in the past');
        }
        const conflictingBooking = await this.prisma.booking.findFirst({
            where: {
                masterId,
                status: { in: ['PENDING', 'CONFIRMED'] },
                startTime: { lt: end },
                endTime: { gt: start },
            },
        });
        if (conflictingBooking) {
            throw new common_1.BadRequestException('This time slot is already booked');
        }
        const booking = await this.prisma.booking.create({
            data: {
                masterId,
                leadId: resolvedLeadId,
                clientPhone: resolvedPhone,
                clientName: resolvedName,
                clientId: resolvedClientId,
                startTime: start,
                endTime: end,
                notes,
                status: 'CONFIRMED',
            },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                isVerified: true,
                            },
                        },
                        city: true,
                        category: true,
                    },
                },
                lead: true,
            },
        });
        if (resolvedLeadId) {
            try {
                await this.prisma.lead.update({
                    where: { id: resolvedLeadId },
                    data: {
                        status: 'IN_PROGRESS',
                        updatedAt: new Date(),
                    },
                });
            }
            catch (error) {
                console.error('Failed to update lead status after booking creation:', error);
            }
        }
        try {
            const masterName = [master.user.firstName, master.user.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
            const formattedTime = start.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            await this.inAppNotifications.notifyBookingConfirmed(master.user.id, resolvedClientId, {
                bookingId: booking.id,
                masterId,
                masterName: masterName || undefined,
                clientName: resolvedName || undefined,
                startTime: formattedTime,
            });
        }
        catch (error) {
            console.error('Failed to send booking notification:', error);
        }
        return booking;
    }
    async findAllForMaster(masterId, status) {
        const where = { masterId };
        if (status && status in client_1.BookingStatus) {
            where.status = status;
        }
        const bookings = await this.prisma.booking.findMany({
            where,
            orderBy: { startTime: 'asc' },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                isVerified: true,
                            },
                        },
                        city: true,
                        category: true,
                    },
                },
                lead: true,
            },
        });
        return bookings;
    }
    async findAllForClient(userId, clientPhone) {
        const where = {
            OR: [{ clientId: userId }, { clientPhone }],
        };
        const bookings = await this.prisma.booking.findMany({
            where,
            orderBy: { startTime: 'desc' },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                isVerified: true,
                            },
                        },
                        city: true,
                        category: true,
                    },
                },
            },
        });
        return bookings;
    }
    async updateStatus(bookingId, masterId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                master: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.masterId !== masterId) {
            throw new common_1.BadRequestException('You can only update your own bookings');
        }
        const currentStatus = booking.status;
        const newStatus = dto.status;
        const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
        if (!allowedTransitions.includes(newStatus)) {
            throw new common_1.BadRequestException(`Cannot transition booking from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (final status)'}`);
        }
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: dto.status,
            },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                isVerified: true,
                            },
                        },
                        city: true,
                        category: true,
                    },
                },
            },
        });
        if (booking.leadId) {
            try {
                const leadMasterId = booking.masterId;
                if (newStatus === 'CANCELLED') {
                    await this.prisma.$transaction(async (tx) => {
                        await tx.lead.update({
                            where: { id: booking.leadId },
                            data: { status: 'NEW', updatedAt: new Date() },
                        });
                        await this.availabilityService.decrementActiveLeads(leadMasterId);
                    });
                }
                else if (newStatus === 'COMPLETED') {
                    await this.prisma.$transaction(async (tx) => {
                        const lead = await tx.lead.findUnique({
                            where: { id: booking.leadId },
                            select: { id: true, masterId: true, status: true },
                        });
                        if (lead && lead.status !== constants_1.LeadStatus.CLOSED) {
                            await tx.lead.update({
                                where: { id: booking.leadId },
                                data: { status: constants_1.LeadStatus.CLOSED, updatedAt: new Date() },
                            });
                            await this.availabilityService.decrementActiveLeads(lead.masterId);
                        }
                    });
                }
            }
            catch (error) {
                console.error('Failed to update lead status after booking status change:', error);
            }
        }
        if (newStatus === 'CANCELLED') {
            try {
                const masterName = [
                    booking.master.user.firstName,
                    booking.master.user.lastName,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
                const formattedTime = booking.startTime.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                await this.inAppNotifications.notifyBookingCancelled(booking.master.user.id, booking.clientId, {
                    bookingId: booking.id,
                    masterId: booking.masterId,
                    masterName: masterName || undefined,
                    clientName: booking.clientName || undefined,
                    startTime: formattedTime,
                });
            }
            catch (error) {
                console.error('Failed to send booking cancellation notification:', error);
            }
        }
        return updated;
    }
    async getAvailableSlots(masterId, date) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: {
                workStartHour: true,
                workEndHour: true,
                slotDurationMinutes: true,
            },
        });
        const workStart = master?.workStartHour ?? 9;
        const workEnd = master?.workEndHour ?? 18;
        const slotMinutes = master?.slotDurationMinutes ?? 60;
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const bookings = await this.prisma.booking.findMany({
            where: {
                masterId,
                startTime: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: {
                    in: ['PENDING', 'CONFIRMED'],
                },
            },
            orderBy: { startTime: 'asc' },
        });
        const availableSlots = [];
        const dayStartMinutes = workStart * 60;
        const dayEndMinutes = workEnd * 60;
        const now = new Date();
        for (let m = dayStartMinutes; m + slotMinutes <= dayEndMinutes; m += slotMinutes) {
            const slotStart = new Date(startOfDay);
            slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
            const slotEnd = new Date(startOfDay);
            slotEnd.setHours(Math.floor((m + slotMinutes) / 60), (m + slotMinutes) % 60, 0, 0);
            const isBooked = bookings.some((b) => slotStart < b.endTime && slotEnd > b.startTime);
            availableSlots.push({
                start: slotStart,
                end: slotEnd,
                available: !isBooked && slotStart > now,
            });
        }
        return {
            date: targetDate.toISOString().split('T')[0],
            slots: availableSlots,
            slotDurationMinutes: slotMinutes,
            workStartHour: workStart,
            workEndHour: workEnd,
            bookings,
        };
    }
    async getCalendar(masterId, status, startDate, endDate) {
        const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const defaultEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        const from = startDate ?? defaultStart;
        const to = endDate ?? defaultEnd;
        const where = {
            masterId,
            startTime: { gte: from, lte: to },
        };
        if (status && status in client_1.BookingStatus) {
            where.status = status;
        }
        const [bookings, leadsWithoutBooking] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                orderBy: { startTime: 'asc' },
                include: {
                    master: {
                        include: {
                            user: { select: { id: true, isVerified: true } },
                            city: true,
                            category: true,
                        },
                    },
                    lead: true,
                },
            }),
            this.prisma.lead.findMany({
                where: {
                    masterId,
                    status: { in: ['NEW', 'IN_PROGRESS'] },
                    bookings: { none: {} },
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    master: {
                        select: {
                            id: true,
                            slug: true,
                            user: { select: { firstName: true, lastName: true } },
                            category: { select: { id: true, name: true } },
                            city: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
        ]);
        return { bookings, leadsWithoutBooking };
    }
    async getRebookInfo(bookingId, userId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                isVerified: true,
                            },
                        },
                        city: true,
                        category: true,
                    },
                },
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.clientId !== userId) {
            throw new common_1.ForbiddenException('You can only rebook your own appointments');
        }
        const originalStart = new Date(booking.startTime);
        const preferredHour = originalStart.getHours();
        const preferredMinute = originalStart.getMinutes();
        const durationMinutes = Math.round((new Date(booking.endTime).getTime() -
            new Date(booking.startTime).getTime()) /
            60000);
        const masterName = [
            booking.master.user.firstName,
            booking.master.user.lastName,
        ]
            .filter(Boolean)
            .join(' ')
            .trim();
        return {
            masterId: booking.masterId,
            masterName: masterName || undefined,
            masterSlug: booking.master.slug,
            serviceName: booking.serviceName || undefined,
            notes: booking.notes || undefined,
            clientPhone: booking.clientPhone,
            clientName: booking.clientName || undefined,
            preferredHour,
            preferredMinute,
            durationMinutes,
            category: booking.master.category,
            city: booking.master.city,
        };
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        in_app_notification_service_1.InAppNotificationService,
        masters_availability_service_1.MastersAvailabilityService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map