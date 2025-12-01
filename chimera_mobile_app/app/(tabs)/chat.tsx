import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar, View , KeyboardAvoidingView} from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';

// !!! PASTE YOUR RENDER URL HERE !!!
// Example: 'https://chimera-backend.onrender.com/v1/chat'
const BACKEND_URL = 'https://trainer-2-0.onrender.com/v1/chat';

export default function HomeScreen() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'System Online. Ready to train.',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Chimera',
          avatar: 'https://placeimg.com/140/140/any', // Placeholder avatar
        },
      },
    ]);
  }, []);

  const onSend = useCallback((newMessages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    const userMessage = newMessages[0].text;

    // Call the Cloud API
    fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
    })
    .then(response => response.json())
    .then(data => {
        const aiMessage = {
            _id: Math.random().toString(),
            text: data.reply,
            createdAt: new Date(),
            user: {
                _id: 2,
                name: 'Chimera',
                avatar: 'https://placeimg.com/140/140/any',
            },
        };
        setMessages(previousMessages => GiftedChat.append(previousMessages, aiMessage));
    })
    .catch(error => {
        console.error(error);
        const errorMessage = {
            _id: Math.random().toString(),
            text: "Error connecting to cloud node. Check your internet or backend URL.",
            createdAt: new Date(),
            user: { _id: 2, name: 'System' },
        };
        setMessages(previousMessages => GiftedChat.append(previousMessages, errorMessage));
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: 1,
        }}
        placeholder="Ask about your training..."
        showUserAvatar
        alwaysShowSend
        // --- ADD THESE LINES FOR ANDROID FIX ---
        keyboardShouldPersistTaps="never"
        bottomOffset={Platform.OS === 'android' ? 45 : 0} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});