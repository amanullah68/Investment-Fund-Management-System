export type FundMetrics = {
  totalAssetValue: Number;
  sharesSupply: Number;
  lastUpdateTime: Date;
  cacheStatus?: "fresh" | "stale";
};
