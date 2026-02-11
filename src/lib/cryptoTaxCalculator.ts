/**
 * Crypto Tax Calculator
 * 
 * Calculates capital gains tax on cryptocurrency transactions using FIFO cost basis.
 * Also handles income from mining/staking activities.
 */

import { parseNgnToKobo, mulKoboByRate, subKobo, addKobo, koboToString, stringToKobo, formatKoboToNgn, isZeroKobo } from "@/lib/money";

export interface CryptoTransaction {
  id: string;
  transaction_type: "buy" | "sell" | "trade" | "mining" | "staking" | "airdrop" | "gift";
  asset_symbol: string;
  amount: number;
  price_ngn_kobo: string;
  total_ngn_kobo: string;
  transaction_date: string;
  cost_basis_kobo?: string;
}

export interface CryptoTaxResult {
  totalCapitalGainsKobo: bigint;
  totalMiningIncomeKobo: bigint;
  totalStakingIncomeKobo: bigint;
  totalAirdropIncomeKobo: bigint;
  cgtPayableKobo: bigint;
  pitOnIncomeKobo: bigint;
  totalTaxPayableKobo: bigint;
  effectiveRate: number;
  transactions: Array<{
    id: string;
    type: string;
    asset: string;
    gainOrLossKobo: bigint;
    isGain: boolean;
  }>;
}

const CGT_RATE = 0.10; // 10% capital gains tax

/**
 * Calculate cost basis using FIFO method
 */
function calculateFIFOCostBasis(
  transactions: CryptoTransaction[],
  asset: string
): Map<string, { amount: number; costBasisKobo: bigint }[]> {
  const holdings = new Map<string, { amount: number; costBasisKobo: bigint }[]>();
  
  // Sort by date
  const sorted = [...transactions]
    .filter(t => t.asset_symbol === asset)
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  for (const tx of sorted) {
    if (tx.transaction_type === "buy") {
      const existing = holdings.get(tx.asset_symbol) || [];
      existing.push({
        amount: tx.amount,
        costBasisKobo: stringToKobo(tx.total_ngn_kobo),
      });
      holdings.set(tx.asset_symbol, existing);
    }
  }

  return holdings;
}

/**
 * Calculate capital gains using FIFO
 */
export function calculateCryptoTax(transactions: CryptoTransaction[]): CryptoTaxResult {
  let totalCapitalGainsKobo = 0n;
  let totalMiningIncomeKobo = 0n;
  let totalStakingIncomeKobo = 0n;
  let totalAirdropIncomeKobo = 0n;
  
  const transactionResults: CryptoTaxResult["transactions"] = [];
  
  // Group by asset
  const assetSet = new Set(transactions.map(t => t.asset_symbol));
  
  for (const asset of assetSet) {
    // Get all buys for this asset (sorted by date)
    const buys = transactions
      .filter(t => t.asset_symbol === asset && t.transaction_type === "buy")
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    
    // Create a copy of buy lots for FIFO processing
    const buyLots = buys.map(b => ({
      remainingAmount: b.amount,
      pricePerUnit: b.amount > 0 ? stringToKobo(b.total_ngn_kobo) / BigInt(Math.round(b.amount * 100)) * 100n : 0n,
    }));
    
    // Process sells
    const sells = transactions
      .filter(t => t.asset_symbol === asset && t.transaction_type === "sell")
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    
    for (const sell of sells) {
      let remainingToSell = sell.amount;
      let totalCostBasis = 0n;
      
      // FIFO: use oldest lots first
      for (const lot of buyLots) {
        if (remainingToSell <= 0 || lot.remainingAmount <= 0) continue;
        
        const amountFromThisLot = Math.min(lot.remainingAmount, remainingToSell);
        const costBasisForAmount = lot.pricePerUnit * BigInt(Math.round(amountFromThisLot * 100)) / 100n;
        
        totalCostBasis = addKobo(totalCostBasis, costBasisForAmount);
        lot.remainingAmount -= amountFromThisLot;
        remainingToSell -= amountFromThisLot;
      }
      
      const saleProceeds = stringToKobo(sell.total_ngn_kobo);
      const gainOrLoss = subKobo(saleProceeds, totalCostBasis);
      const isGain = gainOrLoss >= 0n;
      
      // Only positive gains are taxable
      if (isGain) {
        totalCapitalGainsKobo = addKobo(totalCapitalGainsKobo, gainOrLoss);
      }
      
      transactionResults.push({
        id: sell.id,
        type: "sell",
        asset,
        gainOrLossKobo: gainOrLoss >= 0n ? gainOrLoss : -gainOrLoss,
        isGain,
      });
    }
    
    // Process income transactions (mining, staking, airdrops)
    for (const tx of transactions.filter(t => t.asset_symbol === asset)) {
      switch (tx.transaction_type) {
        case "mining":
          totalMiningIncomeKobo = addKobo(totalMiningIncomeKobo, stringToKobo(tx.total_ngn_kobo));
          transactionResults.push({
            id: tx.id,
            type: "mining",
            asset,
            gainOrLossKobo: stringToKobo(tx.total_ngn_kobo),
            isGain: true,
          });
          break;
        case "staking":
          totalStakingIncomeKobo = addKobo(totalStakingIncomeKobo, stringToKobo(tx.total_ngn_kobo));
          transactionResults.push({
            id: tx.id,
            type: "staking",
            asset,
            gainOrLossKobo: stringToKobo(tx.total_ngn_kobo),
            isGain: true,
          });
          break;
        case "airdrop":
          totalAirdropIncomeKobo = addKobo(totalAirdropIncomeKobo, stringToKobo(tx.total_ngn_kobo));
          transactionResults.push({
            id: tx.id,
            type: "airdrop",
            asset,
            gainOrLossKobo: stringToKobo(tx.total_ngn_kobo),
            isGain: true,
          });
          break;
      }
    }
  }
  
  // Calculate taxes
  const cgtPayableKobo = mulKoboByRate(totalCapitalGainsKobo, CGT_RATE);
  
  // Mining/staking income is treated as ordinary income for PIT purposes
  // Using simplified top marginal rate of 24%
  const totalOtherIncome = addKobo(addKobo(totalMiningIncomeKobo, totalStakingIncomeKobo), totalAirdropIncomeKobo);
  const pitOnIncomeKobo = mulKoboByRate(totalOtherIncome, 0.24);
  
  const totalTaxPayableKobo = addKobo(cgtPayableKobo, pitOnIncomeKobo);
  
  // Calculate effective rate
  const totalProceedsKobo = addKobo(totalCapitalGainsKobo, totalOtherIncome);
  const effectiveRate = !isZeroKobo(totalProceedsKobo) 
    ? Number(totalTaxPayableKobo * 10000n / totalProceedsKobo) / 100
    : 0;
  
  return {
    totalCapitalGainsKobo,
    totalMiningIncomeKobo,
    totalStakingIncomeKobo,
    totalAirdropIncomeKobo,
    cgtPayableKobo,
    pitOnIncomeKobo,
    totalTaxPayableKobo,
    effectiveRate,
    transactions: transactionResults,
  };
}

/**
 * Format result for display
 */
export function formatCryptoTaxResult(result: CryptoTaxResult) {
  return {
    totalCapitalGains: formatKoboToNgn(result.totalCapitalGainsKobo),
    totalMiningIncome: formatKoboToNgn(result.totalMiningIncomeKobo),
    totalStakingIncome: formatKoboToNgn(result.totalStakingIncomeKobo),
    totalAirdropIncome: formatKoboToNgn(result.totalAirdropIncomeKobo),
    cgtPayable: formatKoboToNgn(result.cgtPayableKobo),
    pitOnIncome: formatKoboToNgn(result.pitOnIncomeKobo),
    totalTaxPayable: formatKoboToNgn(result.totalTaxPayableKobo),
    effectiveRate: result.effectiveRate.toFixed(2) + "%",
  };
}
