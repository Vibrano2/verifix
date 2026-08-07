/**
 * Trades Constants
 * Locked trade taxonomy (24 trades across 6 categories)
 * Per PRD Section 7.4 - validate server-side, reject anything outside this list
 */

export enum TradeCategory {
  HOME_MAINTENANCE = 'Home Maintenance & Repair',
  VEHICLE = 'Vehicle',
  HOME_SERVICES = 'Home Services',
  PERSONAL_CARE = 'Personal Care',
  PROFESSIONAL_CARE = 'Professional/Care',
  EVENTS = 'Events'
}

export enum Trade {
  // Home Maintenance & Repair
  ELECTRICIAN = 'Electrician',
  PLUMBER = 'Plumber',
  CARPENTER = 'Carpenter',
  AC_TECHNICIAN = 'AC technician',
  GENERATOR_REPAIRER = 'Generator repairer',
  BOREHOLE_REPAIR_TECH = 'Borehole repair technician',
  WELDER = 'Welder',
  TILER = 'Tiler',
  POP = 'PoP',
  ALUMINIUM_FABRICATOR = 'Aluminium fabricator',
  
  // Vehicle
  MECHANIC = 'Mechanic',
  
  // Home Services
  HOME_CLEANER = 'Home cleaner',
  LAUNDRY_SERVICE = 'Laundry service',
  MOVER = 'Mover',
  GARDENER = 'Gardener',
  CCTV_INSTALLER = 'CCTV installer',
  
  // Personal Care
  BARBER = 'Barber',
  HAIRDRESSER = 'Hairdresser',
  MAKEUP_ARTIST = 'Makeup artist',
  TAILOR = 'Tailor',
  
  // Professional/Care
  TUTOR = 'Tutor',
  NURSE = 'Nurse',
  CAREGIVER = 'Caregiver',
  
  // Events
  EVENT_PHOTOGRAPHER = 'Event photographer',
  PAINTER = 'Painter'
}

/**
 * Trade to Category mapping
 */
export const TRADE_CATEGORY_MAP: Record<Trade, TradeCategory> = {
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
export const VALID_TRADES: ReadonlyArray<string> = Object.values(Trade);

/**
 * Get category for a given trade
 */
export function getCategoryForTrade(trade: Trade): TradeCategory {
  return TRADE_CATEGORY_MAP[trade];
}

/**
 * Validate if a trade string is valid
 */
export function isValidTrade(trade: string): trade is Trade {
  return VALID_TRADES.includes(trade);
}

/**
 * Get all trades for a specific category
 */
export function getTradesByCategory(category: TradeCategory): Trade[] {
  return Object.entries(TRADE_CATEGORY_MAP)
    .filter(([_, cat]) => cat === category)
    .map(([trade]) => trade as Trade);
}
