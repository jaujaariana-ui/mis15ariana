import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Xalt Moments</h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
            >
              Panel admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
              Comparte los mejores{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                momentos
              </span>
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Crea galerías colaborativas para tus eventos. Los invitados escanean un QR, suben fotos y todos las ven en tiempo real.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-gray-800"
              >
                Crear un evento
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cómo funciona
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="como-funciona" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Cómo funciona
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 text-2xl font-bold mb-4">
                  1
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Crea tu evento
                </h4>
                <p className="text-gray-600">
                  Configura el nombre, fecha y descripción de tu evento en segundos.
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 text-pink-600 text-2xl font-bold mb-4">
                  2
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Comparte el QR
                </h4>
                <p className="text-gray-600">
                  Genera un código QR y compártelo con tus invitados.
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 text-2xl font-bold mb-4">
                  3
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Disfruta las fotos
                </h4>
                <p className="text-gray-600">
                  Los invitados suben fotos y todos las ven en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          © 2024 Xalt Moments. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
