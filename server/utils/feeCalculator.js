/**
 * Fee calculation utility for escrow transactions
 */

// Base platform fee percentage
const PLATFORM_FEE_PERCENTAGE = 0.05; // 5%

// Base processing fee percentage
const PROCESSING_FEE_PERCENTAGE = 0.029; // 2.9%

// Fixed processing fee
const FIXED_PROCESSING_FEE = 0.30; // $0.30

// Maximum platform fee
const MAX_PLATFORM_FEE = 5000; // $5000

// Fee tiers for platform fee adjustments
const FEE_TIERS = [
  { min: 0, max: 500, percentage: 0.05 },      // 5% for amounts up to $500
  { min: 500, max: 2500, percentage: 0.045 },  // 4.5% for $501-$2500
  { min: 2500, max: 10000, percentage: 0.04 }, // 4% for $2501-$10000
  { min: 10000, max: Infinity, percentage: 0.035 }  // 3.5% for $10000+
];

/**
 * Calculate platform fee based on amount and tier structure
 * @param {number} amount - Transaction amount
 * @returns {number} Calculated platform fee
 */
export const calculatePlatformFee = (amount) => {
  let remainingAmount = amount;
  let totalFee = 0;

  for (const tier of FEE_TIERS) {
    if (remainingAmount <= 0) break;

    const tierRange = tier.max - tier.min;
    const amountInTier = Math.min(remainingAmount, tierRange);
    const tierFee = amountInTier * tier.percentage;

    totalFee += tierFee;
    remainingAmount -= amountInTier;
  }

  // Cap the platform fee at MAX_PLATFORM_FEE
  return Math.min(totalFee, MAX_PLATFORM_FEE);
};

/**
 * Calculate processing fee based on amount
 * @param {number} amount - Transaction amount
 * @returns {number} Calculated processing fee
 */
export const calculateProcessingFee = (amount) => {
  return (amount * PROCESSING_FEE_PERCENTAGE) + FIXED_PROCESSING_FEE;
};

/**
 * Calculate all fees for a transaction
 * @param {number} amount - Base transaction amount
 * @param {object} options - Optional configuration
 * @returns {object} Calculated fees and totals
 */
export const calculateFees = (amount, options = {}) => {
  const {
    includePlatformFee = true,
    includeProcessingFee = true,
    customPlatformFeePercentage,
    customProcessingFeePercentage
  } = options;

  let platformFee = 0;
  let processingFee = 0;

  if (includePlatformFee) {
    if (customPlatformFeePercentage) {
      platformFee = amount * customPlatformFeePercentage;
    } else {
      platformFee = calculatePlatformFee(amount);
    }
  }

  if (includeProcessingFee) {
    if (customProcessingFeePercentage) {
      processingFee = (amount * customProcessingFeePercentage) + FIXED_PROCESSING_FEE;
    } else {
      processingFee = calculateProcessingFee(amount);
    }
  }

  // Round all amounts to 2 decimal places
  const roundedPlatformFee = Math.round(platformFee * 100) / 100;
  const roundedProcessingFee = Math.round(processingFee * 100) / 100;
  const totalFees = roundedPlatformFee + roundedProcessingFee;
  const totalAmount = Math.round((amount + totalFees) * 100) / 100;

  return {
    baseAmount: amount,
    platformFee: roundedPlatformFee,
    processingFee: roundedProcessingFee,
    totalFees,
    totalAmount
  };
};

/**
 * Get fee breakdown details
 * @param {number} amount - Transaction amount
 * @returns {object} Detailed fee breakdown
 */
export const getFeeBreakdown = (amount) => {
  const fees = calculateFees(amount);
  const platformFeePercentage = (fees.platformFee / amount) * 100;
  const processingFeePercentage = (fees.processingFee / amount) * 100;
  const totalFeePercentage = (fees.totalFees / amount) * 100;

  return {
    ...fees,
    platformFeePercentage,
    processingFeePercentage,
    totalFeePercentage,
    platformFeeStructure: FEE_TIERS,
    fixedProcessingFee: FIXED_PROCESSING_FEE,
    processingFeePercentageBase: PROCESSING_FEE_PERCENTAGE * 100
  };
};

export default {
  calculateFees,
  calculatePlatformFee,
  calculateProcessingFee,
  getFeeBreakdown,
  PLATFORM_FEE_PERCENTAGE,
  PROCESSING_FEE_PERCENTAGE,
  FIXED_PROCESSING_FEE,
  MAX_PLATFORM_FEE,
  FEE_TIERS
};
