import React from 'react';
import { StyleSheet, SafeAreaView, Platform, View, ActivityIndicator, Text } from 'react-native';
import { Channel, MessageList, MessageInput } from 'stream-chat-expo';
import { useStreamChatContext } from '@infra/stream/stream-provider';
import { useStreamChat } from '@infra/stream/use-stream-chat';
import { authFetch } from '@infra/fetch/auth-fetch';

export default function ChatScreen() {
  const { isReady, error: streamError } = useStreamChatContext();
  const { channel, isConnecting, connectionError } = useStreamChat();

  // Loading state
  if (!isReady || isConnecting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Connecting to Chimera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (streamError || connectionError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Connection Error</Text>
          <Text style={styles.errorDetail}>{streamError || connectionError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No channel yet
  if (!channel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Setting up channel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Intercept send: route message through backend for Gemini processing
  const doSendMessageRequest = async (
    channelInstance: typeof channel,
    message: Parameters<typeof channelInstance.sendMessage>[0],
  ) => {
    // Send user message to Stream channel
    const response = await channelInstance.sendMessage(message);

    // Also send to backend for Gemini AI processing
    const text = message.text;
    if (text) {
      authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      }).catch((e) => console.error('Chat API error:', e));
    }

    return response;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Channel channel={channel} doSendMessageRequest={doSendMessageRequest}>
        <MessageList />
        <MessageInput />
      </Channel>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9AA0AB',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#E8EAED',
    fontSize: 18,
    fontWeight: '600',
  },
  errorDetail: {
    color: '#9AA0AB',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
