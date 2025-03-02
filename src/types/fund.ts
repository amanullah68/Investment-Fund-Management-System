// src/types/fund.ts
export type FundMetrics = {
  totalAssetValue: string;
  sharesSupply: string;
  lastUpdateTime: string;
  cacheStatus?: "fresh" | "stale";
};
