'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Veuillez entrer votre adresse email');
      return;
    }

    setIsLoading(true);

    try {
      await api.authCompagny.forgotPassword(email);
      setSent(true);
      toast.success('Email de reinitialisation envoye');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <style>{`
        .gradient-subito {
          background: linear-gradient(135deg, #FF6B35 0%, #FF7B7B 100%);
        }
        .text-subito {
          color: #FF6B35;
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || '/business'}/logo-subito.jpeg`}
              alt="Subito"
              className="h-12 w-auto"
            />
            <div className="text-left">
              <span className="font-bold text-2xl text-slate-800">Subito</span>
              <span className="block text-sm text-slate-500 font-medium -mt-1">Business</span>
            </div>
          </div>
          <p className="text-slate-500">Reinitialisation du mot de passe</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Email envoye</h2>
              <p className="text-sm text-slate-500">
                Un lien de reinitialisation a ete envoye a <strong>{email}</strong>. Verifiez votre boite de reception.
              </p>
              <Button
                onClick={() => setSent(false)}
                variant="outline"
                className="w-full mt-4"
              >
                Renvoyer l&apos;email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-7 h-7 text-orange-600" />
                </div>
                <p className="text-sm text-slate-500">
                  Entrez votre adresse email et nous vous enverrons un lien pour reinitialiser votre mot de passe.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@subito.sn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 gradient-subito text-white border-0 text-base font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer le lien'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-subito hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Retour a la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
