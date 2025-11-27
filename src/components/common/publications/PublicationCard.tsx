import { Heart, MoreVertical } from "lucide-react";
import {
  getCardWithShadowClasses,
  getTextPrimaryClasses,
  getTextSecondaryClasses,
} from "@/lib/themeHelpers";
import { useEffect, useRef, useState } from "react";
import ReportPublicationModal from "@/components/modals/ReportPublicationModal";

interface PublicationImage {
  id: number;
  url: string;
}

interface Publication {
  id: number;
  type: "PRODUCT" | "SERVICE";
  name: string;
  price: number;
  availability: "AVAILABLE" | "UNAVAILABLE";
  publicationDate: string;
  image: PublicationImage;
  canReport: boolean;
}

interface PublicationCardProps {
  publication: Publication;
  isFavorite?: boolean;
  onView: (publication: Publication) => void;
  onToggleFavorite: (publication: Publication) => void;
  onReported?: () => void;
  theme: "light" | "dark";
}

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

const PublicationCard = ({
  publication,
  isFavorite = false,
  onView,
  onToggleFavorite,
  onReported,
  theme,
}: PublicationCardProps) => {
  const cardClasses = getCardWithShadowClasses(theme);
  const textPrimary = getTextPrimaryClasses(theme);
  const textSecondary = getTextSecondaryClasses(theme);

  // Construct image URL from backend
  const baseUrl = "http://localhost:8090";
  const imageFileName = publication.image?.url || "";

  // Si ya es una URL completa (Azure Blob Storage), decodificarla y usarla directamente
  const imageUrl =
    imageFileName.startsWith("http://") || imageFileName.startsWith("https://")
      ? decodeURIComponent(imageFileName)
      : `${baseUrl}/${imageFileName.startsWith("/") ? imageFileName.substring(1) : imageFileName}`;

  const [menuOpen, setMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div
      className={`${cardClasses} rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group relative`}
    >
      {/* Image Section */}
      <div className="h-48 relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        <img
          src={imageUrl}
          alt={publication.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      </div>

      {/* Botón de tres puntos - Solo visible si hay opciones disponibles */}
      {publication.canReport && (
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="
              p-1 rounded-full transition-colors 
              text-[#606770] hover:bg-[#F0F2F5] 
              dark:text-[white] dark:hover:bg-[#4E4F50]
            "
          >
            <MoreVertical size={20} />
          </button>

          {/* Menú accesible */}
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2"
              role="menu"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setIsReportModalOpen(true);
                }}
                role="menuitem"
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900 cursor-pointer rounded"
              >
                Reportar publicación
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header with title and type */}
        <div className="flex items-start justify-between mb-2">
          <h3
            className={`font-semibold text-lg line-clamp-1 flex-1 ${textPrimary}`}
            title={publication.name}
          >
            {publication.name}
          </h3>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ml-2 whitespace-nowrap ${
              publication.type === "PRODUCT"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            }`}
          >
            {getTypeDisplayName(publication.type)}
          </span>
        </div>

        {/* Availability status */}
        <div className="mb-3">
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${getAvailabilityColor(publication.availability)}`}
          >
            {getAvailabilityDisplayName(publication.availability)}
          </span>
        </div>

        {/* Price and publication date */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-[#FF9900]">
            ${publication.price.toFixed(2)}
          </span>
          <span className={`text-xs ${textSecondary}`}>
            {publication.publicationDate}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onView(publication)}
            className="flex-1 bg-[#FF9900] hover:bg-[#FFB84D] active:bg-[#CC7A00] text-white font-medium py-2 rounded-lg text-sm transition-all duration-200"
          >
            Ver Detalles
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite(publication)}
            className={`px-3 py-2 border-2 rounded-lg transition-all duration-300 ${
              isFavorite
                ? "border-red-500 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900"
                : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <Heart
              size={18}
              className={isFavorite ? "fill-red-500 text-red-500" : ""}
            />
          </button>
        </div>

        {/* === MODAL DE REPORTE === */}
        {isReportModalOpen && (
          <ReportPublicationModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            publicationId={publication.id}
            onReported={() => {
              setIsReportModalOpen(false);
              onReported?.();
            }}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
};

export default PublicationCard;
