import { notFound } from 'next/navigation';

export default function InterCityCIDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // TODO: Implement inter-city CI booking details page
  // This will show the booking details, tracking, and options for the inter-city CI reservation

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Détail de la réservation</h1>
        <p className="text-slate-600">Page de détail pour la réservation ID: {params.id}</p>
        <p className="text-sm text-slate-500">À implémenter</p>
      </div>
    </div>
  );
}
