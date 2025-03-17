import { ethers } from "ethers";

export const sanitizeAddress = (address: string): string => {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return ethers.getAddress(address);
};
