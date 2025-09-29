import React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';

const ButtonTestSimple = () => {
  const router = useRouter();
  const { addToast } = useToast();

  return (
    <div style={{ 
      padding: '50px', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px'
    }}>
      <h1 style={{ color: 'white', textAlign: 'center' }}>Simple Button Test</h1>
      
      <Button 
        variant="primary" 
        onClick={() => {
          console.log('Primary button clicked!');
          alert('Primary button works!');
        }}
      >
        Test Primary Button
      </Button>
      
      <Button 
        variant="secondary" 
        onClick={() => {
          console.log('Secondary button clicked!');
          addToast('Secondary button works!', 'success');
        }}
      >
        Test Secondary Button (Toast)
      </Button>
      
      <Button 
        variant="outline" 
        onClick={() => {
          console.log('Router button clicked!');
          router.push('/');
        }}
      >
        Test Router Navigation
      </Button>

      <button
        onClick={() => {
          console.log('Native button clicked!');
          alert('Native button works!');
        }}
        style={{
          padding: '12px 24px',
          background: 'blue',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Native HTML Button
      </button>

      <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>
        All buttons should work. Check console for click events.
      </p>
    </div>
  );
};

export default ButtonTestSimple;