import { GetServerSideProps } from 'next';
import { ENV_CONFIG } from '@/config/environment';

interface TestEnvPageProps {
  serverEnv: {
    backendUrl: string;
    apiUrl: string;
    wsUrl: string;
    nodeEnv: string;
  };
}

export default function TestEnvPage({ serverEnv }: TestEnvPageProps) {
  // Client-side environment variables
  const clientEnv = {
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    wsUrl: process.env.NEXT_PUBLIC_WS_URL,
    nodeEnv: process.env.NODE_ENV,
    envConfigBackendUrl: ENV_CONFIG.BACKEND_URL,
    envConfigApiUrl: ENV_CONFIG.API_URL,
    envConfigWsUrl: ENV_CONFIG.WS_URL,
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Test</h1>
      
      <h2>Client-side Environment Variables:</h2>
      <pre>{JSON.stringify(clientEnv, null, 2)}</pre>
      
      <h2>Server-side Environment Variables:</h2>
      <pre>{JSON.stringify(serverEnv, null, 2)}</pre>
      
      <h2>API Test:</h2>
      <button onClick={testApiConnection}>Test API Connection</button>
      <div id="api-result"></div>
    </div>
  );
  
  async function testApiConnection() {
    const resultDiv = document.getElementById('api-result');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
      const data = await response.json();
      resultDiv.innerHTML = `<pre style="color: green;">API Connection Success: ${JSON.stringify(data, null, 2)}</pre>`;
    } catch (error) {
      resultDiv.innerHTML = `<pre style="color: red;">API Connection Failed: ${error.message}</pre>`;
    }
  }
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      serverEnv: {
        backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        wsUrl: process.env.NEXT_PUBLIC_WS_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    }
  };
};