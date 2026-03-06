const Spinner = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 w-full">
      {/* Contenedor del Spinner */}
      <div className="relative w-16 h-16">
        {/* Círculo de fondo */}
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
        {/* Círculo animado */}
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-taller-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      {/* Texto de carga */}
      <p className="mt-4 text-gray-500 font-medium animate-pulse">
        Sincronizando datos...
      </p>
    </div>
  );
};

export default Spinner;