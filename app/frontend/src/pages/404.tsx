import React from 'react';
import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-blue-500">404</h1>
          <h2 className="mt-6 text-3xl font-extrabold text-white">Page not found</h2>
          <p className="mt-4 text-lg text-gray-400">
            The page you're looking for doesn't exist.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Link 
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}