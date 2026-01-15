const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface TranscriptionResult {
  text: string;
  success: boolean;
  error?: string;
}

export async function transcribeAudio(
  audioUri: string,
  apiKey: string
): Promise<TranscriptionResult> {
  try {
    const formData = new FormData();

    // Determine file extension from URI
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const mimeType = filename.endsWith('.m4a') ? 'audio/m4a' : 'audio/wav';

    formData.append('file', {
      uri: audioUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    formData.append('model', 'whisper-1');

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        text: '',
        success: false,
        error: error.error?.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      text: data.text?.trim() || '',
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
