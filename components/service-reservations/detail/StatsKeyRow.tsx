"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMotionValue, animate, useInView } from "framer-motion";

export interface StatItem {
  value: string | number;
  label: string;
  animated?: boolean;
}

interface StatsKeyRowProps {
  stats: StatItem[];
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = motionVal.on("change", (latest) => {
      setDisplay(Math.round(latest));
    });
    return () => unsub();
  }, [motionVal]);

  useEffect(() => {
    if (inView) {
      const controls = animate(motionVal, value, { duration: 0.8, ease: "easeOut" });
      return () => controls.stop();
    }
  }, [inView, value, motionVal]);

  return <span ref={ref}>{display}</span>;
}

export default function StatsKeyRow({ stats }: StatsKeyRowProps) {
  if (stats.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-around gap-y-4 py-6 border-y border-slate-200">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`flex-1 min-w-[120px] text-center px-4 ${
            idx > 0 ? "border-l border-slate-200" : ""
          }`}
        >
          <div className="text-3xl font-bold text-slate-900">
            {stat.animated && typeof stat.value === "number" ? (
              <AnimatedNumber value={stat.value} />
            ) : (
              stat.value
            )}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
