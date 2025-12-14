module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-syntax-import-attributes',
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-object-rest-spread',
    '@babel/plugin-transform-optional-chaining',
    '@babel/plugin-transform-nullish-coalescing-operator',
    ['@babel/plugin-transform-runtime', {
      regenerator: true,
    }],
  ],
  // Optimize Babel configuration for large files and Fast Refresh
  compact: false,
  minified: false,
  // Increase limits for large file processing
  generatorOpts: {
    compact: false,
    minified: false,
  },
  // Minimal and safe assumptions for better compatibility and Fast Refresh
  assumptions: {
    noDocumentAll: true,
    noClassCalls: true,
    constantReexports: true,
    constantSuper: true,
    enumerableModuleMeta: true,
    ignoreFunctionLength: true,
    ignoreToPrimitiveHint: true,
    iterableIsArray: true,
    mutableTemplateObject: true,
    noNewArrows: true,
    objectRestNoSymbols: true,
    privateFieldsAsProperties: true,
    pureGetters: true,
    setClassMethods: true,
    setComputedProperties: true,
    setPublicClassFields: true,
    setSpreadProperties: true,
    superIsCallableConstructor: true,
  },
  // Optimize Babel cache for better performance with large files
  sourceMaps: process.env.NODE_ENV === 'development' ? 'inline' : false,
  // Ignore large generated files in Babel processing
  ignore: [
    "**/generated/*.ts",
    "**/generated/**/*.ts"
  ],
};