import { Entity, Column } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { TransactionType } from "../types/transaction.type.js";

@Entity({ name: "investor_transactions" })
export class InvestorTransaction extends BaseEntity {
  @Column({ type: "varchar", length: 42 })
  investor_address!: string;

  @Column({ type: "enum", enum: TransactionType })
  transaction_type!: TransactionType;

  @Column({ type: "numeric", precision: 20, scale: 6 })
  usd_amount!: number;

  @Column({ type: "integer" })
  shares_issued!: number;

  @Column({ type: "numeric", precision: 20, scale: 6 })
  share_price!: number;

  @Column({ type: "timestamptz" })
  transaction_timestamp!: Date;
}
