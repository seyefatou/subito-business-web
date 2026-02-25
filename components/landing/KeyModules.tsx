"use client"

import React from "react";
import { motion } from "framer-motion";
import { Car, Package, Fuel, MapPin, Wrench } from "lucide-react";

const modules = [
  {
    icon: Car,
    title: "Transport professionnel",
    description: "Réservez des véhicules avec chauffeur pour vos collaborateurs, clients et visiteurs.",
    benefit: "Réduction de 35% des coûts de déplacement",
    color: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
  },
  {
    icon: Package,
    title: "Livraison & logistique",
    description: "Expédiez documents et colis avec suivi en temps réel et preuve de livraison.",
    benefit: "Livraisons 2x plus rapides",
    color: "from-violet-500 to-violet-600",
    bgLight: "bg-violet-50",
  },
  {
    icon: Fuel,
    title: "Gestion carburant",
    description: "Contrôlez les dépenses carburant par véhicule, département et collaborateur.",
    benefit: "Économie moyenne de 22% sur le carburant",
    color: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50",
  },
  {
    icon: MapPin,
    title: "Tracking en temps réel",
    description: "Visualisez toute votre flotte sur une carte interactive avec historique des trajets.",
    benefit: "Visibilité à 100% sur vos actifs",
    color: "from-emerald-500 to-green-600",
    bgLight: "bg-emerald-50",
  },
  {
    icon: Wrench,
    title: "Entretien des véhicules",
    description: "Planifiez et suivez la maintenance préventive et curative de votre flotte.",
    benefit: "Réduction de 40% des pannes imprévues",
    color: "from-rose-500 to-red-600",
    bgLight: "bg-rose-50",
  },
];

export default function KeyModules() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-orange-500 font-semibold text-sm tracking-widest uppercase">
            Modules
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mt-4">
            Tout ce dont votre entreprise a besoin
          </h2>
          <p className="text-slate-500 mt-4 text-lg max-w-2xl mx-auto">
            Cinq modules intégrés pour une gestion complète de votre mobilité professionnelle.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`group relative bg-white rounded-2xl border border-slate-200/80 p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-1 ${i === 4 ? "md:col-span-2 lg:col-span-1" : ""}`}
            >
              <div className={`w-14 h-14 rounded-2xl ${mod.bgLight} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <mod.icon className={`w-7 h-7 bg-gradient-to-br ${mod.color} bg-clip-text`} style={{ color: mod.color.includes("blue") ? "#3b82f6" : mod.color.includes("violet") ? "#8b5cf6" : mod.color.includes("amber") ? "#f59e0b" : mod.color.includes("emerald") ? "#10b981" : "#f43f5e" }} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3">{mod.title}</h3>
              <p className="text-slate-500 leading-relaxed mb-5">{mod.description}</p>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${mod.color}`} />
                <span className="text-sm font-semibold text-slate-700">{mod.benefit}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
