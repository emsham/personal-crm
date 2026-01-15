import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { transcribeAudio, TranscriptionResult } from '../services/voiceService';

export type RecordingState = 'idle' | 'recording' | 'processing';
export type PermissionState = 'undetermined' | 'granted' | 'denied';

interface UseVoiceRecordingOptions {
  apiKey: string | undefined;
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceRecordingReturn {
  state: RecordingState;
  permissionStatus: PermissionState;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<TranscriptionResult | null>;
  cancelRecording: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

// Recording configuration optimized for Whisper API
// Use HIGH_QUALITY preset as base for better simulator compatibility
const RECORDING_OPTIONS: Audio.RecordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;

export function useVoiceRecording(
  options: UseVoiceRecordingOptions
): UseVoiceRecordingReturn {
  const { apiKey, onTranscriptionComplete, onError } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('undetermined');
  const [duration, setDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.getPermissionsAsync();
    const granted = status === 'granted';
    setPermissionStatus(granted ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
    return granted;
  }, []);

  const startRecording = useCallback(async () => {
    if (!apiKey) {
      onError?.('OpenAI API key not configured');
      return;
    }

    let hasPermission = await checkPermission();
    if (!hasPermission) {
      hasPermission = await requestPermission();
      if (!hasPermission) {
        onError?.('Microphone permission denied');
        return;
      }
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();

      recordingRef.current = recording;
      setState('recording');
      startTimeRef.current = Date.now();
      setDuration(0);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

    } catch (error) {
      setState('idle');
      onError?.(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [apiKey, checkPermission, requestPermission, onError]);

  const stopRecording = useCallback(async (): Promise<TranscriptionResult | null> => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const recording = recordingRef.current;
    if (!recording || state !== 'recording') {
      setState('idle');
      return null;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setState('processing');

      await recording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No recording URI available');
      }

      const recordingDuration = Date.now() - startTimeRef.current;
      if (recordingDuration < 500) {
        setState('idle');
        setDuration(0);
        return { text: '', success: false, error: 'Recording too short' };
      }

      if (!apiKey) {
        throw new Error('API key not available');
      }

      const result = await transcribeAudio(uri, apiKey);

      setState('idle');
      setDuration(0);

      if (result.success && result.text) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onTranscriptionComplete?.(result.text);
      } else if (result.error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        onError?.(result.error);
      }

      return result;
    } catch (error) {
      setState('idle');
      setDuration(0);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process recording';
      onError?.(errorMessage);
      return { text: '', success: false, error: errorMessage };
    }
  }, [state, apiKey, onTranscriptionComplete, onError]);

  const cancelRecording = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch {
        // Ignore cleanup errors
      }
      recordingRef.current = null;
    }

    setState('idle');
    setDuration(0);
  }, []);

  return {
    state,
    permissionStatus,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission,
  };
}
