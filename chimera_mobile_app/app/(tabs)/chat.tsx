import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform, View, KeyboardAvoidingView } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import { authFetch } from '../../services/authFetch';

export default function ChatScreen() {
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
          avatar: 'https://placeimg.com/140/140/any',
        },
      },
    ]);
  }, []);

  const onSend = useCallback((newMessages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    const userMessage = newMessages[0].text;

    // Call the Cloud API
    authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage }),
    })
    .then(response => response.json())
    .then(data => {
        let responseText = "Communication Error.";
        if (data.reply) {
            responseText = data.reply;
        } else if (data.detail) {
            responseText = "System Error: " + data.detail;
        }

        const aiMessage = {
            _id: Math.random().toString(),
            text: responseText,
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
            text: "Error connecting to cloud node.",
            createdAt: new Date(),
            user: { _id: 2, name: 'System' },
        };
        setMessages(previousMessages => GiftedChat.append(previousMessages, errorMessage));
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* The Fix: Manually handle the keyboard offset. 
         We offset by ~90px on Android to account for the Tab Bar height.
      */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 90}
      >
        <GiftedChat
          messages={messages}
          onSend={messages => onSend(messages)}
          user={{
            _id: 1, // Your User ID
          }}
          placeholder="Ask about your training..."
          showUserAvatar
          alwaysShowSend
          // On Android, we disable GiftedChat's built-in handling 
          // because we are doing it manually with the wrapper above.
          keyboardShouldPersistTaps="never"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // On Android, SafeAreaView sometimes needs a little top padding 
    paddingTop: Platform.OS === 'android' ? 30 : 0, 
  },
});