"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Wallet, Play, Lock, Copy, Check, TrendingUp } from "lucide-react";
import { useAccount } from "wagmi";
import { getVideosByCreator, getUser } from "@/lib/api";
import type { Video, User } from "@/types/database";
import { useMintSubscription } from "@/lib/contracts/hooks";
import { parseEther } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";

export default function PublicProfilePage() {
    const router = useRouter();
    const params = useParams();
    const { address: viewerAddress } = useAccount();
    const { openConnectModal } = useConnectModal();
    const { mint, isPending, isConfirming, isSuccess } = useMintSubscription();

    const handleSubscribe = async () => {
        if (!profileUser?.subscription_contract_address || !profileUser?.subscription_price) return;

        if (!viewerAddress) {
            openConnectModal?.();
            return;
        }

        try {
            await mint(
                profileUser.subscription_contract_address as `0x${string}`,
                parseEther(profileUser.subscription_price.toString())
            );
        } catch (e) {
            console.error("Mint failed", e);
        }
    };

    // Safely get address from params
    const profileAddress = (typeof params?.address === 'string'
        ? params.address
        : Array.isArray(params?.address)
            ? params.address[0]
            : "").toLowerCase();

    const [videos, setVideos] = useState<Video[]>([]);
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"public" | "exclusive">("public");

    // Generate consistent random views based on wallet address
    const generateViewsFromAddress = (addr: string): number => {
        if (!addr) return Math.floor(Math.random() * 10000) + 1000;

        // Simple hash function to convert wallet address to a seed
        let hash = 0;
        for (let i = 0; i < addr.length; i++) {
            hash = ((hash << 5) - hash) + addr.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }

        // Use hash to generate a consistent random number between 1000 and 50000
        const absHash = Math.abs(hash);
        return (absHash % 49000) + 1000;
    };

    const mockViews = generateViewsFromAddress(profileAddress);

    useEffect(() => {
        if (profileAddress) {
            loadProfileData();
        }
    }, [profileAddress]);

    const loadProfileData = async () => {
        setIsLoading(true);
        try {
            const [videosData, userData] = await Promise.all([
                getVideosByCreator(profileAddress),
                getUser(profileAddress)
            ]);
            setVideos(videosData);
            setProfileUser(userData);
        } catch (e) {
            console.error("Failed to load profile", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyAddress = async () => {
        await navigator.clipboard.writeText(profileAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const truncatedWallet = profileAddress
        ? `${profileAddress.slice(0, 6)}...${profileAddress.slice(-4)}`
        : "";

    return (
        <div className="min-h-screen bg-black pb-40">
            {/* Profile Header */}
            <div className="relative pt-8 pb-6 px-4">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#5F31E8]/30 to-transparent" />

                <div className="relative flex flex-col items-center">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5F31E8] to-[#7C4DFF] flex items-center justify-center mb-4 ring-4 ring-black">
                        <span className="text-white text-2xl font-bold">
                            {profileAddress?.slice(2, 4).toUpperCase()}
                        </span>
                    </div>

                    {/* Wallet Address */}
                    <button
                        onClick={handleCopyAddress}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4 hover:bg-white/20 transition-colors"
                    >
                        <span className="text-white font-medium">{truncatedWallet}</span>
                        {copied ? (
                            <Check className="w-4 h-4 text-green-500" />
                        ) : (
                            <Copy className="w-4 h-4 text-white/60" />
                        )}
                    </button>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 mb-4">
                        <div className="text-center">
                            <p className="text-white font-bold text-xl">{videos.length}</p>
                            <p className="text-white/60 text-sm">Videos</p>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="text-center">
                            <p className="text-white font-bold text-xl">{mockViews.toLocaleString()}</p>
                            <p className="text-white/60 text-sm">Views</p>
                        </div>
                    </div>

                    {/* Subscription Info / Actions */}
                    {profileUser?.subscription_contract_address && (
                        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                <TrendingUp className="w-4 h-4 text-[#7C4DFF]" />
                                <span className="text-white text-sm">
                                    Sub Price: <span className="font-bold">{profileUser.subscription_price} MON</span>
                                </span>
                            </div>

                            {/* Subscribe Button (if not me) */}
                            {viewerAddress?.toLowerCase() !== profileAddress && (
                                <button
                                    onClick={handleSubscribe}
                                    disabled={isPending || isConfirming || isSuccess}
                                    className="w-full py-3 bg-[#5F31E8] hover:bg-[#7C4DFF] disabled:bg-[#5F31E8]/50 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-colors"
                                >
                                    {isPending || isConfirming ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Reading...
                                        </div>
                                    ) : isSuccess ? (
                                        "SUBSCRIBED"
                                    ) : (
                                        "SUBSCRIBE!"
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-white/10 mt-6 mb-4">
                <button
                    onClick={() => setActiveTab("public")}
                    className={`flex-1 py-3 text-sm font-medium relative ${activeTab === "public" ? "text-white" : "text-white/40"
                        }`}
                >
                    Public
                    {activeTab === "public" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5F31E8]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("exclusive")}
                    className={`flex-1 py-3 text-sm font-medium relative flex items-center justify-center gap-2 ${activeTab === "exclusive" ? "text-white" : "text-white/40"
                        }`}
                >
                    <Lock className="w-3 h-3" />
                    Exclusive
                    {activeTab === "exclusive" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5F31E8]" />
                    )}
                </button>
            </div>

            {/* Videos Grid */}
            <div className="px-4">
                {isLoading ? (
                    <div className="grid grid-cols-3 gap-1">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="aspect-[9/16] bg-white/10 rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                ) : activeTab === "public" ? (
                    // PUBLIC VIDEOS
                    videos.filter((v) => !v.is_exclusive).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                                <Play className="w-8 h-8 text-white/40" />
                            </div>
                            <p className="text-white/60 text-center mb-4">No public videos</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1">
                            {videos
                                .filter((v) => !v.is_exclusive)
                                .map((video) => (
                                    <div
                                        key={video.id}
                                        className="relative aspect-[9/16] bg-white/10 rounded-lg overflow-hidden group cursor-pointer"
                                        onClick={() => router.push(`/?video=${video.id}`)}
                                    >
                                        <video
                                            src={video.video_url}
                                            className="w-full h-full object-cover"
                                            muted
                                            preload="metadata"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )
                ) : (
                    // EXCLUSIVE VIDEOS
                    <div className="relative">
                        {videos.filter((v) => v.is_exclusive).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                                    <Lock className="w-8 h-8 text-white/40" />
                                </div>
                                <p className="text-white/60 text-center mb-4">No exclusive videos</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1">
                                {videos
                                    .filter((v) => v.is_exclusive)
                                    .map((video) => (
                                        <div
                                            key={video.id}
                                            className="relative aspect-[9/16] bg-white/10 rounded-lg overflow-hidden group cursor-pointer"
                                            onClick={() => router.push(`/?video=${video.id}`)}
                                        >
                                            <video
                                                src={video.video_url}
                                                className="w-full h-full object-cover opacity-50"
                                                muted
                                                preload="metadata"
                                            />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <Lock className="w-6 h-6 text-white mb-1" />
                                                <span className="text-[10px] text-white/80 font-medium">
                                                    {video.price} MON
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
