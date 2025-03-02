export const FundTokenABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "investor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "usdAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sharesIssued",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sharePrice",
        type: "uint256",
      },
    ],
    name: "Investment",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "totalAssetValue",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sharesSupply",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sharePrice",
        type: "uint256",
      },
    ],
    name: "MetricsUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "investor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "usdAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sharePrice",
        type: "uint256",
      },
    ],
    name: "Redemption",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "investor",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFundMetrics",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "totalAssetValue",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "sharesSupply",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "lastUpdateTime",
            type: "uint256",
          },
        ],
        internalType: "struct IFundToken.FundMetrics",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSharePrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "investor",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "usdAmount",
        type: "uint256",
      },
    ],
    name: "invest",
    outputs: [
      {
        internalType: "uint256",
        name: "sharesIssued",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "investor",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
    ],
    name: "redeem",
    outputs: [
      {
        internalType: "uint256",
        name: "usdAmount",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
