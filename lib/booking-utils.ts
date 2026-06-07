export function calculateNights(dateDebut: Date, dateFin: Date): number {
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function calculateDays(dateDebut: Date, dateFin: Date): number {
  return calculateNights(dateDebut, dateFin);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6; // Friday or Saturday
}

export function countWeekends(dateDebut: Date, dateFin: Date): number {
  let count = 0;
  const start = new Date(dateDebut);
  const end = new Date(dateFin);

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    if (isWeekend(d)) {
      count++;
    }
  }
  return count;
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-FR');
}

export function getPricingModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    PER_NUIT: 'par nuit',
    PER_QUANTITE: 'par quantité',
    PER_JOUR: 'par jour',
    PER_HEURE: 'par heure',
    FORFAIT: 'forfait',
  };
  return labels[mode] || mode;
}

export function getFormuleLabel(formule: string): string {
  const labels: Record<string, string> = {
    PENSION_COMPLETE: 'Pension complète',
    DEMI_PENSION: 'Demi-pension',
    PETIT_DEJEUNER: 'Petit-déjeuner',
    NUIT_SIMPLE: 'Nuit simple',
  };
  return labels[formule] || formule;
}
