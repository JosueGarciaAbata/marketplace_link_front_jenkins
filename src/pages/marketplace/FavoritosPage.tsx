import { useState, useMemo, useEffect } from "react";
import { Heart, ShoppingBag, Search, X } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFavorites } from "@/hooks/use-favorites";
import { useFavoritesContext } from "@/context/FavoritesContext";
import {
  getTextPrimaryClasses,
  getTextSecondaryClasses,
  getCardWithShadowClasses,
  getBorderClasses,
} from "@/lib/themeHelpers";

/**
 * FavoritosPage - Página de productos favoritos
 * Integrada con el servicio de favoritos del backend
 */
const FavoritosPage = () => {
  const navigate = useNavigate();
  const { 
    favorites, 
    isLoading, 
    error, 
    page, 
    size, 
    totalElements,
    setPage,
    setSize
  } = useFavoritesContext();
  const { removeFavorite } = useFavorites();
  
  // Obtener theme desde el contexto del layout
  const context = useOutletContext<{ theme?: "light" | "dark" }>();
  const theme = context?.theme || "light";

  // Estados de filtros
  const [searchName, setSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"publicationDate" | "favoritedAt">("favoritedAt");

  const textPrimary = getTextPrimaryClasses(theme);
  const textSecondary = getTextSecondaryClasses(theme);
  const cardClasses = getCardWithShadowClasses(theme);
  const borderClass = getBorderClasses(theme);

  // Aplicar filtros del lado del cliente
  const filteredFavorites = useMemo(() => {
    let filtered = [...favorites];

    // Filtro por nombre
    if (searchName.trim()) {
      const searchLower = searchName.toLowerCase().trim();
      filtered = filtered.filter(fav =>
        fav.name.toLowerCase().includes(searchLower) ||
        fav.description.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por rango de fechas
    if (dateFrom || dateTo) {
      filtered = filtered.filter(fav => {
        const dateStr = dateFilterType === "publicationDate" 
          ? fav.publicationDate 
          : fav.favoritedAt;
        const favoriteDate = new Date(dateStr);
        
        // Ajustar a inicio del día para comparaciones
        favoriteDate.setHours(0, 0, 0, 0);
        
        if (dateFrom && dateTo) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          return favoriteDate >= fromDate && favoriteDate <= toDate;
        } else if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          return favoriteDate >= fromDate;
        } else if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          return favoriteDate <= toDate;
        }
        return true;
      });
    }

    return filtered;
  }, [favorites, searchName, dateFrom, dateTo, dateFilterType]);

  // Calcular páginas totales basadas en favoritos filtrados
  const filteredTotalPages = Math.max(1, Math.ceil(filteredFavorites.length / size));
  const filteredTotalElements = filteredFavorites.length;

  // Ajustar página si excede el total después del filtrado
  const effectivePage = page >= filteredTotalPages ? 0 : page;

  // Aplicar paginación después del filtrado
  const paginatedFavorites = useMemo(() => {
    const startIndex = effectivePage * size;
    const endIndex = startIndex + size;
    return filteredFavorites.slice(startIndex, endIndex);
  }, [filteredFavorites, effectivePage, size]);

  // Resetear página cuando cambian los filtros o cuando excede el total
  useEffect(() => {
    if (page > 0 && page >= filteredTotalPages) {
      setPage(0);
    }
  }, [filteredTotalPages, page, setPage]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    if (page > 0) {
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName, dateFrom, dateTo, dateFilterType]); // setPage es estable, no necesita estar en deps

  const handleClearFilters = () => {
    setSearchName("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const hasActiveFilters = Boolean(searchName.trim() || dateFrom || dateTo);

  // Función para construir URL de imagen desde el backend
  const getImageUrl = (imageUrl: string): string => {
    if (!imageUrl) return '';
    
    // Si ya es una URL completa, devolverla decodificada
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return decodeURIComponent(imageUrl);
    }
    
    // Construir URL desde el backend
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const cleanFileName = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    return `${baseUrl}/${cleanFileName}`;
  };

  const onViewPublication = (publicationId: number) => {
    navigate(`/marketplace-refactored/publication/${publicationId}`);
  };

  const onNavigateToPublications = () => {
    navigate("/marketplace-refactored/publications");
  };

  const handleRemoveFavorite = async (publicationId: number) => {
    try {
      await removeFavorite(publicationId);
      // Si estamos en una página que quedó vacía después de eliminar, volver a la anterior
      if (paginatedFavorites.length === 1 && effectivePage > 0) {
        setPage(effectivePage - 1);
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${textPrimary}`}>Mis Favoritos</h1>
          <p className={`text-sm ${textSecondary} mt-1`}>Cargando...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${cardClasses} rounded-lg p-4 h-96 animate-pulse`}>
              <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
              <div className="bg-gray-300 h-4 rounded mb-2"></div>
              <div className="bg-gray-300 h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${textPrimary}`}>Mis Favoritos</h1>
        </div>
        <div className={`${cardClasses} rounded-lg p-8 text-center`}>
          <p className="text-red-500">Error al cargar favoritos. Por favor intenta nuevamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${textPrimary}`}>Mis Favoritos</h1>
        <p className={`text-sm ${textSecondary} mt-1`}>
          {hasActiveFilters 
            ? `${filteredTotalElements} de ${totalElements} publicación${totalElements === 1 ? "" : "es"}`
            : `${totalElements} publicación${totalElements === 1 ? "" : "es"} guardada${totalElements === 1 ? "" : "s"}`
          }
        </p>
      </div>

      {/* Filtros */}
      <div className={`${cardClasses} rounded-lg p-4 mb-6`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda por nombre */}
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
              Buscar por nombre
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                className={`w-full pl-10 pr-10 py-2 border ${borderClass} rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-white"} focus:ring-2 focus:ring-[#FF9900] focus:outline-none`}
              />
              {searchName && (
                <button
                  type="button"
                  onClick={() => setSearchName("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Filtro por fecha */}
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
              Filtrar por fecha
            </label>
            <div className="flex gap-2">
              <select
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value as "publicationDate" | "favoritedAt")}
                className={`flex-shrink-0 px-3 py-2 border ${borderClass} rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-white"} focus:ring-2 focus:ring-[#FF9900] focus:outline-none text-sm`}
              >
                <option value="favoritedAt">Fecha guardado</option>
                <option value="publicationDate">Fecha publicación</option>
              </select>
              <div className="flex-1 flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-white"} focus:ring-2 focus:ring-[#FF9900] focus:outline-none text-sm`}
                  placeholder="Desde"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-white"} focus:ring-2 focus:ring-[#FF9900] focus:outline-none text-sm`}
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClearFilters}
                className={`px-4 py-2 border ${borderClass} rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors flex items-center gap-2 ${textPrimary}`}
              >
                <X size={16} />
                Limpiar
              </button>
            </div>
          )}
        </div>
      </div>

  {filteredFavorites.length === 0 ? (
        /* Empty State */
        <div className={`${cardClasses} rounded-lg p-12 text-center`}>
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-24 h-24 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"} rounded-full flex items-center justify-center`}
            >
              {hasActiveFilters ? (
                <Search size={48} className="text-gray-400" />
              ) : (
                <Heart size={48} className="text-gray-400" />
              )}
            </div>
            <h3 className={`text-xl font-semibold ${textPrimary}`}>
              {hasActiveFilters ? "No se encontraron resultados" : "No tienes favoritos aún"}
            </h3>
            <p className={`${textSecondary} max-w-md`}>
              {hasActiveFilters 
                ? "Intenta ajustar los filtros para encontrar tus favoritos"
                : "Empieza a guardar publicaciones que te interesen haciendo clic en el corazón ❤️"
              }
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 text-[#FF9900] hover:text-[#FFB84D] font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                type="button"
                onClick={onNavigateToPublications}
                className="mt-4 bg-[#FF9900] hover:bg-[#FFB84D] active:bg-[#CC7A00] text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <ShoppingBag size={20} />
                Explorar Publicaciones
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Publications Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in-up">
          {paginatedFavorites.map((favorite) => (
            <div
              key={favorite.id}
              className={`${cardClasses} rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200`}
            >
              {/* Imagen */}
              <div className="relative h-48 bg-gray-200">
                {favorite.imageUrls && favorite.imageUrls.length > 0 ? (
                  <img
                    src={getImageUrl(favorite.imageUrls[0])}
                    alt={favorite.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                          </svg>
                        </div>
                      `;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <ShoppingBag size={48} className="text-gray-400" />
                  </div>
                )}
                {/* Botón de favorito */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(favorite.publicationId);
                  }}
                  className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
                  aria-label="Remover de favoritos"
                >
                  <Heart size={20} className="fill-red-500 text-red-500" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={`font-semibold ${textPrimary} line-clamp-2`}>
                    {favorite.name}
                  </h3>
                  <span className="text-lg font-bold text-[#FF9900] whitespace-nowrap">
                    ${favorite.price.toFixed(2)}
                  </span>
                </div>

                <p className={`text-sm ${textSecondary} line-clamp-2 mb-3`}>
                  {favorite.description}
                </p>

                {/* Información adicional del backend */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${textSecondary}`}>
                      {favorite.categoryName}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      favorite.type === "PRODUCT"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    }`}>
                      {favorite.type === "PRODUCT" ? "Producto" : "Servicio"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`${textSecondary}`}>
                      Vendedor: {favorite.vendor.username}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      favorite.availability === "AVAILABLE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}>
                      {favorite.availability === "AVAILABLE" ? "Disponible" : "No disponible"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-400">
                      Publicado: {new Date(favorite.publicationDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-gray-400">
                      Guardado: {new Date(favorite.favoritedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Botón de acción */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => onViewPublication(favorite.publicationId)}
                      className="w-full bg-[#FF9900] hover:bg-[#FFB84D] active:bg-[#CC7A00] text-white font-medium py-2 rounded-lg text-sm transition-all duration-200"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {!isLoading && filteredTotalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, effectivePage - 1))}
              disabled={effectivePage <= 0}
              className={`px-3 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100"} disabled:opacity-50 transition-colors`}
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(filteredTotalPages - 1, effectivePage + 1))}
              disabled={effectivePage >= filteredTotalPages - 1}
              className={`px-3 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100"} disabled:opacity-50 transition-colors`}
            >
              Siguiente
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={`${textSecondary}`}>Página {effectivePage + 1} de {filteredTotalPages}</span>
            <select
              value={size}
              onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
              className={`px-2 py-1 border ${borderClass} rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-white"}`}
            >
              {[5,10,20,50].map((s) => (
                <option key={s} value={s}>{s} / página</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritosPage;
