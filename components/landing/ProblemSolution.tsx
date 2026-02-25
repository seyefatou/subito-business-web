"use client"

import React from "react";
import { motion } from "framer-motion";
import { X, Check, AlertTriangle, Eye, Users, FileText } from "lucide-react";

const problems = [
  { icon: AlertTriangle, text: "Dépenses incontrôlées et budgets dépassés" },
  { icon: Eye, text: "Manque de visibilité sur la flotte et les trajets" },
  { icon: Users, text: "Multiplicité des prestataires et fournisseurs" },
  { icon: FileText, text: "Facturation éclatée et réconciliation complexe" },
];

const solutions = [
  { icon: Check, text: "Centralisation de tous les services mobilité" },
  { icon: Check, text: "Suivi en temps réel de chaque véhicule" },
  { icon: Check, text: "Validation interne avant chaque exécution" },
  { icon: Check, text: "Facturation consolidée et reporting unifié" },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export default function ProblemSolution() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center mb-16">
          <span className="text-orange-500 font-semibold text-sm tracking-widest uppercase">
            Pourquoi Subito Business
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mt-4">
            Le problème est connu.<br />
            <span className="text-slate-400">La solution, c&apos;est nous.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Problems */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-red-50/50 border border-red-100 rounded-2xl p-8 lg:p-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 mb-6">
              <X className="w-4 h-4 text-red-500" />
              <span className="text-red-600 text-sm font-medium">Sans Subito Business</span>
            </div>
            <div className="space-y-5">
              {problems.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-slate-700 text-base leading-relaxed pt-2">{text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Solutions */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-green-50/50 border border-green-100 rounded-2xl p-8 lg:p-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 mb-6">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-700 text-sm font-medium">Avec Subito Business</span>
            </div>
            <div className="space-y-5">
              {solutions.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-slate-700 text-base leading-relaxed pt-2">{text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
