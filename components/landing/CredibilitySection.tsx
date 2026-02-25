"use client"

import React from "react";
import { motion } from "framer-motion";
import { Shield, TrendingDown, Truck, Clock } from "lucide-react";

const stats = [
  { icon: TrendingDown, value: "32%", label: "d'économie moyenne sur les coûts de mobilité" },
  { icon: Truck, value: "500+", label: "flottes gérées sur la plateforme" },
  { icon: Clock, value: "24/7", label: "support et monitoring en temps réel" },
  { icon: Shield, value: "100%", label: "données sécurisées et conformes" },
];

const logos = [
  {
    name: "Air France",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/f3834a3fb_Air_France-Logowine.png"
  },
  {
    name: "Bridge Bank",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/f3d074fe3_bridgebankgroup221-PVP-2022-09-25_08-49-36bridge_bank_group_logo_2.png"
  },
  {
    name: "Deloitte",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/0c4dc7776_deloitte-logo-png-transparent.png"
  },
  {
    name: "IDinsight",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/6df30672f_IDi-Logo-Master-RGB-Dark-Blue-1.jpg"
  },
  {
    name: "KPMG",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/e3d63da5f_logo-kpmg-png-3.png"
  },
  {
    name: "Majorel",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/2f4052310_Majorel_Logo_2019.png"
  },
  {
    name: "Niyel",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/9afcba5cc_niyel_logo.jpeg"
  },
  {
    name: "PATH",
    url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/633ac2424_path-org-logo-png_seeklogo-380723.png"
  }
];

export default function CredibilitySection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-orange-500 font-semibold text-sm tracking-widest uppercase">
            Chiffres clés
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mt-4">
            Des résultats mesurables
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center p-6 lg:p-8 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-3xl lg:text-4xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Partner logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-slate-400 text-sm tracking-widest uppercase mb-10">
            Ils nous font confiance
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-14">
            {logos.map((logo, i) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="grayscale hover:grayscale-0 transition-all duration-300"
              >
                <img
                  src={logo.url}
                  alt={logo.name}
                  className="h-10 lg:h-12 w-auto object-contain"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Security note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20 flex items-center justify-center gap-3 text-slate-400"
        >
          <Shield className="w-5 h-5" />
          <p className="text-sm">
            Données hébergées de manière sécurisée · Chiffrement de bout en bout · Conformité RGPD
          </p>
        </motion.div>
      </div>
    </section>
  );
}
