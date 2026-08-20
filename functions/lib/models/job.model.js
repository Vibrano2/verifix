"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateJobSchema = exports.CreateJobSchema = exports.LocationSchema = void 0;
const zod_1 = require("zod");
const trades_1 = require("../constants/trades");
// Zod Schemas for Validation
exports.LocationSchema = zod_1.z.object({
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    lga: zod_1.z.string().min(1),
    address: zod_1.z.string().optional(),
    coordinates: zod_1.z.object({
        lat: zod_1.z.number(),
        lng: zod_1.z.number()
    }).optional()
});
exports.CreateJobSchema = zod_1.z.object({
    body: zod_1.z.object({
        trade_needed: zod_1.z.enum(trades_1.VALID_TRADES),
        title: zod_1.z.string().min(5).max(100),
        description: zod_1.z.string().min(10).max(1000),
        location: exports.LocationSchema,
        urgency: zod_1.z.enum(['Today', 'This Week', 'Flexible']),
        budget: zod_1.z.number().positive().optional(),
        budget_min: zod_1.z.number().positive().optional(),
        budget_max: zod_1.z.number().positive().optional(),
        match_fee: zod_1.z.number().positive().optional()
    })
});
exports.UpdateJobSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(5).max(100).optional(),
        description: zod_1.z.string().min(10).max(1000).optional(),
        location: exports.LocationSchema.optional(),
        urgency: zod_1.z.enum(['Today', 'This Week', 'Flexible']).optional(),
        budget: zod_1.z.number().positive().optional(),
        status: zod_1.z.enum(['open', 'matched', 'in_progress', 'completed', 'cancelled']).optional()
    })
});
//# sourceMappingURL=job.model.js.map