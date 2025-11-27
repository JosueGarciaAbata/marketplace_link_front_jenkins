import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useVendorPublications,
  useVendorPublicationsActions,
} from "@/hooks/marketplace";
import { useCategories } from "@/hooks/use-categories";
import { ProductoSkeleton } from "@/components/common/Skeletons";
import Pagination from "@/components/common/Pagination";
import DeletePublicationModal from "@/components/modals/DeletePublicationModal";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import type { PublicationSummary } from "@/services/publications/interfaces/PublicationSummary";
import {
  getTextPrimaryClasses,
  getTextSecondaryClasses,
  getCardWithShadowClasses,
} from "@/lib/themeHelpers";
import { getImageUrl } from "@/lib/imageUtils";

/**
 * VendorProductsPage - Página de gestión de publicaciones del vendedor
 * Muestra las publicaciones del vendedor autenticado con datos reales del backend
 */
const VendorProductsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Hook personalizado para acciones CRUD (delete con refresh automático)
  const { deletePublication, isDeleting } = useVendorPublicationsActions();

  // Get theme from layout context
  const context = useOutletContext<{ theme?: "light" | "dark" }>();
  const theme = context?.theme || "light";

  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showPendingReviewAlert, setShowPendingReviewAlert] = useState(false);
  const [pendingReviewMessage, setPendingReviewMessage] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  // Estados para el modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [publicationToDelete, setPublicationToDelete] =
    useState<PublicationSummary | null>(null);

  // Theme classes
  const textPrimary = getTextPrimaryClasses(theme);
  const textSecondary = getTextSecondaryClasses(theme);
  const cardClasses = getCardWithShadowClasses(theme);

  // Obtener categorías
  const { data: categories = [] } = useCategories();

  // Obtener publicaciones del vendedor actual desde el backend
  const { data, isLoading, error } = useVendorPublications({
    vendorId: (user?.id as number) || 0,
    page: currentPage,
    size: itemsPerPage,
    categoryIds:
      selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
  });

  const publications = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  // Verificar si hay mensaje de revisión pendiente al cargar
  useEffect(() => {
    const message = sessionStorage.getItem("pendingReviewMessage");
    if (message) {
      try {
        const parsed = JSON.parse(message);
        setPendingReviewMessage(parsed);
        setShowPendingReviewAlert(true);
        sessionStorage.removeItem("pendingReviewMessage");

        // Remover completamente la cache para forzar un fetch fresco (usar el queryKey correcto)
        queryClient.removeQueries({
          queryKey: ["vendor-publications"],
          exact: false,
        });
      } catch (error) {
        console.error("Error parsing pending review message:", error);
      }
    }
  }, [queryClient]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(0);
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
    setCurrentPage(0); // Reset to first page when filter changes
  };

  const handleClearFilters = () => {
    setSelectedCategoryIds([]);
    setCurrentPage(0);
  };

  const handleViewPublication = (publication: PublicationSummary) => {
    // Marcar que viene desde "Mis Productos" para la navegación correcta
    sessionStorage.setItem("fromMyProducts", "true");
    navigate(`/marketplace-refactored/publication/${publication.id}`);
  };

  const handleEditPublication = (publication: PublicationSummary) => {
    navigate(`/marketplace-refactored/editar/${publication.id}`);
  };

  const handleDeletePublication = (publication: PublicationSummary) => {
    setPublicationToDelete(publication);
    setShowDeleteModal(true);
  };

  const confirmDeletePublication = async () => {
    if (!publicationToDelete) return;

    // Usar el hook personalizado que invalida la cache automáticamente
    const { success, newPage } = await deletePublication(
      publicationToDelete.id,
      currentPage,
      publications.length,
    );

    if (success) {
      // Cerrar modal
      setShowDeleteModal(false);
      setPublicationToDelete(null);

      // Ajustar página si es necesario (cuando se elimina el último item de la página)
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
      }
      // No necesita window.location.reload() - React Query invalida y refresca automáticamente
    }
  };

  const cancelDeletePublication = () => {
    setShowDeleteModal(false);
    setPublicationToDelete(null);
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
        <p className="text-red-500 mb-4 text-lg">
          Error al cargar publicaciones
        </p>
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
      {/* Back to Home Button */}
      <button
        type="button"
        onClick={() => navigate("/marketplace-refactored/publications")}
        className="flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 transition-all duration-200 font-medium"
      >
        Volver a la página de inicio
      </button>

      {/* Alerta de Contenido en Revisión (403) */}
      {showPendingReviewAlert && pendingReviewMessage && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6 relative">
          <button
            onClick={() => setShowPendingReviewAlert(false)}
            className="absolute top-4 right-4 text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200"
          >
            <X size={20} />
          </button>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-2">
                {pendingReviewMessage.title}
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                {pendingReviewMessage.detail}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPendingReviewAlert(false)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-yellow-800 dark:text-yellow-300 border border-yellow-400 dark:border-yellow-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Package className="w-8 h-8 text-[#FF9900]" />
            <span className={textPrimary}>Mis Publicaciones</span>
          </h1>
          <p className="text-[#FF9900] dark:text-[#FFB84D] text-lg font-medium italic mb-1">
            Gestiona tus productos y servicios aquí.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/marketplace-refactored/publicar")}
            className="bg-[#FF9900] hover:bg-[#FFB84D] hover:scale-105 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg whitespace-nowrap"
          >
            <Plus size={20} />
            Nueva Publicación
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className={`${cardClasses} rounded-lg p-6 mb-6 animate-fade-in`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`${textPrimary} text-lg font-semibold`}>
              Filtrar por Categoría
            </h3>
            {selectedCategoryIds.length > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-[#FF9900] hover:text-[#FFB84D] text-sm font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryToggle(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategoryIds.includes(category.id)
                    ? "bg-[#FF9900] text-white shadow-md"
                    : theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Button - Above Publications */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg ${
            selectedCategoryIds.length > 0
              ? "bg-[#FF9900] text-white"
              : theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          <SlidersHorizontal size={20} />
          Filtros
          {selectedCategoryIds.length > 0 && (
            <span className="bg-white text-[#FF9900] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {selectedCategoryIds.length}
            </span>
          )}
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
                  const imageFileName = publication.image?.url || "";
                  const imageUrl = getImageUrl(imageFileName);

                  return (
                    <div
                      key={publication.id}
                      className={`${cardClasses} rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300`}
                    >
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
                            {getAvailabilityDisplayName(
                              publication.availability,
                            )}
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
                            className="flex-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-1 border border-orange-200 dark:border-orange-800"
                          >
                            <Eye size={16} />
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditPublication(publication)}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-1 shadow-sm hover:shadow-md"
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePublication(publication)}
                            className="bg-red-500 hover:bg-red-600 text-white font-medium px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
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
              {publications.length > 0 && (
                <Pagination
                  currentPage={currentPage + 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  totalItems={totalElements}
                  theme={theme}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <DeletePublicationModal
        isOpen={showDeleteModal}
        onClose={cancelDeletePublication}
        onConfirm={confirmDeletePublication}
        publicationName={publicationToDelete?.name || ""}
        isDeleting={isDeleting}
        theme={theme}
      />
    </div>
  );
};

export default VendorProductsPage;
