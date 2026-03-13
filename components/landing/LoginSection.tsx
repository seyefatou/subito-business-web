"use client"

import React from "react";
import { motion } from "framer-motion";
import { LogIn, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginSection() {
  return (
    <section className="py-24 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 mb-6 shadow-xl">
            <Lock className="w-7 h-7 text-orange-400" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Déjà client Subito Business ?
          </h2>
          <p className="text-slate-500 mt-4 text-lg">
            Accédez à votre espace entreprise en toute sécurité pour gérer votre flotte, suivre vos opérations et consulter vos rapports.
          </p>

          <a href="/login">
            <Button
              variant="outline"
              className="mt-8 border-slate-300 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 px-10 py-6 text-base font-semibold rounded-xl transition-all duration-300"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Connexion sécurisée
            </Button>
          </a>

          <p className="text-slate-400 text-sm mt-4">
            Connexion chiffrée SSL · Authentification sécurisée
          </p>
        </motion.div>
      </div>
    </section>
  );
}
