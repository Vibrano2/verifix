"use strict";
/**
 * Trades Constants
 * Locked trade taxonomy (24 trades across 6 categories)
 * Per PRD Section 7.4 - validate server-side, reject anything outside this list
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TRADES = exports.TRADE_CATEGORY_MAP = exports.Trade = exports.TradeCategory = void 0;
exports.getCategoryForTrade = getCategoryForTrade;
exports.isValidTrade = isValidTrade;
exports.getTradesByCategory = getTradesByCategory;
var TradeCategory;
(function (TradeCategory) {
    TradeCategory["HOME_MAINTENANCE"] = "Home Maintenance & Repair";
    TradeCategory["VEHICLE"] = "Vehicle";
    TradeCategory["HOME_SERVICES"] = "Home Services";
    TradeCategory["PERSONAL_CARE"] = "Personal Care";
    TradeCategory["PROFESSIONAL_CARE"] = "Professional/Care";
    TradeCategory["EVENTS"] = "Events";
})(TradeCategory || (exports.TradeCategory = TradeCategory = {}));
var Trade;
(function (Trade) {
    // Home Maintenance & Repair
    Trade["ELECTRICIAN"] = "Electrician";
    Trade["PLUMBER"] = "Plumber";
    Trade["CARPENTER"] = "Carpenter";
    Trade["AC_TECHNICIAN"] = "AC technician";
    Trade["GENERATOR_REPAIRER"] = "Generator repairer";
    Trade["BOREHOLE_REPAIR_TECH"] = "Borehole repair technician";
    Trade["WELDER"] = "Welder";
    Trade["TILER"] = "Tiler";
    Trade["POP"] = "PoP";
    Trade["ALUMINIUM_FABRICATOR"] = "Aluminium fabricator";
    // Vehicle
    Trade["MECHANIC"] = "Mechanic";
    // Home Services
    Trade["HOME_CLEANER"] = "Home cleaner";
    Trade["LAUNDRY_SERVICE"] = "Laundry service";
    Trade["MOVER"] = "Mover";
    Trade["GARDENER"] = "Gardener";
    Trade["CCTV_INSTALLER"] = "CCTV installer";
    // Personal Care
    Trade["BARBER"] = "Barber";
    Trade["HAIRDRESSER"] = "Hairdresser";
    Trade["MAKEUP_ARTIST"] = "Makeup artist";
    Trade["TAILOR"] = "Tailor";
    // Professional/Care
    Trade["TUTOR"] = "Tutor";
    Trade["NURSE"] = "Nurse";
    Trade["CAREGIVER"] = "Caregiver";
    // Events
    Trade["EVENT_PHOTOGRAPHER"] = "Event photographer";
    Trade["PAINTER"] = "Painter";
})(Trade || (exports.Trade = Trade = {}));
/**
 * Trade to Category mapping
 */
exports.TRADE_CATEGORY_MAP = {
    // Home Maintenance & Repair
    [Trade.ELECTRICIAN]: TradeCategory.HOME_MAINTENANCE,
    [Trade.PLUMBER]: TradeCategory.HOME_MAINTENANCE,
    [Trade.CARPENTER]: TradeCategory.HOME_MAINTENANCE,
    [Trade.AC_TECHNICIAN]: TradeCategory.HOME_MAINTENANCE,
    [Trade.GENERATOR_REPAIRER]: TradeCategory.HOME_MAINTENANCE,
    [Trade.BOREHOLE_REPAIR_TECH]: TradeCategory.HOME_MAINTENANCE,
    [Trade.WELDER]: TradeCategory.HOME_MAINTENANCE,
    [Trade.TILER]: TradeCategory.HOME_MAINTENANCE,
    [Trade.POP]: TradeCategory.HOME_MAINTENANCE,
    [Trade.ALUMINIUM_FABRICATOR]: TradeCategory.HOME_MAINTENANCE,
    // Vehicle
    [Trade.MECHANIC]: TradeCategory.VEHICLE,
    // Home Services
    [Trade.HOME_CLEANER]: TradeCategory.HOME_SERVICES,
    [Trade.LAUNDRY_SERVICE]: TradeCategory.HOME_SERVICES,
    [Trade.MOVER]: TradeCategory.HOME_SERVICES,
    [Trade.GARDENER]: TradeCategory.HOME_SERVICES,
    [Trade.CCTV_INSTALLER]: TradeCategory.HOME_SERVICES,
    // Personal Care
    [Trade.BARBER]: TradeCategory.PERSONAL_CARE,
    [Trade.HAIRDRESSER]: TradeCategory.PERSONAL_CARE,
    [Trade.MAKEUP_ARTIST]: TradeCategory.PERSONAL_CARE,
    [Trade.TAILOR]: TradeCategory.PERSONAL_CARE,
    // Professional/Care
    [Trade.TUTOR]: TradeCategory.PROFESSIONAL_CARE,
    [Trade.NURSE]: TradeCategory.PROFESSIONAL_CARE,
    [Trade.CAREGIVER]: TradeCategory.PROFESSIONAL_CARE,
    // Events
    [Trade.EVENT_PHOTOGRAPHER]: TradeCategory.EVENTS,
    [Trade.PAINTER]: TradeCategory.EVENTS
};
/**
 * All valid trade values (for validation)
 */
exports.VALID_TRADES = Object.values(Trade);
/**
 * Get category for a given trade
 */
function getCategoryForTrade(trade) {
    return exports.TRADE_CATEGORY_MAP[trade];
}
/**
 * Validate if a trade string is valid
 */
function isValidTrade(trade) {
    return exports.VALID_TRADES.includes(trade);
}
/**
 * Get all trades for a specific category
 */
function getTradesByCategory(category) {
    return Object.entries(exports.TRADE_CATEGORY_MAP)
        .filter(([_, cat]) => cat === category)
        .map(([trade]) => trade);
}
//# sourceMappingURL=trades.js.map