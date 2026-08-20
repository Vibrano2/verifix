"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingSchema = void 0;
const zod_1 = require("zod");
exports.RatingSchema = zod_1.z.object({
    body: zod_1.z.object({
        job_id: zod_1.z.string().min(1),
        match_id: zod_1.z.string().optional(),
        rating: zod_1.z.number().int().min(1).max(5),
        review: zod_1.z.string().max(1000).optional()
    })
});
//# sourceMappingURL=rating.model.js.map