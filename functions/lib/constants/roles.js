"use strict";
/**
 * User Roles
 * Centralized role constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidRole = exports.ROLES = void 0;
exports.ROLES = {
    CLIENT: 'client',
    ARTISAN: 'artisan',
    ADMIN: 'admin'
};
/**
 * Check if a role is valid
 */
const isValidRole = (role) => {
    return Object.values(exports.ROLES).includes(role);
};
exports.isValidRole = isValidRole;
//# sourceMappingURL=roles.js.map