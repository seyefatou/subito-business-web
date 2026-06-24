import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';
import { Logement, Activite, Circuit, VehiculeLocation, Salle } from '@/lib/api';
import { formatPrice } from '@/lib/booking-utils';
import { Button } from '@/components/ui/button';

const MANROPE = { fontFamily: 'Manrope, system-ui, sans-serif' };

type Product = Logement | Activite | Circuit | VehiculeLocation | Salle;

interface ProductCardProps {
  product: Product;
  productType: 'logement' | 'activite' | 'circuit' | 'vehicule' | 'salle';
}

export function ProductCard({ product, productType }: ProductCardProps) {
  const getPrice = (product: any): number => {
    return product.prixParNuit || product.prix || product.prixParJour || 0;
  };

  const getImage = (product: any): string => {
    return product.images?.[0] || '/placeholder.png';
  };

  const getRating = (product: Product) => {
    if ('averageRating' in product) return product.averageRating;
    if ('avis' in product && Array.isArray(product.avis)) {
      const avg = product.avis.reduce((sum, a: any) => sum + (a.note || 0), 0) / product.avis.length;
      return avg || null;
    }
    return null;
  };

  const getTitle = (product: any): string => {
    return product.nom || product.titre || 'Produit';
  };

  const getLocation = (product: Product) => {
    if ('ville' in product) return product.ville;
    return null;
  };

  const getPriceLabel = () => {
    if (productType === 'logement' || productType === 'circuit') return '/nuit';
    if (productType === 'vehicule') return '/jour';
    return '/pers';
  };

  const price = getPrice(product);
  const image = getImage(product);
  const rating = getRating(product) as number | null;
  const title = getTitle(product);
  const location = getLocation(product) as string | null;

  return (
    <Link href={`/service-reservations/${productType}/${product.id}`}>
      <div className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-[#E04A1F] transition-all duration-300 hover:shadow-lg cursor-pointer">
        {/* Image */}
        <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
          <Image
            src={image}
            alt={title || 'Product'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={false}
          />
          {rating && (
            <div className="absolute top-3 right-3 bg-white rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-slate-800">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-slate-900 line-clamp-2 mb-1" style={MANROPE}>
            {title}
          </h3>

          {location && (
            <div className="flex items-center gap-1 text-xs text-slate-600 mb-3">
              <MapPin className="w-3 h-3" />
              <span>{location}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xl font-extrabold text-[#E04A1F]" style={MANROPE}>
              {formatPrice(price)}
            </span>
            <span className="text-xs text-slate-600 font-medium">FCFA{getPriceLabel()}</span>
          </div>

          {/* CTA Button */}
          <Button className="w-full bg-[#E04A1F] hover:bg-[#C8330F] text-white font-semibold py-2 rounded-xl transition">
            Réserver
          </Button>
        </div>
      </div>
    </Link>
  );
}
