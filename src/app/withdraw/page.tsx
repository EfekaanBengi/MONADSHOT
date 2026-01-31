"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Users, Wallet, Check, AlertCircle, ExternalLink } from "lucide-react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getUser } from "@/lib/api";
import { CreatorNFTABI } from "@/lib/contracts/abis";
import type { User } from "@/types/database";

interface Subscriber {
    address: string;
    tokenId: number;
}

export default function WithdrawPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();

    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Get user data to find contract address
    useEffect(() => {
        async function loadUser() {
            if (address) {
                const userData = await getUser(address);
                setUser(userData);
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        }
        loadUser();
    }, [address]);

    // Contract Address
    const contractAddress = user?.subscription_contract_address as `0x${string}` | undefined;

    // Get Balance
    const { data: balanceData, refetch: refetchBalance } = useBalance({
        address: contractAddress,
    });

    // Withdraw Hook
    const { writeContractAsync, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    // Watch for success
    useEffect(() => {
        if (isSuccess) {
            refetchBalance(); // Update balance
            setIsWithdrawing(false);
        }
    }, [isSuccess, refetchBalance]);

    // 1. Get Total Supply
    const { data: totalSupply } = useReadContract({
        address: contractAddress,
        abi: CreatorNFTABI,
        functionName: "totalSupply",
        query: {
            enabled: !!contractAddress,
        }
    });

    // 2. Prepare calls for ownerOf loop
    const tokenIds = useMemo(() => {
        if (!totalSupply) return [];
        try {
            const count = Number(totalSupply);
            return Array.from({ length: count }, (_, i) => BigInt(i + 1));
        } catch {
            return [];
        }
    }, [totalSupply]);

    // 3. Fetch Owners via Multicall
    const { data: owners } = useReadContracts({
        contracts: tokenIds.map((id) => ({
            address: contractAddress,
            abi: CreatorNFTABI,
            functionName: "ownerOf",
            args: [id],
        })),
        query: {
            enabled: tokenIds.length > 0,
        }
    });

    // 4. Combine into Subscriber list
    const subscribers: Subscriber[] = useMemo(() => {
        if (!owners || owners.length === 0) return [];

        return owners
            .map((result, index) => {
                if (result.status === "success" && result.result) {
                    return {
                        tokenId: index + 1,
                        address: result.result as string,
                    };
                }
                return null;
            })
            .filter((sub): sub is Subscriber => sub !== null)
            .sort((a, b) => b.tokenId - a.tokenId); // Newest first
    }, [owners]);


    const handleWithdraw = async () => {
        if (!contractAddress) return;
        setIsWithdrawing(true);
        try {
            await writeContractAsync({
                address: contractAddress,
                abi: CreatorNFTABI,
                functionName: "withdraw",
            });
        } catch (e) {
            console.error("Withdraw failed", e);
            setIsWithdrawing(false);
        }
    };

    // Not Connected
    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-center px-4">
                <Wallet className="w-12 h-12 text-[#5F31E8] mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Connect Wallet</h1>
                <button
                    onClick={() => openConnectModal?.()}
                    className="px-6 py-3 bg-[#5F31E8] rounded-full text-white font-bold"
                >
                    Connect
                </button>
            </div>
        );
    }

    // Loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="w-8 h-8 border-2 border-[#5F31E8] border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    // No Subscription
    if (!user?.subscription_contract_address) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-center px-4">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">No Subscription Found</h1>
                <p className="text-white/60 mb-6">You haven't created a subscription yet.</p>
                <button
                    onClick={() => router.push("/create-subscription")}
                    className="px-6 py-3 bg-[#5F31E8] rounded-full text-white font-bold"
                >
                    Create Subscription
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pb-40 pt-4 px-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-white/50 hover:text-white">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-white ml-2">Earnings & Subscribers</h1>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#5F31E8] to-[#7C4DFF] rounded-2xl p-6 mb-8 shadow-lg shadow-[#5F31E8]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="w-24 h-24 text-white" />
                </div>

                <p className="text-white/80 font-medium mb-1">Total Balance</p>
                <h2 className="text-4xl font-bold text-white mb-6">
                    {balanceData ? parseFloat(formatEther(balanceData.value)).toFixed(4) : "0.0000"} <span className="text-2xl">MON</span>
                </h2>

                <button
                    onClick={handleWithdraw}
                    disabled={!balanceData || balanceData.value === 0n || isPending || isConfirming || isWithdrawing}
                    className="w-full py-3 bg-white text-[#5F31E8] rounded-xl font-bold font-lg flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending || isConfirming ? (
                        <>
                            <div className="w-4 h-4 border-2 border-[#5F31E8] border-t-transparent rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : isSuccess ? (
                        <>
                            <Check className="w-5 h-5" />
                            Withdrawn!
                        </>
                    ) : (
                        <>
                            <Wallet className="w-5 h-5" />
                            Withdraw Funds
                        </>
                    )}
                </button>
            </div>

            {/* Subscribers Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-[#7C4DFF]">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-bold">Total Subs</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{totalSupply?.toString() || "0"}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-green-500">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-bold">Price</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{user.subscription_price} MON</p>
                </div>
            </div>

            {/* Subscribers List */}
            <h3 className="text-white font-bold text-lg mb-4">Recent Subscribers</h3>

            {subscribers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-xl border border-white/10">
                    <Users className="w-12 h-12 text-white/20 mb-3" />
                    <p className="text-white/40">No subscribers yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {subscribers.map((sub) => (
                        <div key={sub.tokenId} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-black">
                                    {sub.address.slice(2, 4).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white font-medium font-mono text-sm">
                                        {sub.address.slice(0, 6)}...{sub.address.slice(-4)}
                                    </p>
                                    <p className="text-white/40 text-xs">Token ID #{sub.tokenId}</p>
                                </div>
                            </div>

                            <a
                                href={`https://testnet.monadexplorer.com/address/${sub.address}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-white/40 hover:text-white transition-colors"
                                title="View on Explorer"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
