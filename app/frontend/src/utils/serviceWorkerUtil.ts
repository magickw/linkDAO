export class ServiceWorkerUtil {
  private registration: ServiceWorkerRegistration | null = null;

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker is not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return !!this.registration.installing;
    } catch (error) {
      console.warn('Failed to check for Service Worker updates:', error);
      return false;
    }
  }

  async unregister(): Promise<void> {
    if (!this.registration) return;

    try {
      const success = await this.registration.unregister();
      if (success) {
        console.log('Service Worker successfully unregistered');
        this.registration = null;
      } else {
        console.warn('Service Worker unregistration failed');
      }
    } catch (error) {
      console.error('Error unregistering Service Worker:', error);
      throw error;
    }
  }
}