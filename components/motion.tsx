"use client";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

export const MotionCard: React.FC<React.ComponentProps<"div">> = ({ children, className, ...rest }) => (
  <motion.div
    whileHover={{ y: -2, boxShadow: "0 12px 36px rgba(0,0,0,.35)" }}
    transition={{ type: "tween", duration: .2 }}
    className={className}
    style={rest.style}
  >
    {children}
  </motion.div>
);

export const StaggerList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AnimatePresence initial={false}>
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: .04 } } }}
    >
      {React.Children.map(children, (c) => (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: .18 }}
        >
          {c}
        </motion.div>
      ))}
    </motion.div>
  </AnimatePresence>
);

export const TapButton: React.FC<React.ComponentProps<"button">> = ({ children, className, onClick, type, ...props }) => (
  <motion.button
    whileTap={{ scale: .97 }}
    className={className}
    onClick={onClick}
    type={type}
  >
    {children}
  </motion.button>
);
