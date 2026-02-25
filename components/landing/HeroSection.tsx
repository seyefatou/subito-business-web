"use client"

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  const scrollToForm = () => {
    const el = document.querySelector("#request-form");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      {/* Gradient orbs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-orange-400 text-sm font-medium tracking-wide">SUBITO BUSINESS</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Pilotez toute votre mobilité depuis un seul{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                cockpit.
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl">
              Transport, livraison, carburant, tracking et gestion de flotte centralisés dans une seule interface. Maîtrisez vos dépenses opérationnelles.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Button
                onClick={scrollToForm}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02]"
              >
                Demander l&apos;ouverture d&apos;un compte
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <a href="/login">
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-base rounded-xl transition-all"
                >
                  Se connecter
                </Button>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-8 mt-12">
              {[
                { icon: Shield, label: "Sécurisé" },
                { icon: BarChart3, label: "Temps réel" },
                { icon: Zap, label: "Instantané" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-slate-500">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Main dashboard card */}
              <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-slate-500 text-xs ml-2 font-mono">dashboard.subito.business</span>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Véhicules actifs", value: "47", change: "+3" },
                    { label: "Budget mensuel", value: "12.4M", change: "-8%" },
                    { label: "Livraisons", value: "328", change: "+12%" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-slate-900/60 rounded-xl p-4">
                      <p className="text-slate-500 text-xs">{kpi.label}</p>
                      <p className="text-white text-2xl font-bold mt-1">{kpi.value}</p>
                      <p className="text-green-400 text-xs mt-1">{kpi.change}</p>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="bg-slate-900/40 rounded-xl p-4 mb-4">
                  <div className="flex items-end gap-1 h-24">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-orange-500/60 to-orange-400/30 rounded-t"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 0.5 + i * 0.05 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Map placeholder */}
                <div className="bg-slate-900/40 rounded-xl p-4 relative overflow-hidden h-32">
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `radial-gradient(circle at 30% 50%, #f97316 1px, transparent 1px), radial-gradient(circle at 70% 30%, #f97316 1px, transparent 1px), radial-gradient(circle at 50% 70%, #f97316 1px, transparent 1px)`,
                    backgroundSize: '100% 100%'
                  }} />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-slate-500">Tracking en direct</span>
                  </div>
                  {[
                    { top: "30%", left: "25%", color: "bg-orange-500" },
                    { top: "50%", left: "60%", color: "bg-green-500" },
                    { top: "65%", left: "40%", color: "bg-blue-400" },
                  ].map((pin, i) => (
                    <motion.div
                      key={i}
                      className={`absolute w-3 h-3 ${pin.color} rounded-full shadow-lg`}
                      style={{ top: pin.top, left: pin.left }}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                    >
                      <div className={`absolute inset-0 ${pin.color} rounded-full animate-ping opacity-30`} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
