import { PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

export abstract class BaseEntity {
  @PrimaryColumn("varchar", { length: 66 })
  transaction_hash!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
