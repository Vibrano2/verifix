"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.URGENCY_VALUES = exports.LOCKED_TRADES = void 0;
exports.getCategoryFromTrade = getCategoryFromTrade;
// Locked trade enum
exports.LOCKED_TRADES = [
    // Home Maintenance & Repair
    'Electricians',
    'Plumbers',
    'Carpenters',
    'AC technicians',
    'Generator repairers',
    'Borehole repair technicians',
    'Welders',
    'Tilers',
    'PoP',
    'Aluminium fabricators',
    // Vehicle
    'Mechanics',
    // Home Services
    'Home cleaners',
    'Laundry services',
    'Movers',
    'Gardeners',
    'CCTV installers',
    // Personal Care
    'Barbers',
    'Hairdressers',
    'Makeup artists',
    'Tailors',
    // Professional/Care
    'Tutors',
    'Nurses',
    'Caregivers',
    // Events
    'Event photographers',
    'Painters',
];
// Urgency enum
exports.URGENCY_VALUES = ['Today', 'This Week', 'Flexible'];
// Helper function to get category from trade
function getCategoryFromTrade(trade) {
    const categoryMap = {
        'Electricians': 'Home Maintenance & Repair',
        'Plumbers': 'Home Maintenance & Repair',
        'Carpenters': 'Home Maintenance & Repair',
        'AC technicians': 'Home Maintenance & Repair',
        'Generator repairers': 'Home Maintenance & Repair',
        'Borehole repair technicians': 'Home Maintenance & Repair',
        'Welders': 'Home Maintenance & Repair',
        'Tilers': 'Home Maintenance & Repair',
        'PoP': 'Home Maintenance & Repair',
        'Aluminium fabricators': 'Home Maintenance & Repair',
        'Mechanics': 'Vehicle',
        'Home cleaners': 'Home Services',
        'Laundry services': 'Home Services',
        'Movers': 'Home Services',
        'Gardeners': 'Home Services',
        'CCTV installers': 'Home Services',
        'Barbers': 'Personal Care',
        'Hairdressers': 'Personal Care',
        'Makeup artists': 'Personal Care',
        'Tailors': 'Personal Care',
        'Tutors': 'Professional/Care',
        'Nurses': 'Professional/Care',
        'Caregivers': 'Professional/Care',
        'Event photographers': 'Events',
        'Painters': 'Events',
    };
    return categoryMap[trade];
}
//# sourceMappingURL=index.js.map