"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Play, Lock, LogOut, Copy, Check, TrendingUp, Trash } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getVideosByCreator, deleteVideo } from "@/lib/api";
import type { Video } from "@/types/database";

export default function ProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"public" | "exclusive">("public");

  // Generate consistent random views based on wallet address
  const generateViewsFromAddress = (addr: string | undefined): number => {
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

  const mockViews = generateViewsFromAddress(address);

  useEffect(() => {
    if (address) {
      loadVideos();
    }
  }, [address]);

  const loadVideos = async () => {
    if (!address) return;
    setIsLoading(true);
    const data = await getVideosByCreator(address);
    setVideos(data);
    setIsLoading(false);
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e: React.MouseEvent, videoId: string, videoUrl: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this video?")) {
      const success = await deleteVideo(videoId, videoUrl);
      if (success) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
      } else {
        alert("Failed to delete video");
      }
    }
  };

  const truncatedWallet = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 pb-40">
        <div className="w-20 h-20 rounded-full bg-[#5F31E8]/20 flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-[#7C4DFF]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Connect Wallet</h1>
        <p className="text-white/60 text-center mb-8 max-w-xs">
          Connect your wallet to view your profile and uploaded videos
        </p>
        <button
          onClick={() => openConnectModal?.()}
          className="px-8 py-4 bg-gradient-to-r from-[#5F31E8] to-[#7C4DFF] rounded-xl text-white font-semibold text-lg"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

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
              {address?.slice(2, 4).toUpperCase()}
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

          {/* Create Subscription Button */}
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => router.push("/create-subscription")}
              className="flex-1 max-w-[160px] px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 border border-white/10 text-nowrap"
            >
              <Lock className="w-4 h-4 text-[#7C4DFF]" />
              Create Sub
            </button>
            <button
              onClick={() => router.push("/withdraw")}
              className="flex-1 max-w-[160px] px-4 py-2.5 bg-[#5F31E8] hover:bg-[#7C4DFF] rounded-xl text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 text-nowrap"
            >
              <TrendingUp className="w-4 h-4" />
              Withdraw
            </button>
          </div>

          {/* Disconnect Button */}
          <button
            onClick={() => disconnect()}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Disconnect</span>
          </button>
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
                    <button
                      onClick={(e) => handleDelete(e, video.id, video.video_url)}
                      className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full text-white/80 hover:text-white transition-colors z-20"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )
        ) : (
          // EXCLUSIVE VIDEOS
          <div className="relative">
            {/* Lock Screen Logic (Hidden for Owner) */}
            {/* In a real public profile view, we would check !isOwner && !isSubscriber */}
            {/* For now, we simulate ownership access always */}

            {videos.filter((v) => v.is_exclusive).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-white/40" />
                </div>
                <p className="text-white/60 text-center mb-4">No exclusive videos yet</p>
                <button
                  onClick={() => router.push("/upload")}
                  className="text-[#7C4DFF] text-sm font-medium hover:underline"
                >
                  Upload one now
                </button>
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
                      <button
                        onClick={(e) => handleDelete(e, video.id, video.video_url)}
                        className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full text-white/80 hover:text-white transition-colors z-20"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* If we needed to show a 'Locked' Overlay for non-subscribers, it would go here covering the grid */}
            {/* 
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg p-6 text-center">
                <Lock className="w-12 h-12 text-[#7C4DFF] mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Exclusive Content</h3>
                <p className="text-white/60 text-sm mb-6">
                  Subscribe to access exclusive videos from this creator.
                </p>
                <button className="px-8 py-3 bg-[#5F31E8] hover:bg-[#7C4DFF] rounded-xl text-white font-bold transition-colors">
                  Subscribe for 10 MON
                </button>
            </div>
            */}
          </div>
        )}
      </div>

      {/* Stats Cards (Hidden now as they are redundant with tabs) */}
    </div>
  );
}
