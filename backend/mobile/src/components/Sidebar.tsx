/**
 * Sidebar Component
 * Slide-out navigation with mode switching and chat history
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  PanResponder,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

export type InputMode = 'text' | 'voice';

export interface ChatHistoryItem {
  id: string;
  trick: string;
  lastMessage: string;
  updatedAt: Date;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  chatHistory: ChatHistoryItem[];
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeMode,
  onModeChange,
  chatHistory,
  onSelectChat,
  onNewChat,
}) => {
  const translateX = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: isOpen ? 0.5 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  // Group chat history by trick
  const groupedHistory = React.useMemo(() => {
    const groups: Record<string, ChatHistoryItem[]> = {};
    for (const chat of chatHistory) {
      const trick = chat.trick || 'General';
      if (!groups[trick]) {
        groups[trick] = [];
      }
      groups[trick].push(chat);
    }
    return groups;
  }, [chatHistory]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <View style={styles.container}>
      {/* Overlay */}
      <Animated.View 
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <TouchableOpacity 
          style={styles.overlayTouch} 
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View 
        style={[
          styles.sidebar,
          { transform: [{ translateX }] }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Snowboarding</Text>
          <Text style={styles.headerSubtitle}>Explained</Text>
        </View>

        {/* Mode Buttons */}
        <View style={styles.modeSection}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              activeMode === 'text' && styles.modeButtonActive,
            ]}
            onPress={() => {
              onModeChange('text');
              onClose();
            }}
          >
            <Text style={styles.modeIcon}>📝</Text>
            <Text style={[
              styles.modeText,
              activeMode === 'text' && styles.modeTextActive,
            ]}>
              Text Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              activeMode === 'voice' && styles.modeButtonActive,
            ]}
            onPress={() => {
              onModeChange('voice');
              onClose();
            }}
          >
            <Text style={styles.modeIcon}>🔊</Text>
            <Text style={[
              styles.modeText,
              activeMode === 'voice' && styles.modeTextActive,
            ]}>
              Voice Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* New Chat Button */}
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => {
            onNewChat();
            onClose();
          }}
        >
          <Text style={styles.newChatIcon}>+</Text>
          <Text style={styles.newChatText}>New Chat</Text>
        </TouchableOpacity>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Chat History */}
        <Text style={styles.historyTitle}>Chat History</Text>
        <ScrollView style={styles.historyList}>
          {Object.entries(groupedHistory).map(([trick, chats]) => (
            <View key={trick} style={styles.historyGroup}>
              <Text style={styles.historyGroupTitle}>{trick}</Text>
              {chats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  style={styles.historyItem}
                  onPress={() => {
                    onSelectChat(chat.id);
                    onClose();
                  }}
                >
                  <Text style={styles.historyItemDate}>
                    {formatDate(chat.updatedAt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {chatHistory.length === 0 && (
            <Text style={styles.emptyHistory}>No chat history yet</Text>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  overlayTouch: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a9eff',
  },
  modeSection: {
    marginBottom: 16,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  modeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modeText: {
    fontSize: 16,
    color: '#888',
  },
  modeTextActive: {
    color: '#4a9eff',
    fontWeight: '600',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  newChatIcon: {
    fontSize: 20,
    color: '#888',
    marginRight: 12,
  },
  newChatText: {
    fontSize: 16,
    color: '#888',
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  historyTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyList: {
    flex: 1,
  },
  historyGroup: {
    marginBottom: 16,
  },
  historyGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  historyItem: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  historyItemDate: {
    fontSize: 14,
    color: '#888',
  },
  emptyHistory: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default Sidebar;
