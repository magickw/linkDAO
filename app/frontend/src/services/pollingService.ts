
type PollingTask = () => Promise<void>;

interface PollingOptions {
  interval: number;
  runImmediately?: boolean;
}

class PollingService {
  private static instance: PollingService;
  private tasks: Map<string, { callback: PollingTask; intervalId: NodeJS.Timeout | null; delay: number }> = new Map();

  static getInstance(): PollingService {
    if (!PollingService.instance) {
      PollingService.instance = new PollingService();
    }
    return PollingService.instance;
  }

  /**
   * Start polling for a specific task
   * @param id Unique identifier for the task
   * @param callback Async function to execute
   * @param options Polling configuration
   */
  startPolling(id: string, callback: PollingTask, options: PollingOptions = { interval: 30000, runImmediately: true }): void {
    // Stop existing task with same ID if running
    this.stopPolling(id);

    if (options.runImmediately) {
      callback().catch(err => console.error(`[PollingService] Error in immediate run for ${id}:`, err));
    }

    const intervalId = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error(`[PollingService] Error in task ${id}:`, error);
      }
    }, options.interval);

    this.tasks.set(id, { callback, intervalId, delay: options.interval });
    console.log(`[PollingService] Started polling for ${id} every ${options.interval}ms`);
  }

  /**
   * Stop a specific polling task
   */
  stopPolling(id: string): void {
    const task = this.tasks.get(id);
    if (task && task.intervalId) {
      clearInterval(task.intervalId);
      task.intervalId = null;
      this.tasks.set(id, task); // Update state to stopped
      console.log(`[PollingService] Stopped polling for ${id}`);
    }
  }

  /**
   * Stop all polling tasks
   */
  stopAll(): void {
    this.tasks.forEach((task, id) => {
      if (task.intervalId) {
        clearInterval(task.intervalId);
      }
    });
    this.tasks.clear();
    console.log('[PollingService] Stopped all polling tasks');
  }

  /**
   * Check if a task is currently polling
   */
  isPolling(id: string): boolean {
    const task = this.tasks.get(id);
    return !!(task && task.intervalId);
  }
}

export const pollingService = PollingService.getInstance();
export default pollingService;
