"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserSchema = exports.CreateUserSchema = void 0;
const zod_1 = require("zod");
exports.CreateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        idToken: zod_1.z.string().min(10),
        first_name: zod_1.z.string().min(1).max(50),
        last_name: zod_1.z.string().min(1).max(50),
        role: zod_1.z.enum(['client', 'artisan', 'admin']),
        email: zod_1.z.string().email().optional()
    })
});
exports.UpdateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        first_name: zod_1.z.string().min(1).max(50).optional(),
        last_name: zod_1.z.string().min(1).max(50).optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().min(10).max(15).optional()
    })
});
//# sourceMappingURL=user.model.js.map