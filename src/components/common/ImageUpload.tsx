import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  onExistingImagesChange?: (urls: string[]) => void; // Callback para imágenes existentes
  maxImages?: number;
  minImages?: number;
  error?: string;
  theme?: "light" | "dark";
  existingImageUrls?: string[]; // URLs de imágenes existentes del backend
}

/**
 * ImageUpload - Componente para cargar múltiples imágenes con preview
 * Permite cargar entre 1 y 5 imágenes, mostrar previews y eliminar individualmente
 * Soporta mostrar imágenes existentes del backend
 */
const ImageUpload = ({
  onImagesChange,
  onExistingImagesChange,
  maxImages = 5,
  minImages = 1,
  error,
  theme = "light",
  existingImageUrls = [],
}: ImageUploadProps) => {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar imágenes existentes cuando se proporcionen
  useEffect(() => {
    if (existingImageUrls.length > 0) {
      setExistingImages(existingImageUrls);

      // Notificar al componente padre sobre las imágenes iniciales
      if (onExistingImagesChange) {
        onExistingImagesChange(existingImageUrls);
      }
    }
  }, [existingImageUrls]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > maxImages) {
      alert(`Solo puedes tener un máximo de ${maxImages} imágenes en total`);
      return;
    }

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesChange(updatedImages.map((img) => img.file));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    // Revoke object URL to free memory
    URL.revokeObjectURL(images[index].preview);

    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages.map((img) => img.file));
  };

  const handleRemoveExistingImage = (index: number) => {
    const updatedExistingImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(updatedExistingImages);

    // Notificar al componente padre sobre el cambio
    if (onExistingImagesChange) {
      onExistingImagesChange(updatedExistingImages);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Construct full image URL
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8090";
  const getImageUrl = (imageUrl: string) => {
    // Si ya es una URL completa (Azure Blob Storage), retornarla decodificada
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return decodeURIComponent(imageUrl);
    }
    // Si es una ruta relativa, construir la URL con el backend
    const cleanFileName = imageUrl.startsWith("/")
      ? imageUrl.substring(1)
      : imageUrl;
    return `${baseUrl}/${cleanFileName}`;
  };

  const totalImages = existingImages.length + images.length;

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div
        onClick={handleUploadClick}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${error ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}
          ${
            theme === "dark"
              ? "border-gray-600 hover:border-gray-500 bg-gray-800 hover:bg-gray-750"
              : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload
          className={`mx-auto mb-3 ${error ? "text-red-500" : "text-gray-400"}`}
          size={40}
        />
        <p
          className={`text-sm font-medium mb-1 ${
            error
              ? "text-red-600 dark:text-red-400"
              : theme === "dark"
                ? "text-gray-300"
                : "text-gray-700"
          }`}
        >
          {totalImages === 0
            ? "Haz clic para cargar imágenes"
            : `${totalImages}/${maxImages} imágenes cargadas`}
        </p>
        <p
          className={`text-xs ${
            error
              ? "text-red-500 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Formatos permitidos: PNG, JPG, JPEG
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Image Previews Grid */}
      {totalImages > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Existing Images from Backend */}
          {existingImages.map((imageUrl, index) => (
            <div
              key={`existing-${index}`}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              }`}
            >
              {/* Image Preview */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                <img
                  src={getImageUrl(imageUrl)}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemoveExistingImage(index)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Eliminar imagen"
              >
                <X size={16} />
              </button>

              {/* Image Number Badge */}
              <div
                className={`absolute bottom-1 left-1 ${
                  theme === "dark" ? "bg-gray-900" : "bg-white"
                } bg-opacity-80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {index + 1}
              </div>

              {/* Existing Image Badge */}
              <div className="absolute top-1 left-1 bg-blue-500 bg-opacity-90 px-2 py-0.5 rounded text-xs font-medium text-white">
                Actual
              </div>
            </div>
          ))}

          {/* New Images */}
          {images.map((image, index) => (
            <div
              key={`new-${index}`}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              }`}
            >
              {/* Image Preview */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                <img
                  src={image.preview}
                  alt={`Preview ${existingImages.length + index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Eliminar imagen"
              >
                <X size={16} />
              </button>

              {/* Image Number Badge */}
              <div
                className={`absolute bottom-1 left-1 ${
                  theme === "dark" ? "bg-gray-900" : "bg-white"
                } bg-opacity-80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {existingImages.length + index + 1}
              </div>

              {/* New Image Badge */}
              <div className="absolute top-1 left-1 bg-green-500 bg-opacity-90 px-2 py-0.5 rounded text-xs font-medium text-white">
                Nueva
              </div>
            </div>
          ))}

          {/* Add More Button */}
          {totalImages < maxImages && (
            <button
              type="button"
              onClick={handleUploadClick}
              className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                theme === "dark"
                  ? "border-gray-600 hover:border-gray-500 bg-gray-800 hover:bg-gray-750"
                  : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <ImageIcon
                className={theme === "dark" ? "text-gray-400" : "text-gray-500"}
                size={24}
              />
              <span
                className={`text-xs font-medium ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Agregar
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
