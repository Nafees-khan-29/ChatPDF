import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize build performance
  experimental: {
    optimizePackageImports: ['@clerk/nextjs', 'gsap', 'lucide-react'],
  },
  
  // Use the new turbopack config instead of experimental.turbo
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  webpack: (config, { isServer, dev }) => {
    // Development-specific optimizations
    if (dev) {
      // Enable faster refresh
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/uploads/**'],
      };
      
      // Reduce bundle size in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    
    // Handle webworker-threads dependency issue
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'webworker-threads': false,
      fs: false,
      path: false,
    };
    
    // Optimize external packages
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }
    
    // Ignore webworker-threads module warnings
    config.ignoreWarnings = [
      {
        module: /node_modules\/natural\/lib\/natural\/classifiers\/classifier_train_parallel\.js/,
        message: /Can't resolve 'webworker-threads'/,
      },
    ];
    
    return config;
  },
  serverExternalPackages: ['natural']
};

export default nextConfig;
