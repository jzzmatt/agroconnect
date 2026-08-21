export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl space-y-4">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          AGROCONNECT • Angola
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-emerald-950">
          Ecossistema Digital para Agricultura
        </h1>
        <p className="text-lg text-emerald-800">
          Conectando especialistas (AgriExpert), formação (AgriAcademy), produtos (AgriShopping) com descoberta geográfica (AgriLocalização).
        </p>
      </div>
    </main>
  );
}
