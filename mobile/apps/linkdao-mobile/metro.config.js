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

// 4. Add resolver aliases for Node.js modules
config.resolver.alias = {
  ws: 'react-native-url-polyfill',
  stream: 'readable-stream',
  crypto: 'react-native-crypto',
};

// 5. Add extraNodeModules to handle node: prefixed modules
config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-crypto'),
  stream: require.resolve('readable-stream'),
  http: require.resolve('react-native-http'),
  https: require.resolve('react-native-https'),
  net: require.resolve('react-native-tcp'),
  tls: require.resolve('react-native-tls'),
};

module.exports = config;
