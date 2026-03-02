const getRecognitionCtor = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const getSpeechSupport = () => {
  if (typeof window === 'undefined') {
    return {
      recognition: false,
      synthesis: false
    };
  }

  return {
    recognition: Boolean(getRecognitionCtor()),
    synthesis: Boolean(window.speechSynthesis)
  };
};

export const createSpeechRecognition = ({
  onTranscript,
  onStart,
  onEnd,
  onError,
  lang = 'en-US'
}) => {
  const RecognitionCtor = getRecognitionCtor();
  if (!RecognitionCtor) {
    return null;
  }

  const recognition = new RecognitionCtor();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    if (onStart) {
      onStart();
    }
  };

  recognition.onend = () => {
    if (onEnd) {
      onEnd();
    }
  };

  recognition.onerror = (event) => {
    if (onError) {
      onError(event);
    }
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || '')
      .join(' ')
      .trim();

    if (transcript && onTranscript) {
      onTranscript(transcript);
    }
  };

  return recognition;
};

export const speakText = (text, options = {}) => {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang || 'en-US';
  utterance.rate = options.rate || 1;
  utterance.pitch = options.pitch || 1;
  window.speechSynthesis.speak(utterance);
  return true;
};

export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};
