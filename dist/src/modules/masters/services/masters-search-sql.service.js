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
exports.MastersSearchSqlService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../shared/database/prisma.service");
let MastersSearchSqlService = class MastersSearchSqlService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRankedMasterIds(params) {
        const { categoryId, cityId, tariffType, isFeatured, minRating, minPrice, maxPrice, availableNow, hasPromotion, search, skip, take, sortBy, sortOrder, } = params;
        const now = new Date();
        const whereClauses = [client_1.Prisma.sql `u."isBanned" = false`];
        if (categoryId)
            whereClauses.push(client_1.Prisma.sql `m."categoryId" = ${categoryId}`);
        if (cityId)
            whereClauses.push(client_1.Prisma.sql `m."cityId" = ${cityId}`);
        if (isFeatured !== undefined)
            whereClauses.push(client_1.Prisma.sql `m."isFeatured" = ${isFeatured}`);
        if (minRating !== undefined)
            whereClauses.push(client_1.Prisma.sql `m."rating" >= ${minRating}`);
        if (availableNow === true) {
            whereClauses.push(client_1.Prisma.sql `m."isOnline" = true`);
            whereClauses.push(client_1.Prisma.sql `m."availabilityStatus" = 'AVAILABLE'::"AvailabilityStatus"`);
        }
        if (hasPromotion === true) {
            whereClauses.push(client_1.Prisma.sql `EXISTS (
        SELECT 1 FROM "promotions" p
        WHERE p."masterId" = m."id"
          AND p."isActive" = true
          AND p."validFrom" <= ${now}
          AND p."validUntil" >= ${now}
      )`);
        }
        if (minPrice !== undefined) {
            whereClauses.push(client_1.Prisma.sql `EXISTS (
        SELECT 1 FROM jsonb_array_elements(m."services") AS s
        WHERE (s->>'price')::numeric >= ${minPrice}
      )`);
        }
        if (maxPrice !== undefined) {
            whereClauses.push(client_1.Prisma.sql `EXISTS (
        SELECT 1 FROM jsonb_array_elements(m."services") AS s
        WHERE (s->>'price')::numeric <= ${maxPrice}
      )`);
        }
        if (search && search.trim()) {
            const searchPattern = `%${search.trim()}%`;
            whereClauses.push(client_1.Prisma.sql `(
        u."firstName" ILIKE ${searchPattern} OR
        u."lastName" ILIKE ${searchPattern} OR
        m."description" ILIKE ${searchPattern} OR
        m."slug" ILIKE ${searchPattern} OR
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(m."services") AS s
          WHERE (s->>'name') ILIKE ${searchPattern}
            OR (s->>'description') ILIKE ${searchPattern}
        )
      )`);
        }
        if (tariffType) {
            whereClauses.push(client_1.Prisma.sql `m."tariffType" = ${tariffType}::"TariffType"`);
            if (tariffType !== 'BASIC') {
                whereClauses.push(client_1.Prisma.sql `m."tariffExpiresAt" > ${now}`);
            }
        }
        const whereClause = whereClauses.length > 0
            ? client_1.Prisma.sql `WHERE ${client_1.Prisma.join(whereClauses, ' AND ')}`
            : client_1.Prisma.empty;
        const tariffRankSql = this.buildTariffRankSql(now);
        const sortSql = this.buildSortSql(sortBy, sortOrder);
        const query = client_1.Prisma.sql `
      SELECT m."id"
      FROM "masters" m
      INNER JOIN "users" u ON u."id" = m."userId"
      ${whereClause}
      ORDER BY
        (${tariffRankSql}) DESC,
        ${sortSql}
      LIMIT ${take}
      OFFSET ${skip}
    `;
        const result = await this.prisma.$queryRaw(query);
        return result.map((r) => r.id);
    }
    buildTariffRankSql(now) {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return client_1.Prisma.sql `
      CASE
        WHEN m."tariffType" = 'PREMIUM' AND m."tariffExpiresAt" IS NOT NULL AND m."tariffExpiresAt" > ${now} 
          THEN 3.0 + LEAST(
            COALESCE((
              SELECT COUNT(*)::float * 0.3 
              FROM "leads" l 
              WHERE l."masterId" = m."id" 
              AND l."createdAt" > ${sevenDaysAgo}
            ), 0) +
            COALESCE((
              SELECT COUNT(*)::float * 0.2 
              FROM "reviews" r 
              WHERE r."masterId" = m."id" 
              AND r."createdAt" > ${sevenDaysAgo}
            ), 0) +
            LEAST(COALESCE(m."views", 0)::float / 100.0, 1.0) * 0.1,
            2.0
          )
        WHEN m."tariffType" = 'VIP'   AND m."tariffExpiresAt" IS NOT NULL AND m."tariffExpiresAt" > ${now} THEN 2.0
        ELSE 1.0
      END
    `;
    }
    buildSortSql(sortBy, sortOrder) {
        const sortMap = {
            rating: client_1.Prisma.sql `m."rating"`,
            reviews: client_1.Prisma.sql `m."totalReviews"`,
            totalReviews: client_1.Prisma.sql `m."totalReviews"`,
            experience: client_1.Prisma.sql `m."experienceYears"`,
            leads: client_1.Prisma.sql `m."leadsCount"`,
            leadsCount: client_1.Prisma.sql `m."leadsCount"`,
            views: client_1.Prisma.sql `m."views"`,
            createdAt: client_1.Prisma.sql `m."createdAt"`,
            updatedAt: client_1.Prisma.sql `m."updatedAt"`,
            price: client_1.Prisma.sql `COALESCE((
        SELECT MIN((s->>'price')::numeric)
        FROM jsonb_array_elements(m."services") AS s
        WHERE s->>'price' IS NOT NULL
      ), 0)`,
        };
        const sortField = sortMap[sortBy] || sortMap.rating;
        const normalizedOrder = sortOrder?.toLowerCase() === 'asc' ? client_1.Prisma.sql `ASC` : client_1.Prisma.sql `DESC`;
        return client_1.Prisma.sql `${sortField} ${normalizedOrder}`;
    }
};
exports.MastersSearchSqlService = MastersSearchSqlService;
exports.MastersSearchSqlService = MastersSearchSqlService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MastersSearchSqlService);
//# sourceMappingURL=masters-search-sql.service.js.map