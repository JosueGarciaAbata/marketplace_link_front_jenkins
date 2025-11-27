import { useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, Heart, Package, User, Tag, Clock } from "lucide-react";
import { usePublicationDetail } from "@/hooks/use-publication-detail";
import { usePublicationFavorite } from "@/hooks/use-favorites";
import { usePublications } from "@/hooks/use-publication";
import { getUserLocation } from "@/auth/userStorage";
import PublicationCard from "@/components/common/publications/PublicationCard";
import {
  getCardWithShadowClasses,
  getTextPrimaryClasses,
  getTextSecondaryClasses,
  getBorderClasses,
} from "@/lib/themeHelpers";

const getAvailabilityColor = (availability: string): string => {
  switch (availability) {
    case "AVAILABLE":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "UNAVAILABLE":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

const getTypeDisplayName = (type: string): string => {
  return type === "PRODUCT" ? "Producto" : "Servicio";
};

const getAvailabilityDisplayName = (availability: string): string => {
  return availability === "AVAILABLE" ? "Disponible" : "No disponible";
};

const getTimeAgo = (dateString: string): string => {
  // Formato del backend: "20/10/2025 14:50"
  const [datePart, timePart] = dateString.split(' ');
  const [day, month, year] = datePart.split('/');
  const [hours, minutes] = timePart.split(':');
  
  const publicationDate = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  );
  
  const now = new Date();
  const diffMs = now.getTime() - publicationDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 30) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  if (diffMonths < 12) return `Hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
  return `Hace ${diffYears} año${diffYears > 1 ? 's' : ''}`;
};

const PublicationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const context = useOutletContext<{ theme?: "light" | "dark" }>();
  const theme = context?.theme || "light";

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // local array for quick UI feedback on related publications (optional)
  const [favorites, setFavorites] = useState<number[]>([]);

  // Get publication ID from URL
  const publicationId = id ? parseInt(id, 10) : 0;

  // Detectar de dónde viene el usuario (guardamos en sessionStorage cuando navega)
  const fromMyProducts = sessionStorage.getItem('fromMyProducts') === 'true';
  
  // Función para volver atrás
  const handleGoBack = () => {
    if (fromMyProducts) {
      sessionStorage.removeItem('fromMyProducts');
      navigate("/marketplace-refactored/mis-productos");
    } else {
      navigate("/marketplace-refactored/publications");
    }
  };

  const { data: publication, isLoading, error } = usePublicationDetail(publicationId);

  // Favorite state & toggle for this publication (backend-driven)
  const {
    isFavorite,
    isLoading: isFavoriteLoading,
    toggleFavorite,
  } = usePublicationFavorite(publicationId);

  // Get related publications (same category)
  const userLocation = getUserLocation();
  const { data: relatedPublicationsData } = usePublications({
    page: 0,
    size: 5,
    categoryIds: publication?.category.id ? [publication.category.id] : undefined,
    lat: userLocation.latitude,
    lon: userLocation.longitude,
    distanceKm: 100,
  });

  // Filter out current publication and limit to 4
  const relatedPublications = relatedPublicationsData?.content
    .filter((p) => p.id !== publication?.id)
    .slice(0, 4) || [];

  // Theme classes
  const cardClasses = getCardWithShadowClasses(theme);
  const textPrimary = getTextPrimaryClasses(theme);
  const textSecondary = getTextSecondaryClasses(theme);
  const borderClass = getBorderClasses(theme);

  const handleToggleFavorite = async () => {
    if (!publication) return;
    try {
      await toggleFavorite();
      // optimistic local update for related items UI
      setFavorites((prev) =>
        prev.includes(publication.id)
          ? prev.filter((id) => id !== publication.id)
          : [...prev, publication.id]
      );
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleViewRelatedPublication = (pub: any) => {
    navigate(`/marketplace-refactored/publication/${pub.id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleRelatedFavorite = (pub: any) => {
    setFavorites((prev) =>
      prev.includes(pub.id)
        ? prev.filter((id) => id !== pub.id)
        : [...prev, pub.id]
    );
  };

  // Construct image URLs
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const getImageUrl = (imageUrl: string) => {
    // Si ya es una URL completa (http/https), retornarla directamente
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Decodificar la URL en caso de que tenga %2F u otros caracteres encoded
      return decodeURIComponent(imageUrl);
    }
    // Si es una ruta relativa, construir la URL con el backend
    const cleanFileName = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    return `${baseUrl}/${cleanFileName}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FF9900]"></div>
      </div>
    );
  }

  if (error || !publication) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package size={64} className="text-gray-300 mb-4" />
        <h2 className={`${textPrimary} text-2xl font-bold mb-2`}>
          Publicación no encontrada
        </h2>
        <p className={`${textSecondary} mb-6`}>
          La publicación que buscas no existe o ha sido eliminada.
        </p>
        <button
          onClick={handleGoBack}
          className="bg-[#FF9900] hover:bg-[#FFB84D] text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={20} />
          {fromMyProducts ? "Volver a mis publicaciones" : "Volver al catálogo"}
        </button>
      </div>
    );
  }

  const images = publication.images || [];
  const currentImage = images[selectedImageIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb y navegación */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button
          onClick={handleGoBack}
          className={`${textSecondary} hover:text-[#FF9900] transition-colors flex items-center gap-1 font-medium`}
        >
          <ArrowLeft size={16} />
          {fromMyProducts ? "Volver a mis publicaciones" : "Volver al catálogo"}
        </button>
        <span className={textSecondary}>/</span>
        <span className={textPrimary}>{publication.name}</span>
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda - Imágenes */}
        <div className="lg:col-span-5">
          <div className="flex gap-3 h-[600px]">
            {/* Miniaturas verticales - Solo si hay más de 1 imagen */}
            {images.length > 1 && (
              <div className="flex flex-col gap-2 w-16 overflow-y-auto">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-lg border-2 transition-all ${
                      selectedImageIndex === index
                        ? "border-[#FF9900]"
                        : `border-gray-300 dark:border-gray-600 hover:border-[#FF9900]`
                    } bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0`}
                  >
                    <img
                      src={getImageUrl(img.url)}
                      alt={`${publication.name} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Imagen principal */}
            <div className="flex-1 flex flex-col">
              <div className={`${cardClasses} relative bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center h-full`}>
                {currentImage ? (
                  <img
                    src={getImageUrl(currentImage.url)}
                    alt={publication.name}
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <Package size={120} className="text-gray-400" />
                )}

                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      publication.type === "PRODUCT"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    }`}
                  >
                    {getTypeDisplayName(publication.type)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(publication.availability)}`}
                  >
                    {getAvailabilityDisplayName(publication.availability)}
                  </span>
                </div>

                {/* Botón favorito */}
                <button
                  onClick={handleToggleFavorite}
                  disabled={isFavoriteLoading}
                  className="absolute top-4 left-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:scale-110 transition-transform disabled:opacity-60"
                >
                  <Heart
                    size={24}
                    className={
                      isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
                    }
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha - Información del Producto */}
        <div className="lg:col-span-7">
          <div className={`${cardClasses} flex flex-col overflow-y-auto h-[600px]`}>
            {/* Título, código y fecha */}
            <div className="mb-4">
              <p className={`${textSecondary} text-xs mb-1`}>
                {getTimeAgo(publication.publicationDate)} | Código: <span className="font-mono">{publication.code}</span>
              </p>
              <h1 className={`${textPrimary} text-2xl lg:text-3xl font-bold`}>
                {publication.name}
              </h1>
            </div>

            {/* Precio */}
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <span className={`${textPrimary} text-4xl lg:text-5xl font-bold text-[#FF9900]`}>
                ${publication.price.toFixed(2)}
              </span>
            </div>

            {/* Descripción */}
            <div className="mb-6 flex-1">
              <h2 className={`${textPrimary} text-lg font-semibold mb-3`}>
                Descripción
              </h2>
              <p className={`${textSecondary} leading-relaxed whitespace-pre-wrap mb-4`}>
                {publication.description}
              </p>
              
              {/* Categoría */}
              <div className="flex items-center gap-2 mt-4">
                <Tag className="text-[#FF9900]" size={18} />
                <span className={`${textSecondary} text-sm`}>Categoría:</span>
                <span className={`${textPrimary} font-medium text-sm`}>
                  {publication.category.name}
                </span>
              </div>

              {/* Horario de atención (solo para servicios) */}
              {publication.type === "SERVICE" && publication.workingHours && (
                <div className={`mt-4 p-4 rounded-lg border ${borderClass} bg-amber-50 dark:bg-amber-900/20`}>
                  <div className="flex items-start gap-3">
                    <Clock className="text-[#FF9900] flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className={`${textPrimary} font-semibold text-sm mb-1`}>
                        Horario de atención
                      </p>
                      <p className={`${textSecondary} text-sm`}>
                        {publication.workingHours}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Información del vendedor */}
            <div className="space-y-3 py-4 border-t border-gray-200 dark:border-gray-700">
              <h2 className={`${textPrimary} text-lg font-semibold mb-3`}>
                Información del vendedor
              </h2>

              <div className="flex items-start gap-3">
                <User className="text-[#FF9900] flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className={`${textSecondary} text-sm`}>Vendedor</p>
                  <p className={`${textPrimary} font-medium`}>
                    {publication.vendor.username}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Productos Relacionados */}
      {relatedPublications.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className={`${textPrimary} text-2xl font-bold mb-2`}>
              Publicaciones relacionadas
            </h2>
            <p className={`${textSecondary} text-sm`}>
              Otras publicaciones en {publication.category.name}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedPublications.map((relatedPub) => (
              <PublicationCard
                key={relatedPub.id}
                publication={relatedPub}
                isFavorite={favorites.includes(relatedPub.id)}
                onView={handleViewRelatedPublication}
                onToggleFavorite={handleToggleRelatedFavorite}
                theme={theme}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicationDetailPage;
