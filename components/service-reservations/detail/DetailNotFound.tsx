"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetailNotFoundProps {
  icon: React.ReactNode;
  title: string;
  onBack: () => void;
}

export default function DetailNotFound({ icon, title, onBack }: DetailNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-500/30"
      >
        {icon}
      </motion.div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 mb-6">L&apos;élément demandé n&apos;a pas pu être trouvé.</p>
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Button>
    </div>
  );
}
