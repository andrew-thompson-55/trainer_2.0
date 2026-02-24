import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authFetch } from '@infra/fetch/auth-fetch';
import { useTheme } from '@infra/theme';
import { pkg } from '@infra/package';

const { persona } = pkg;

type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

export default function CoachScreen() {
  const { coach } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.reply || persona.chatNoResponse,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: persona.chatErrorMessage,
      };
      setMessages((prev) => [...prev, errMsg]);
      console.error('Chat error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.role === 'user'
          ? [styles.userBubble, { backgroundColor: coach.userBubble }]
          : [styles.aiBubble, { backgroundColor: coach.aiBubble }],
      ]}
    >
      <Text style={[styles.messageText, { color: coach.messageText }]}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: coach.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: coach.emptyTitle }]}>{persona.coachDisplayName}</Text>
              <Text style={[styles.emptySubtitle, { color: coach.emptySubtitle }]}>{persona.coachGreeting}</Text>
            </View>
          }
        />

        <View style={[styles.inputRow, { borderTopColor: coach.inputBorder, backgroundColor: coach.background }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: coach.inputBackground, color: coach.inputText }]}
            value={input}
            onChangeText={setInput}
            placeholder={persona.chatPlaceholder}
            placeholderTextColor={coach.placeholderText}
            multiline
            maxLength={2000}
            editable={!loading}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          {loading ? (
            <ActivityIndicator size="small" color={coach.accent} style={styles.sendBtn} />
          ) : (
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!input.trim()}>
              <Ionicons name="send" size={22} color={input.trim() ? coach.accent : coach.placeholderText} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  flex: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 15,
    marginTop: 8,
  },
});
