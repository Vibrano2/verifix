"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateArtisanSchema = exports.CreateArtisanSchema = exports.LocationSchema = exports.PortfolioProjectSchema = void 0;
const zod_1 = require("zod");
const trades_1 = require("../constants/trades");
exports.PortfolioProjectSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(100),
    description: zod_1.z.string().max(1000),
    image_urls: zod_1.z.array(zod_1.z.string().url()).max(10).optional()
});
exports.LocationSchema = zod_1.z.object({
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    lga: zod_1.z.string().min(1),
    address: zod_1.z.string().optional()
});
exports.CreateArtisanSchema = zod_1.z.object({
    body: zod_1.z.object({
        trade: zod_1.z.enum(trades_1.VALID_TRADES),
        location: exports.LocationSchema,
        tagline: zod_1.z.string().min(5).max(100),
        bio: zod_1.z.string().max(1000).optional(),
        experience_years: zod_1.z.number().min(0).optional(),
        hourly_rate: zod_1.z.number().min(0).optional(),
        skills: zod_1.z.array(zod_1.z.string().min(1).max(50)).max(20).optional(),
        portfolio: zod_1.z.array(exports.PortfolioProjectSchema).max(10).optional()
    })
});
exports.UpdateArtisanSchema = zod_1.z.object({
    body: zod_1.z.object({
        trade: zod_1.z.enum(trades_1.VALID_TRADES).optional(),
        location: exports.LocationSchema.optional(),
        tagline: zod_1.z.string().min(5).max(100).optional(),
        bio: zod_1.z.string().max(1000).optional(),
        experience_years: zod_1.z.number().min(0).optional(),
        hourly_rate: zod_1.z.number().min(0).optional(),
        skills: zod_1.z.array(zod_1.z.string().min(1).max(50)).max(20).optional(),
        portfolio: zod_1.z.array(exports.PortfolioProjectSchema).max(10).optional()
    })
});
//# sourceMappingURL=artisan.model.js.map