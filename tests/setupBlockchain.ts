import ganache from "ganache";

let ganacheServer: any;

export const startGanache = async (): Promise<void> => {
  ganacheServer = ganache.server({ 
    logging: { quiet: true },
    wallet: {
      accounts: [{
        secretKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        balance: "0x3635C9ADC5DEA00000" // 1000 ETH in hex (wei)
      }]
    }
  });
  
  await new Promise<void>((resolve, reject) => {
    ganacheServer.listen(8545, (err: Error | null) => (err ? reject(err) : resolve()));
  });
  
  process.env.RPC_URL = "http://localhost:8545";
};

export const stopGanache = async (): Promise<void> => {
  if (ganacheServer) {
    await ganacheServer.close();
  }
};