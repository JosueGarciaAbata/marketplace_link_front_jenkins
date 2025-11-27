import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useVendorPublications } from "@/hooks/marketplace/use-vendor-publications";
import { ProductoSkeleton } from "@/components/common/Skeletons";
import Pagination from "@/components/common/Pagination";
import { Package, Plus, Edit, Trash2, Eye } from "lucide-react";
import type { PublicationSummary } from "@/services/publications/interfaces/PublicationSummary";
import {
  getTextPrimaryClasses,
  getTextSecondaryClasses,
  getCardWithShadowClasses,
} from "@/lib/themeHelpers";

/**
 * MisProductosPage - Página de gestión de publicaciones del vendedor
 * Muestra las publicaciones del vendedor autenticado con datos reales del backend
 */
const MisProductosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get theme from layout context
  const context = useOutletContext<{ theme?: "light" | "dark" }>();
  const theme = context?.theme || "light";
  
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Theme classes
  const textPrimary = getTextPrimaryClasses(theme);
  const textSecondary = getTextSecondaryClasses(theme);
  const cardClasses = getCardWithShadowClasses(theme);

  // Obtener publicaciones del vendedor actual desde el backend
  const { data, isLoading, error } = useVendorPublications({
    vendorId: (user?.id as number) || 0,
    page: currentPage,
    size: itemsPerPage,
  });

  const publications = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(0);
  };

  const handleViewPublication = (publication: PublicationSummary) => {
    navigate(`/marketplace-refactored/publication/${publication.id}`);
  };

  const handleEditPublication = (publication: PublicationSummary) => {
    // TODO: Implementar edición
    console.log("Edit publication:", publication);
  };

  const handleDeletePublication = (publication: PublicationSummary) => {
    // TODO: Implementar eliminación
    console.log("Delete publication:", publication);
  };

  // Obtener el nombre del tipo de publicación
  const getTypeDisplayName = (type: string): string => {
    return type === "PRODUCT" ? "Producto" : "Servicio";
  };

  // Obtener color del estado de disponibilidad
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

  // Obtener nombre del estado de disponibilidad
  const getAvailabilityDisplayName = (availability: string): string => {
    return availability === "AVAILABLE" ? "Disponible" : "No disponible";
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-500 mb-4 text-lg">Error al cargar publicaciones</p>
        <p className={`${textSecondary} mb-6`}>{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#FF9900] text-white rounded-lg hover:bg-[#FFB84D] transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`${textPrimary} text-3xl font-bold flex items-center gap-2`}>
            <Package className="w-8 h-8 text-[#FF9900]" />
            Mis Publicaciones
          </h1>
          <p className={`${textSecondary} text-sm mt-1`}>
            {isLoading ? (
              "Cargando..."
            ) : (
              <>
                Mostrando {currentPage * itemsPerPage + 1}-
                {Math.min((currentPage + 1) * itemsPerPage, totalElements)} de{" "}
                {totalElements} publicaciones
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate("/marketplace-refactored/publicar")}
          className="bg-[#FF9900] hover:bg-[#FFB84D] hover:scale-105 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg whitespace-nowrap"
        >
          <Plus size={20} />
          Nueva Publicación
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <ProductoSkeleton key={`skeleton-${i}`} />
          ))}
        </div>
      ) : (
        <>
          {/* Empty State */}
          {publications.length === 0 ? (
            <div className={`${cardClasses} rounded-lg p-12 text-center`}>
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className={`${textPrimary} text-xl font-semibold mb-2`}>
                No tienes publicaciones aún
              </h3>
              <p className={`${textSecondary} mb-6`}>
                Comienza a vender publicando tu primer producto o servicio
              </p>
              <button
                onClick={() => navigate("/marketplace-refactored/publicar")}
                className="bg-[#FF9900] hover:bg-[#FFB84D] text-white px-8 py-3 rounded-lg inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Publicar Ahora
              </button>
            </div>
          ) : (
            <>
              {/* Publications Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {publications.map((publication) => {
                  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
                  const imageFileName = publication.image.url;
                  
                  // Si ya es una URL completa (Azure Blob Storage), decodificarla y usarla directamente
                  const imageUrl = (imageFileName.startsWith('http://') || imageFileName.startsWith('https://'))
                    ? decodeURIComponent(imageFileName)
                    : `${baseUrl}/${imageFileName.startsWith('/') ? imageFileName.substring(1) : imageFileName}`;

                  return (
                    <div key={publication.id} className={`${cardClasses} rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300`}>
                      {/* Image Section */}
                      <div className="h-48 relative overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <img
                          src={imageUrl}
                          alt={publication.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {/* Header with title and type */}
                        <div className="flex items-start justify-between mb-2">
                          <h3
                            className={`${textPrimary} font-semibold text-lg line-clamp-1 flex-1`}
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
                        <div className="flex items-center justify-between mb-4">
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
                            onClick={() => handleViewPublication(publication)}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-1"
                          >
                            <Eye size={16} />
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditPublication(publication)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-1"
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePublication(publication)}
                            className="bg-red-500 hover:bg-red-600 text-white font-medium px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage + 1}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    totalItems={totalElements}
                    theme={theme}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
export default MisProductosPage;