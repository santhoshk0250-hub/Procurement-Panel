import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-3">
          <button  className="w-full">
            <Link href="/">
              Go to homepage
            </Link>
          </button>
          <button  className="w-full">
            <Link href="/dashboard">
              Go to dashboard
            </Link>
          </button>
        </div>
      </div>
    </div>
  );
}
