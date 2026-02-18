import type { DeepPartial, Theme } from 'stream-chat-expo';

export const wolfTheme: DeepPartial<Theme> = {
  colors: {
    bg_gradient_end: '#0D0D0F',
    bg_gradient_start: '#0D0D0F',
    black: '#E8EAED',
    blue_alice: '#1A1D22',
    grey: '#5C6370',
    grey_dark: '#9AA0AB',
    grey_gainsboro: '#1E2025',
    grey_whisper: '#151618',
    white: '#0D0D0F',
    white_snow: '#111214',
    white_smoke: '#151618',
  },
  messageSimple: {
    content: {
      containerInner: {
        backgroundColor: '#1A1D22',
        borderColor: '#2A2D32',
      },
      textContainer: {
        backgroundColor: 'transparent',
      },
    },
    card: {
      container: {
        backgroundColor: '#1A1D22',
      },
    },
  },
  messageInput: {
    container: {
      backgroundColor: '#1E2025',
      borderColor: '#2A2D32',
    },
    inputBox: {
      backgroundColor: '#151618',
      color: '#E8EAED',
    },
    sendButton: {
      tintColor: '#4A90E2',
    },
  },
  channelListMessenger: {
    flatList: {
      backgroundColor: '#0D0D0F',
    },
  },
  messageList: {
    container: {
      backgroundColor: '#0D0D0F',
    },
  },
};
