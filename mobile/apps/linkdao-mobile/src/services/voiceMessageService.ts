/**
 * Voice Message Service
 * 
 * Provides voice recording, playback, and storage for chat messages.
 * 
 * Features:
 * - Voice recording with visual feedback
 * - Voice playback with controls
 * - Voice message compression
 * - Voice-to-text transcription
 * - Voice message storage
 * - Playback speed control
 */

import { Platform } from 'react-native';
import apiClient from './apiClient';

// Voice message status
export enum VoiceMessageStatus {
  RECORDING = 'recording',
  PROCESSING = 'processing',
  READY = 'ready',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ERROR = 'error',
}

// Voice message quality
export enum VoiceQuality {
  LOW = 'low',       // 8 kbps, smallest file size
  MEDIUM = 'medium', // 16 kbps, balanced
  HIGH = 'high',     // 32 kbps, best quality
}

// Voice message info
export interface VoiceMessage {
  id: string;
  conversationId: string;
  senderId: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  url: string;
  thumbnailUrl?: string;
  transcript?: string;
  transcriptLanguage?: string;
  waveform: number[]; // Audio waveform data
  timestamp: Date;
  status: VoiceMessageStatus;
  quality: VoiceQuality;
}

// Recording state
export interface RecordingState {
  isRecording: boolean;
  duration: number;
  amplitude: number; // Current audio amplitude
  waveform: number[]; // Real-time waveform data
}

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
}

// Recording options
export interface RecordingOptions {
  quality?: VoiceQuality;
  maxDuration?: number; // in seconds
  enableTranscription?: boolean;
  transcriptionLanguage?: string;
}

// Playback options
export interface PlaybackOptions {
  speed?: number; // 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
  startPosition?: number; // in seconds
}

class VoiceMessageService {
  private currentRecording: RecordingState = {
    isRecording: false,
    duration: 0,
    amplitude: 0,
    waveform: [],
  };

  private playbackStates: Map<string, PlaybackState> = new Map();
  private recordingTimer: NodeJS.Timeout | null = null;
  private waveformInterval: NodeJS.Timeout | null = null;

  /**
   * Start recording
   */
  async startRecording(options: RecordingOptions = {}): Promise<string> {
    try {
      if (this.currentRecording.isRecording) {
        throw new Error('Already recording');
      }

      // In a real implementation, this would:
      // - Request microphone permissions
      // - Initialize audio recorder
      // - Start recording with specified quality

      this.currentRecording = {
        isRecording: true,
        duration: 0,
        amplitude: 0,
        waveform: [],
      };

      // Start duration timer
      this.recordingTimer = setInterval(() => {
        this.currentRecording.duration += 0.1;
        
        // Check max duration
        if (options.maxDuration && this.currentRecording.duration >= options.maxDuration) {
          this.stopRecording();
        }
      }, 100);

      // Start waveform capture
      this.waveformInterval = setInterval(() => {
        // Capture audio amplitude and update waveform
        this.currentRecording.waveform.push(this.currentRecording.amplitude);
        
        // Keep waveform at reasonable size
        if (this.currentRecording.waveform.length > 100) {
          this.currentRecording.waveform.shift();
        }
      }, 50);

      return `recording-${Date.now()}`;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording');
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<VoiceMessage> {
    try {
      if (!this.currentRecording.isRecording) {
        throw new Error('Not recording');
      }

      // Clear timers
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }

      if (this.waveformInterval) {
        clearInterval(this.waveformInterval);
        this.waveformInterval = null;
      }

      // In a real implementation, this would:
      // - Stop recording
      // - Process audio file
      // - Compress if needed
      // - Generate waveform
      // - Upload to storage
      // - Optionally transcribe

      const voiceMessage: VoiceMessage = {
        id: `voice-${Date.now()}`,
        conversationId: '',
        senderId: '',
        duration: this.currentRecording.duration,
        fileSize: Math.floor(this.currentRecording.duration * 16000), // Approximate
        url: 'https://example.com/voice-message.mp3',
        waveform: this.currentRecording.waveform,
        timestamp: new Date(),
        status: VoiceMessageStatus.READY,
        quality: VoiceQuality.MEDIUM,
      };

      // Reset recording state
      this.currentRecording = {
        isRecording: false,
        duration: 0,
        amplitude: 0,
        waveform: [],
      };

      return voiceMessage;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw new Error('Failed to stop recording');
    }
  }

  /**
   * Cancel recording
   */
  async cancelRecording(): Promise<void> {
    try {
      if (!this.currentRecording.isRecording) {
        return;
      }

      // Clear timers
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }

      if (this.waveformInterval) {
        clearInterval(this.waveformInterval);
        this.waveformInterval = null;
      }

      // Reset recording state
      this.currentRecording = {
        isRecording: false,
        duration: 0,
        amplitude: 0,
        waveform: [],
      };
    } catch (error) {
      console.error('Error canceling recording:', error);
      throw new Error('Failed to cancel recording');
    }
  }

  /**
   * Get recording state
   */
  getRecordingState(): RecordingState {
    return { ...this.currentRecording };
  }

  /**
   * Play voice message
   */
  async playMessage(
    messageId: string,
    options: PlaybackOptions = {}
  ): Promise<void> {
    try {
      if (!this.playbackStates.has(messageId)) {
        this.playbackStates.set(messageId, {
          isPlaying: false,
          isPaused: false,
          currentTime: options.startPosition || 0,
          duration: 0,
          playbackSpeed: options.speed || 1.0,
        });
      }

      const state = this.playbackStates.get(messageId)!;
      state.isPlaying = true;
      state.isPaused = false;

      // In a real implementation, this would:
      // - Initialize audio player
      // - Load audio file
      // - Start playback at specified position
      // - Set playback speed
      // - Monitor playback progress

      // Simulate playback
      const playbackInterval = setInterval(() => {
        const currentState = this.playbackStates.get(messageId);
        if (!currentState || !currentState.isPlaying) {
          clearInterval(playbackInterval);
          return;
        }

        currentState.currentTime += 0.1;
        
        // End of playback
        if (currentState.currentTime >= currentState.duration) {
          currentState.isPlaying = false;
          currentState.currentTime = 0;
          clearInterval(playbackInterval);
        }
      }, 100);
    } catch (error) {
      console.error('Error playing voice message:', error);
      throw new Error('Failed to play voice message');
    }
  }

  /**
   * Pause playback
   */
  async pauseMessage(messageId: string): Promise<void> {
    try {
      const state = this.playbackStates.get(messageId);
      if (state) {
        state.isPlaying = false;
        state.isPaused = true;
      }
    } catch (error) {
      console.error('Error pausing voice message:', error);
      throw new Error('Failed to pause voice message');
    }
  }

  /**
   * Resume playback
   */
  async resumeMessage(messageId: string): Promise<void> {
    try {
      const state = this.playbackStates.get(messageId);
      if (state) {
        state.isPlaying = true;
        state.isPaused = false;
      }
    } catch (error) {
      console.error('Error resuming voice message:', error);
      throw new Error('Failed to resume voice message');
    }
  }

  /**
   * Stop playback
   */
  async stopMessage(messageId: string): Promise<void> {
    try {
      const state = this.playbackStates.get(messageId);
      if (state) {
        state.isPlaying = false;
        state.isPaused = false;
        state.currentTime = 0;
      }
    } catch (error) {
      console.error('Error stopping voice message:', error);
      throw new Error('Failed to stop voice message');
    }
  }

  /**
   * Seek to position
   */
  async seekTo(messageId: string, position: number): Promise<void> {
    try {
      const state = this.playbackStates.get(messageId);
      if (state) {
        state.currentTime = Math.max(0, Math.min(position, state.duration));
      }
    } catch (error) {
      console.error('Error seeking voice message:', error);
      throw new Error('Failed to seek voice message');
    }
  }

  /**
   * Set playback speed
   */
  async setPlaybackSpeed(messageId: string, speed: number): Promise<void> {
    try {
      const state = this.playbackStates.get(messageId);
      if (state) {
        state.playbackSpeed = Math.max(0.5, Math.min(speed, 2.0));
      }
    } catch (error) {
      console.error('Error setting playback speed:', error);
      throw new Error('Failed to set playback speed');
    }
  }

  /**
   * Get playback state
   */
  getPlaybackState(messageId: string): PlaybackState | undefined {
    return this.playbackStates.get(messageId);
  }

  /**
   * Get all playback states
   */
  getAllPlaybackStates(): Map<string, PlaybackState> {
    return new Map(this.playbackStates);
  }

  /**
   * Upload voice message
   */
  async uploadVoiceMessage(
    voiceMessage: VoiceMessage,
    conversationId: string
  ): Promise<VoiceMessage> {
    try {
      const response = await apiClient.post('/voice-messages/upload', {
        conversationId,
        voiceMessage,
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading voice message:', error);
      throw new Error('Failed to upload voice message');
    }
  }

  /**
   * Transcribe voice message
   */
  async transcribeVoiceMessage(
    messageId: string,
    language: string = 'en-US'
  ): Promise<string> {
    try {
      const response = await apiClient.post(`/voice-messages/${messageId}/transcribe`, {
        language,
      });

      return response.data.transcript;
    } catch (error) {
      console.error('Error transcribing voice message:', error);
      throw new Error('Failed to transcribe voice message');
    }
  }

  /**
   * Delete voice message
   */
  async deleteVoiceMessage(messageId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/voice-messages/${messageId}`);
      
      // Clean up playback state
      this.playbackStates.delete(messageId);
      
      return true;
    } catch (error) {
      console.error('Error deleting voice message:', error);
      throw new Error('Failed to delete voice message');
    }
  }

  /**
   * Format duration
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  /**
   * Get quality bit rate
   */
  getQualityBitRate(quality: VoiceQuality): number {
    const bitRates: Record<VoiceQuality, number> = {
      [VoiceQuality.LOW]: 8000,
      [VoiceQuality.MEDIUM]: 16000,
      [VoiceQuality.HIGH]: 32000,
    };
    return bitRates[quality];
  }

  /**
   * Estimate file size
   */
  estimateFileSize(duration: number, quality: VoiceQuality): number {
    const bitRate = this.getQualityBitRate(quality);
    return Math.floor((duration * bitRate) / 8);
  }

  /**
   * Check microphone permissions
   */
  async checkMicrophonePermissions(): Promise<boolean> {
    // In a real implementation, this would check actual permissions
    return true;
  }

  /**
   * Request microphone permissions
   */
  async requestMicrophonePermissions(): Promise<boolean> {
    // In a real implementation, this would request actual permissions
    return true;
  }

  /**
   * Clear all states
   */
  clearAllStates(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.waveformInterval) {
      clearInterval(this.waveformInterval);
      this.waveformInterval = null;
    }

    this.currentRecording = {
      isRecording: false,
      duration: 0,
      amplitude: 0,
      waveform: [],
    };

    this.playbackStates.clear();
  }
}

// Export singleton instance
export const voiceMessageService = new VoiceMessageService();

export default voiceMessageService;