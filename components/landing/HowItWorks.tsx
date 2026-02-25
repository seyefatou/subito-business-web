"use client"

import React from "react";
import { motion } from "framer-motion";
import { Send, ShieldCheck, Settings, CheckCircle, AlertCircle } from "lucide-react";

const steps = [
  {
    icon: Send,
    number: "01",
    title: "Soumettez votre demande",
    description: "Remplissez le formulaire d'ouverture de compte avec les informations de votre entreprise.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "Validation par SUBITO",
    description: "Notre équipe vérifie et valide votre demande, puis crée votre compte administrateur.",
  },
  {
    icon: Settings,
    number: "03",
    title: "Configurez votre espace",
    description: "Créez vos départements, ajoutez vos collaborateurs et définissez les règles de validation.",
  },
  {
    icon: CheckCircle,
    number: "04",
    title: "Lancez vos opérations",
    description: "Les réservations sont validées en interne avant exécution. Vous gardez le contrôle total.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-50/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-orange-500 font-semibold text-sm tracking-widest uppercase">
            Processus
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mt-4">
            Comment ça fonctionne
          </h2>
          <p className="text-slate-500 mt-4 text-lg max-w-2xl mx-auto">
            Un processus simple et sécurisé en quatre étapes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+32px)] w-[calc(100%-32px)] h-[2px]">
                  <div className="w-full h-full bg-gradient-to-r from-orange-300 to-orange-200 rounded-full" />
                </div>
              )}

              <div className="text-center">
                <div className="relative inline-flex">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-lg">
                    <step.icon className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Important notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-3xl mx-auto"
        >
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Information importante</p>
            <p className="text-amber-800 text-sm mt-1 leading-relaxed">
              Les comptes administrateurs sont ouverts exclusivement par les administrateurs SUBITO après validation de votre dossier. Aucun accès n&apos;est attribué sans vérification préalable.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
