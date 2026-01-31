"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Share2, MessageCircle, Lock, Check, Volume2, VolumeX } from "lucide-react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { DUMMY_CREATOR_ADDRESS } from "@/lib/web3";
import CommentDrawer from "./CommentDrawer";
import type { Video } from "@/types/database";

interface VideoSlideProps {
  video: Video;
  isActive: boolean;
}

export default function VideoSlide({ video, isActive }: VideoSlideProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => Math.floor(Math.random() * 5000) + 100);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [doubleTapPosition, setDoubleTapPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const [commentCount] = useState(() => Math.floor(Math.random() * 500) + 10);

  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const {
    data: hash,
    sendTransaction,
    isPending: isSending,
    reset: resetTransaction
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && !isUnlocked) {
      setIsUnlocked(true);
      setShowSuccessToast(true);
      resetTransaction();

      // Auto-play the video after unlocking
      if (videoRef.current && isActive) {
        videoRef.current.play().catch(() => { });
      }

      // Hide toast after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isConfirmed, isUnlocked, isActive, resetTransaction]);

  useEffect(() => {
    if (!videoRef.current) return;

    // Only auto-play if not exclusive or already unlocked or creator
    const amICreator = address && video.creator_wallet && address.toLowerCase() === video.creator_wallet.toLowerCase();
    const canPlay = !video.is_exclusive || isUnlocked || amICreator;

    if (isActive && canPlay) {
      videoRef.current.play().catch((error) => {
        // Autoplay blocked (likely due to audio) - fallback to muted
        console.log("Autoplay blocked, falling back to muted:", error);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(e => console.error("Muted autoplay failed:", e));
        }
      });
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      if (!isActive) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive, video.is_exclusive, isUnlocked]); // Removed amICreator dependency as it breaks memoization? No, amICreator is computed inside.

  const handleVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!videoRef.current) return;

    // Prevent interaction if exclusive and locked
    const amICreator = address && video.creator_wallet && address.toLowerCase() === video.creator_wallet.toLowerCase();
    if (video.is_exclusive && !isUnlocked && !amICreator) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    // Double tap detected (within 300ms)
    if (timeSinceLastTap < 300) {
      // Get tap position relative to the video element
      const rect = e.currentTarget.getBoundingClientRect();
      setDoubleTapPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      // Trigger like if not already liked
      if (!isLiked) {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 600);
      }

      // Show big heart animation
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 800);
      return;
    }

    // Single tap - toggle play/pause
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleUnlock = () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    // Send 1 MON to the dummy creator address
    sendTransaction({
      to: DUMMY_CREATOR_ADDRESS,
      value: parseEther("1"),
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: video.description,
        url: window.location.href,
      });
    }
  };

  const handleLike = () => {
    if (!isLiked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 600);
    }
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toString();
  };

  const truncatedWallet = video.creator_wallet
    ? `${video.creator_wallet.slice(0, 6)}...${video.creator_wallet.slice(-4)}`
    : "Anonymous";

  const amICreator = address && video.creator_wallet && address.toLowerCase() === video.creator_wallet.toLowerCase();
  const isExclusiveLocked = video.is_exclusive && !isUnlocked && !amICreator;
  const isProcessing = isSending || isConfirming;

  const [isMuted, setIsMuted] = useState(false);
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  // ...

  return (
    <div className="relative h-full w-full bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.video_url}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${isExclusiveLocked ? "blur-lg scale-105" : ""
          }`}
        loop
        muted={isMuted}
        playsInline
        onClick={handleVideoTap}
      />

      {/* Mute Toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-20 right-4 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-colors z-20"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Exclusive Content Overlay */}
      {isExclusiveLocked && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#5F31E8]/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#7C4DFF]" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg mb-1">Exclusive Content</p>
              <p className="text-white/60 text-sm">Unlock to watch this video</p>
            </div>
            <button
              onClick={handleUnlock}
              disabled={isProcessing}
              className="px-6 py-3 bg-[#5F31E8] hover:bg-[#7C4DFF] disabled:bg-[#5F31E8]/50 rounded-full text-white font-semibold text-base transition-all duration-200 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSending ? "Confirm in Wallet..." : "Processing..."}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Unlock for 1 MON
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-500 rounded-full shadow-lg">
            <Check className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Content Unlocked!</span>
          </div>
        </div>
      )}

      {/* Pause Indicator */}
      {isPaused && !isExclusiveLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2" />
          </div>
        </div>
      )}

      {/* Double Tap Heart Animation */}
      <AnimatePresence>
        {showDoubleTapHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute pointer-events-none z-30"
            style={{
              left: doubleTapPosition.x - 50,
              top: doubleTapPosition.y - 50,
            }}
          >
            <Heart className="w-[100px] h-[100px] fill-red-500 text-red-500 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <div className="relative w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <AnimatePresence>
              {showLikeAnimation && (
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              animate={showLikeAnimation ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className={`w-6 h-6 transition-colors duration-200 ${isLiked ? "fill-red-500 text-red-500" : "text-white"
                  }`}
              />
            </motion.div>
          </div>
          <span className="text-white text-xs font-medium">{formatCount(likeCount)}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => setIsCommentDrawerOpen(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(commentCount)}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>
      </div>

      {/* Comment Drawer */}
      <CommentDrawer
        isOpen={isCommentDrawerOpen}
        onClose={() => setIsCommentDrawerOpen(false)}
        commentCount={commentCount}
      />

      {/* Bottom Info - positioned above bottom nav */}
      <div className="absolute left-4 right-20 bottom-24 flex flex-col gap-2">
        {/* Creator */}
        <div
          className="flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            if (video.creator_wallet) {
              router.push(`/profile/${video.creator_wallet}`);
            }
          }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5F31E8] to-[#7C4DFF] flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {video.creator_wallet?.slice(2, 4).toUpperCase() || "??"}
            </span>
          </div>
          <span className="text-white font-semibold text-sm">
            {truncatedWallet}
          </span>
          {video.is_exclusive && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] text-white font-medium ${isUnlocked ? "bg-green-500" : "bg-[#5F31E8]"
              }`}>
              {isUnlocked ? "UNLOCKED" : "EXCLUSIVE"}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-white text-sm leading-5 line-clamp-2">
          {video.description}
        </p>

        {/* Price if exclusive and locked */}
        {video.is_exclusive && !isUnlocked && video.price > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[#7C4DFF] font-bold text-sm">
              {video.price} MON
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
