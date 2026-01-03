
import { GoogleGenAI, Modality } from "@google/genai";

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let currentAudioSource: AudioBufferSourceNode | null = null;
let audioCtx: AudioContext | null = null;
let speechQueue: string[] = [];
let isProcessingQueue = false;

const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  return audioCtx;
};

export const playChime = async () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.5);
  return new Promise(res => setTimeout(res, 600));
};

export const speakText = async (text: string) => {
  speechQueue.push(text);
  if (!isProcessingQueue) {
    processQueue();
  }
};

const fallbackSpeak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    // Ensure voices are loaded
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      // Prioritize Arabic voices, especially Egyptian or Google ones for better quality
      const allVoices = voices.filter(v => v.lang.includes('ar'));
      console.log('Available Arabic voices:', allVoices.map(v => `${v.name} (${v.lang})`));

      const arabicVoice = voices.find(v => v.lang.includes('ar-EG') && v.name.includes('Google')) ||
                          voices.find(v => v.lang.includes('ar-EG')) ||
                          voices.find(v => v.lang.includes('ar-SA') && v.name.includes('Google')) ||
                          voices.find(v => v.lang.includes('ar') && v.name.includes('Google')) ||
                          voices.find(v => v.lang.includes('ar'));

      if (arabicVoice) {
        console.log('Selected voice:', arabicVoice.name);
        utterance.voice = arabicVoice;
        utterance.lang = arabicVoice.lang;
      } else {
        console.log('No specific Arabic voice found, using default ar-EG');
        utterance.lang = 'ar-EG'; // Fallback to asking for Egyptian
      }

      utterance.rate = 0.85; // Slightly slower for better clarity
      utterance.pitch = 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = speak;
    } else {
      speak();
    }
  });
};

const processQueue = async () => {
  if (speechQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const text = speechQueue.shift()!;
  
  try {
    const apiKey = process.env.API_KEY || localStorage.getItem('gemini_api_key');
    if (!apiKey) throw new Error("No API Key");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (base64Audio) {
      const ctx = getCtx();
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      
      await new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          currentAudioSource = null;
          resolve();
        };
        currentAudioSource = source;
        source.start();
      });
    } else {
       throw new Error("No audio data received");
    }
  } catch (error) {
    console.warn("Audio Queue Error (Gemini), falling back to native TTS:", error);
    await fallbackSpeak(text);
  }

  // معالجة الرسالة التالية في الطابور بعد انتهاء الحالية
  setTimeout(processQueue, 300);
};

export const stopSpeech = () => {
  speechQueue = [];
  if (currentAudioSource) {
    try { currentAudioSource.stop(); } catch (e) {}
    currentAudioSource = null;
  }
  isProcessingQueue = false;
};
