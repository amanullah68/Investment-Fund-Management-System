import { ethers } from "ethers";

export const sanitizeAddress = (address: string): string => {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return ethers.getAddress(address);
};

export const validateAddress = (address: unknown): address is `0x${string}` => {
  return typeof address === "string" && ethers.isAddress(address);
};
