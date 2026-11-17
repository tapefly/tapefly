import { createPublicClient, encodeFunctionData, formatEther, formatUnits, http, parseEther } from "viem";
import { xLayer } from "viem/chains";
import { BEM, BEM_ABI, CHAIN_RPC, FACTORY, FACTORY_ABI } from "../sim/onchain";

const operator = (process.env.XLAYER_OPERATOR ?? "0x3f665386b41fa15c5cccee983050a236e6a10108") as `0x${string}`;
const client = createPublicClient({ chain: xLayer, transport: http(CHAIN_RPC) });

async function main() {
  const [fee, count, decimals, bemBalance, allowance, okb] = await Promise.all([
    client.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "deployFee" }) as Promise<bigint>,
    client.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "cpuCount" }) as Promise<bigint>,
    client.readContract({ address: BEM, abi: BEM_ABI, functionName: "decimals" }) as Promise<number>,
    client.readContract({ address: BEM, abi: BEM_ABI, functionName: "balanceOf", args: [operator] }) as Promise<bigint>,
    client.readContract({ address: BEM, abi: BEM_ABI, functionName: "allowance", args: [operator, FACTORY] }) as Promise<bigint>,
    client.getBalance({ address: operator })
  ]);

  const args = [
    "TapeFly",
    "FLY",
    "TapeFly: a fruit fly whose brain is a circuit of NAND gates. Independent project on X Layer. Players build deterministic brains, compare them, and tape the best ones out here.",
    1000000n,
    parseEther("0.000001")
  ] as const;

  const result: Record<string, unknown> = {
    chainId: 196,
    operator,
    factory: FACTORY,
    bem: BEM,
    processorCount: count.toString(),
    deployFee: `${formatUnits(fee, decimals)} BEM`,
    operatorBem: formatUnits(bemBalance, decimals),
    allowance: formatUnits(allowance, decimals),
    operatorOkb: formatEther(okb),
    enoughBem: bemBalance >= fee,
    approved: allowance >= fee,
    next: bemBalance < fee
      ? "Acquire at least 0.1 BEM on X Layer"
      : allowance < fee
        ? "Approve 0.1 BEM to the factory"
        : "Simulate createCPU"
  };

  if (allowance >= fee && bemBalance >= fee) {
    const simulation = await client.simulateContract({
      account: operator,
      address: FACTORY,
      abi: FACTORY_ABI,
      functionName: "createCPU",
      args,
      value: 0n
    });
    const gas = await client.estimateGas({
      account: operator,
      to: FACTORY,
      data: encodeFunctionData({ abi: FACTORY_ABI, functionName: "createCPU", args }),
      value: 0n
    });
    result.predictedTransistors = simulation.result[0];
    result.predictedProcessor = simulation.result[1];
    result.estimatedGas = gas.toString();
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
