/**
 * 🎨 Hero Header 2025
 * Emotionaler Brand Header mit animierten Gradients
 * Persönliche Begrüßung & Wave Animation
 */

'use client';

import { motion } from 'framer-motion';
import { Sparkles, Zap, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeroHeader2025Props {
  userName?: string;
}

export function HeroHeader2025({ userName = 'there' }: HeroHeader2025Props) {
  const [currentTime, setCurrentTime] = useState('');
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();

      // Set greeting based on time
      if (hours < 12) {
        setGreeting('Good morning');
      } else if (hours < 18) {
        setGreeting('Good afternoon');
      } else {
        setGreeting('Good evening');
      }

      // Format time
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl mb-8">
      {/* Background with Animated Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #8b5cf6 100%)',
          backgroundSize: '200% 200%'
        }}
      >
        {/* Animated Gradient Shift */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(270deg, #6366f1, #06b6d4, #8b5cf6, #6366f1)',
            backgroundSize: '400% 400%'
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Floating Orbs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent)',
            top: '-10%',
            left: '-5%'
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        <motion.div
          className="absolute w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent)',
            bottom: '-10%',
            right: '-5%'
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, -25, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Wave Pattern */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M0,60 C360,100 720,20 1080,60 C1200,70 1320,80 1440,60 L1440,120 L0,120 Z"
            fill="rgba(255,255,255,0.1)"
            initial={{ d: "M0,60 C360,100 720,20 1080,60 C1200,70 1320,80 1440,60 L1440,120 L0,120 Z" }}
            animate={{
              d: [
                "M0,60 C360,100 720,20 1080,60 C1200,70 1320,80 1440,60 L1440,120 L0,120 Z",
                "M0,80 C360,40 720,100 1080,80 C1200,70 1320,60 1440,80 L1440,120 L0,120 Z",
                "M0,60 C360,100 720,20 1080,60 C1200,70 1320,80 1440,60 L1440,120 L0,120 Z"
              ]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            {/* Left Side - Greeting */}
            <div className="flex-1">
              {/* Animated Icons */}
              <motion.div
                className="flex items-center gap-2 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.2, 1.2, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5
                  }}
                >
                  <Zap className="h-5 w-5 text-white" />
                </motion.div>
              </motion.div>

              {/* Main Greeting */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-3 tracking-tight">
                  {greeting}, <span className="inline-block">{userName}!</span>
                  <motion.span
                    className="inline-block ml-2"
                    animate={{
                      rotate: [0, 14, -8, 14, -4, 10, 0]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                  >
                    👋
                  </motion.span>
                </h1>

                <p className="text-xl text-white/90 font-medium mb-6">
                  Welcome back to your knowledge hub
                </p>

                {/* Stats Row */}
                <motion.div
                  className="flex items-center gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm text-white/80 font-medium">All systems operational</span>
                  </div>

                  <div className="h-4 w-px bg-card/30" />

                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-white/80" />
                    <span className="text-sm text-white/80 font-medium">AI-powered insights ready</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Right Side - Time & Quick Stats */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="bg-card/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 min-w-[200px]">
                <div className="text-sm text-white/70 font-medium mb-2">Current Time</div>
                <div className="text-3xl font-bold text-white font-mono tracking-tight">
                  {currentTime}
                </div>

                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Productivity</span>
                    <span className="text-white font-semibold">95%</span>
                  </div>
                  <div className="mt-2 h-2 bg-card/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-card rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '95%' }}
                      transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions Pills */}
          <motion.div
            className="flex flex-wrap gap-3 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            {['📚 Browse Library', '⚡ Quick Search', '📊 View Analytics', '🎯 Recent Tasks'].map((action, i) => (
              <motion.button
                key={action}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-card/15 hover:bg-card/25 backdrop-blur-xl rounded-full text-white text-sm font-medium border border-white/20 transition-all"
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              >
                {action}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
