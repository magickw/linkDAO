/**
 * Accessibility Controls Component
 * Provides comprehensive accessibility controls and settings interface
 */

import React, { useState, useEffect } from 'react';
import {
  AdjustmentsHorizontalIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  EyeIcon,
  HandRaisedIcon,
  LightBulbIcon,
  XMarkIcon,
  CheckIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { accessibilityService, AccessibilityPreferences } from '../../services/accessibilityService';

interface AccessibilityControlsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  isOpen,
  onClose
}) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    accessibilityService.getPreferences()
  );
  const [isListening, setIsListening] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeTab, setActiveTab] = useState<'visual' | 'audio' | 'motor' | 'cognitive' | 'voice'>('visual');

  useEffect(() => {
    // Load available voices
    const voices = accessibilityService.getAvailableVoices();
    setAvailableVoices(voices);

    // Listen for preference changes
    const handlePreferenceChange = (event: CustomEvent) => {
      setPreferences(event.detail);
    };

    window.addEventListener('accessibility-preferences-changed', handlePreferenceChange as EventListener);

    return () => {
      window.removeEventListener('accessibility-preferences-changed', handlePreferenceChange as EventListener);
    };
  }, []);

  const updatePreference = <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    accessibilityService.updatePreferences({ [key]: value });
  };

  const handleVoiceNavigationToggle = () => {
    if (isListening) {
      accessibilityService.stopVoiceNavigation();
      setIsListening(false);
    } else {
      accessibilityService.startVoiceNavigation();
      setIsListening(true);
    }
  };

  const handleReadPageToggle = () => {
    if (isReading) {
      accessibilityService.stopReading();
      setIsReading(false);
    } else {
      accessibilityService.readPageContent();
      setIsReading(true);
    }
  };

  const testVoice = () => {
    accessibilityService.speak('This is a test of the text-to-speech functionality.');
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'visual', label: 'Visual', icon: EyeIcon },
    { id: 'audio', label: 'Audio', icon: SpeakerWaveIcon },
    { id: 'motor', label: 'Motor', icon: HandRaisedIcon },
    { id: 'cognitive', label: 'Cognitive', icon: LightBulbIcon },
    { id: 'voice', label: 'Voice', icon: MicrophoneIcon }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Accessibility Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200">
              <nav className="p-4 space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Visual Accessibility */}
              {activeTab === 'visual' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Visual Accessibility</h3>
                  
                  {/* High Contrast */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">High Contrast Mode</label>
                      <p className="text-sm text-gray-600">Increase contrast for better visibility</p>
                    </div>
                    <button
                      onClick={() => updatePreference('highContrast', !preferences.highContrast)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.highContrast ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">Font Size</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updatePreference('fontSize', size)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            preferences.fontSize === size
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Magnification */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      Magnification: {preferences.magnification}x
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={preferences.magnification}
                      onChange={(e) => updatePreference('magnification', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Reduced Motion */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Reduced Motion</label>
                      <p className="text-sm text-gray-600">Minimize animations and transitions</p>
                    </div>
                    <button
                      onClick={() => updatePreference('reducedMotion', !preferences.reducedMotion)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.reducedMotion ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Color Blindness Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">Color Blindness Filter</label>
                    <select
                      value={preferences.colorBlindnessFilter}
                      onChange={(e) => updatePreference('colorBlindnessFilter', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">None</option>
                      <option value="protanopia">Protanopia (Red-blind)</option>
                      <option value="deuteranopia">Deuteranopia (Green-blind)</option>
                      <option value="tritanopia">Tritanopia (Blue-blind)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Audio Accessibility */}
              {activeTab === 'audio' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Audio Accessibility</h3>
                  
                  {/* Audio Reading */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Audio Reading</label>
                      <p className="text-sm text-gray-600">Enable text-to-speech for content</p>
                    </div>
                    <button
                      onClick={() => updatePreference('audioReading', !preferences.audioReading)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.audioReading ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.audioReading ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reading Speed */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      Reading Speed: {preferences.audioSpeed}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={preferences.audioSpeed}
                      onChange={(e) => updatePreference('audioSpeed', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Voice Selection */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">Voice</label>
                    <select
                      value={preferences.audioVoice}
                      onChange={(e) => updatePreference('audioVoice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="default">Default</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Test Voice */}
                  <div className="flex space-x-3">
                    <button
                      onClick={testVoice}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <PlayIcon className="h-4 w-4" />
                      <span>Test Voice</span>
                    </button>
                    
                    <button
                      onClick={handleReadPageToggle}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isReading
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isReading ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                      <span>{isReading ? 'Stop Reading' : 'Read Page'}</span>
                    </button>
                  </div>

                  {/* Sound Effects */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Sound Effects</label>
                      <p className="text-sm text-gray-600">Enable audio feedback for interactions</p>
                    </div>
                    <button
                      onClick={() => updatePreference('soundEffects', !preferences.soundEffects)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.soundEffects ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.soundEffects ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Motor Accessibility */}
              {activeTab === 'motor' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Motor Accessibility</h3>
                  
                  {/* Alternative Input */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Alternative Input Methods</label>
                      <p className="text-sm text-gray-600">Enable alternative ways to interact</p>
                    </div>
                    <button
                      onClick={() => updatePreference('alternativeInput', !preferences.alternativeInput)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.alternativeInput ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.alternativeInput ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dwell Time */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      Dwell Time: {preferences.dwellTime}ms
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="3000"
                      step="100"
                      value={preferences.dwellTime}
                      onChange={(e) => updatePreference('dwellTime', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Time to hover before activation
                    </p>
                  </div>

                  {/* Keyboard Navigation */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Enhanced Keyboard Navigation</label>
                      <p className="text-sm text-gray-600">Improve keyboard-only navigation</p>
                    </div>
                    <button
                      onClick={() => updatePreference('keyboardNavigation', !preferences.keyboardNavigation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.keyboardNavigation ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sticky Keys */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Sticky Keys</label>
                      <p className="text-sm text-gray-600">Press modifier keys one at a time</p>
                    </div>
                    <button
                      onClick={() => updatePreference('stickyKeys', !preferences.stickyKeys)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.stickyKeys ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.stickyKeys ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Cognitive Accessibility */}
              {activeTab === 'cognitive' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Cognitive Accessibility</h3>
                  
                  {/* Simplified Interface */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Simplified Interface</label>
                      <p className="text-sm text-gray-600">Reduce complexity and distractions</p>
                    </div>
                    <button
                      onClick={() => updatePreference('simplifiedInterface', !preferences.simplifiedInterface)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.simplifiedInterface ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.simplifiedInterface ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Focus Assist */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Focus Assist</label>
                      <p className="text-sm text-gray-600">Highlight focused elements and provide audio cues</p>
                    </div>
                    <button
                      onClick={() => updatePreference('focusAssist', !preferences.focusAssist)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.focusAssist ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.focusAssist ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reading Guide */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Reading Guide</label>
                      <p className="text-sm text-gray-600">Visual guide to help track reading position</p>
                    </div>
                    <button
                      onClick={() => updatePreference('readingGuide', !preferences.readingGuide)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.readingGuide ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.readingGuide ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Auto Scroll */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Auto Scroll</label>
                      <p className="text-sm text-gray-600">Automatically scroll content while reading</p>
                    </div>
                    <button
                      onClick={() => updatePreference('autoScroll', !preferences.autoScroll)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.autoScroll ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.autoScroll ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Navigation */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Voice Navigation</h3>
                  
                  {/* Voice Navigation Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Voice Navigation</label>
                      <p className="text-sm text-gray-600">Control the interface with voice commands</p>
                    </div>
                    <button
                      onClick={() => updatePreference('voiceNavigation', !preferences.voiceNavigation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.voiceNavigation ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.voiceNavigation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Voice Commands */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Voice Commands</label>
                      <p className="text-sm text-gray-600">Enable extended voice command set</p>
                    </div>
                    <button
                      onClick={() => updatePreference('voiceCommands', !preferences.voiceCommands)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.voiceCommands ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.voiceCommands ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Voice Sensitivity */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      Voice Sensitivity: {Math.round(preferences.voiceSensitivity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={preferences.voiceSensitivity}
                      onChange={(e) => updatePreference('voiceSensitivity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Voice Control Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleVoiceNavigationToggle}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isListening
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <MicrophoneIcon className="h-4 w-4" />
                      <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                    </button>
                  </div>

                  {/* Voice Commands Help */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Available Voice Commands</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>"Go home"</strong> - Navigate to home page</p>
                      <p><strong>"Go back"</strong> - Go to previous page</p>
                      <p><strong>"Scroll up/down"</strong> - Scroll the page</p>
                      <p><strong>"Read page"</strong> - Read current content aloud</p>
                      <p><strong>"Stop reading"</strong> - Stop audio reading</p>
                      <p><strong>"Click"</strong> - Activate focused element</p>
                      <p><strong>"Next/Previous"</strong> - Navigate between elements</p>
                      <p><strong>"Help"</strong> - Show all available commands</p>
                    </div>
                  </div>

                  {/* Feature Support Status */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Feature Support</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        {accessibilityService.isFeatureSupported('speech-synthesis') ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-red-600" />
                        )}
                        <span>Text-to-Speech</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {accessibilityService.isFeatureSupported('speech-recognition') ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-red-600" />
                        )}
                        <span>Speech Recognition</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Settings are automatically saved
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};