const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// 4. Add polyfills for WalletConnect
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect ws to react-native-compat
  if (moduleName === 'ws') {
    return context.resolveRequest(
      context,
      '@walletconnect/react-native-compat',
      platform
    );
  }

  // Call the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
