// src/entities/FundMetric.ts
import { Entity, Column } from "typeorm";
import { BaseEntity } from "./base.entity.js";

@Entity({ name: "fund_metrics" })
export class FundMetric extends BaseEntity {
  // Must extend BaseEntity
  @Column({ type: "numeric", precision: 30, scale: 6 })
  total_asset_value!: number;

  @Column({ type: "integer" })
  shares_supply!: number; // Fixed typo from "shares_suplly"

  @Column({ type: "numeric", precision: 20, scale: 6 })
  share_price!: number;

  @Column({ type: "timestamptz" })
  metric_timestamp!: Date;
}
