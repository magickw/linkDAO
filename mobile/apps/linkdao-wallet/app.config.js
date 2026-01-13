export default ({ config }) => {
  return {
    ...config,
    extra: {
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.linkdao.io',
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.linkdao.io/api',
      enableDex: process.env.EXPO_PUBLIC_ENABLE_DEX === 'true',
      etherscanApiKey: process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY,
      eas: {
        projectId: "your-eas-project-id"
      }
    }
  };
};
