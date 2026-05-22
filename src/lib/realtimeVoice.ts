/**
 * OpenAI Realtime API client over WebRTC.
 * - Peer connection: audio in (mic) + audio out (bot voice) on a WebRTC track
 * - Data channel: control events (session config, transcripts, errors)
 * - Server-side VAD handles turn-taking
 *
 * https://platform.openai.com/docs/guides/realtime-webrtc
 */

const REALTIME_MODEL = 'gpt-realtime';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export interface RealtimeHandlers {
  onState: (state: ConnectionState) => void;
  onUserTranscript: (text: string) => void;
  onBotTranscriptDelta: (text: string) => void;
  onBotTranscriptDone: (fullText: string) => void;
  onError: (message: string) => void;
}

export interface RealtimeSession {
  stop: () => void;
}

export async function startRealtimeSession({
  apiKey,
  systemPrompt,
  voice,
  handlers,
}: {
  apiKey: string;
  systemPrompt: string;
  voice: string;
  handlers: RealtimeHandlers;
}): Promise<RealtimeSession> {
  handlers.onState('connecting');

  // GA Realtime API: direct SDP exchange with the project key.
  // (The beta /v1/realtime/sessions ephemeral-key flow is deprecated.)

  const pc = new RTCPeerConnection();

  // Audio element for the bot's voice output
  const audioEl = document.createElement('audio');
  audioEl.autoplay = true;
  document.body.appendChild(audioEl);

  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
  };

  // Capture mic audio
  let micStream: MediaStream | null = null;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream.getTracks().forEach((track) => pc.addTrack(track, micStream!));
  } catch (e) {
    handlers.onError('Microphone access denied — allow it in the browser permissions and retry.');
    handlers.onState('error');
    pc.close();
    audioEl.remove();
    throw e;
  }

  // Data channel for events
  const dc = pc.createDataChannel('oai-events');

  let botBuffer = '';

  dc.onopen = () => {
    // Configure session over the data channel
    dc.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          instructions: systemPrompt,
          voice,
          modalities: ['audio', 'text'],
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
      }),
    );
    handlers.onState('connected');
  };

  dc.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      switch (event.type) {
        case 'conversation.item.input_audio_transcription.completed':
          if (event.transcript) handlers.onUserTranscript(event.transcript);
          break;
        case 'response.audio_transcript.delta':
          if (typeof event.delta === 'string') {
            botBuffer += event.delta;
            handlers.onBotTranscriptDelta(event.delta);
          }
          break;
        case 'response.audio_transcript.done':
          handlers.onBotTranscriptDone(botBuffer);
          botBuffer = '';
          break;
        case 'error':
          handlers.onError(event.error?.message ?? 'Realtime error');
          break;
      }
    } catch {
      /* ignore non-JSON */
    }
  };

  dc.onerror = () => handlers.onError('Data channel error');
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      handlers.onError(`Connection ${pc.iceConnectionState}`);
      handlers.onState('error');
    }
  };

  // Negotiate
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // GA WebRTC endpoint — JSON body with session config + sdp.
  const sdpResponse = await fetch(
    `https://api.openai.com/v1/realtime/calls`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          voice,
          instructions: systemPrompt,
          modalities: ['audio', 'text'],
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
        sdp: offer.sdp,
      }),
    },
  );

  if (!sdpResponse.ok) {
    const err = await sdpResponse.text();
    let detail = err.slice(0, 500);
    try {
      const parsed = JSON.parse(err);
      detail = parsed.error?.message ?? detail;
    } catch {
      /* not JSON */
    }
    handlers.onError(`OpenAI ${sdpResponse.status}: ${detail}`);
    handlers.onState('error');
    micStream.getTracks().forEach((t) => t.stop());
    pc.close();
    audioEl.remove();
    throw new Error(`Realtime negotiation failed: ${sdpResponse.status} — ${detail}`);
  }

  // Response may be JSON {sdp: ...} or raw SDP — handle both.
  const rawResponse = await sdpResponse.text();
  let answerSdp = rawResponse;
  try {
    const parsed = JSON.parse(rawResponse);
    if (typeof parsed?.sdp === 'string') answerSdp = parsed.sdp;
  } catch {
    /* not JSON — treat as raw SDP */
  }
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  return {
    stop: () => {
      try {
        dc.close();
      } catch {
        /* noop */
      }
      micStream?.getTracks().forEach((t) => t.stop());
      pc.close();
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      handlers.onState('idle');
    },
  };
}
