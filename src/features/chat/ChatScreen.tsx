import { useSession } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageInput } from './components/chat-input';
import { ThreadList } from './components/chat-list';
import { MessageWindow } from './components/chat-window';
import { useChatStore } from './stores/ChatStore';
import { Thread } from './types';

export const ChatScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: session} = useSession();
  const [filteredThreads, setFilteredThreads] = useState<Thread[]>([]);
  const insets = useSafeAreaInsets();
  
  const user = session?.user
  
  const {
    currentThread,
    messages,
    threads,
    isLoading,
    error,
    setCurrentThread,
    loadMessages,
    loadThreads,
    sendMessage,
    addMessage,
    setConnectionStatus,
  } = useChatStore();

  useEffect(() => {
    if (!user?.id) return;
    loadThreads(user.id);
    setConnectionStatus(true);
  }, [user]);

  useEffect(() => {
    setFilteredThreads(threads || []);
  }, [threads]);

  useEffect(() => {
    if (currentThread) {
      loadMessages(currentThread.id);
    }
  }, [currentThread]);

  useEffect(() => {
    if (!threads) return;
    
    if (searchQuery.trim() === '') {
      setFilteredThreads(threads);
    } else {
      const filtered = threads.filter(thread =>
        thread.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.participants.some(participant =>
          participant.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        thread.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredThreads(filtered);
    }
  }, [searchQuery, threads]);

  const handleThreadSelect = (thread: Thread) => {
    console.log('ChatScreen: Thread selected:', thread.name);
    setCurrentThread(thread);
  };

  const handleSendMessage = (content: string) => {
    if (!currentThread || !user?.id) return;

    console.log('Sending message:', {
      threadId: currentThread.id,
      senderId: user.id,
      content,
    });

    sendMessage(currentThread.id, user.id, content);
  };

  const handleBackToThreads = () => {
    setCurrentThread(null);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleMatch = () => {
    console.log('Create match button pressed');
    // TO DO ADD MATCH LOGIC LATER
  };

  // Get header content based on chat type
  const getHeaderContent = () => {
    if (!currentThread || !user?.id) return { title: 'Chat', subtitle: null };

    if (currentThread.type === 'group') {
      // Group chat: show group name and participant count
      return {
        title: currentThread.name || 'Group Chat',
        subtitle: `${currentThread.participants.length} participants`
      };
    } else {
      // Direct chat: show other participant's name and username
      const otherParticipant = currentThread.participants.find(
        participant => participant.id !== user.id
      );
      
      if (otherParticipant) {
        return {
          title: otherParticipant.name || otherParticipant.username || 'Unknown User',
          subtitle: otherParticipant.username ? `@${otherParticipant.username}` : null
        };
      } else {
        return {
          title: 'Chat',
          subtitle: null
        };
      }
    }
  };

  const headerContent = getHeaderContent();

  console.log('ChatScreen: Rendering - currentThread:', currentThread?.name, 'threads count:', threads?.length);

  // Show loading state
  if (isLoading && (!threads || threads.length === 0)) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#863A73" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error && (!threads || threads.length === 0)) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorSubtext}>Pull down to retry</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentThread ? (
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToThreads}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            
            <View style={styles.chatHeaderContent}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                {headerContent.title}
              </Text>
              {headerContent.subtitle && (
                <Text style={styles.chatHeaderSubtitle} numberOfLines={1}>
                  {headerContent.subtitle}
                </Text>
              )}
            </View>
            
            <TouchableOpacity style={styles.headerAction}>
              <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <MessageWindow
            messages={messages[currentThread.id] || []}
            threadId={currentThread.id}
            // isGroupChat={currentThread.type === 'group'}
          />
          
          <View style={{ paddingBottom: insets.bottom }}>
            <MessageInput 
              onSendMessage={handleSendMessage}
              onhandleMatch={handleMatch}
            />
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.threadsContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
           <ThreadList 
            threads={filteredThreads}
            onThreadSelect={handleThreadSelect} 
            currentUserId={user?.id}
          /> 
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatContainer: {
    flex: 1,
  },
  threadsContainer: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:  '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 60, // Ensure consistent height
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  chatHeaderContent: {
    flex: 1,
    justifyContent: 'center', // Center content vertically
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  headerAction: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});