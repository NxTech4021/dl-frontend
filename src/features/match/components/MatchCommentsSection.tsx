import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MatchComment } from '@/app/match/components/types';

interface MatchCommentsSectionProps {
  matchId: string;
  isFriendly: boolean;
  comments: MatchComment[];
  isUserParticipant: boolean;
  canComment: boolean;
  currentUserId?: string;
  onCreateComment: (text: string) => Promise<void>;
  onUpdateComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
}

const MAX_COMMENT_LENGTH = 1000;

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

export const MatchCommentsSection: React.FC<MatchCommentsSectionProps> = ({
  comments,
  isUserParticipant,
  canComment,
  currentUserId,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  isLoading = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: MatchComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.comment);
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingCommentId) return;

    setIsSubmitting(true);
    try {
      await onUpdateComment(editingCommentId, editText.trim());
      setEditingCommentId(null);
      setEditText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const handleDeleteComment = (commentId: string) => {
    setOpenMenuId(null);
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteComment(commentId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleMenu = (commentId: string) => {
    setOpenMenuId(openMenuId === commentId ? null : commentId);
  };

  const showInput = isUserParticipant && canComment;

  const renderComment = (comment: MatchComment) => {
    const isOwner = comment.userId === currentUserId;
    const isEditing = editingCommentId === comment.id;
    const isMenuOpen = openMenuId === comment.id;
    const userInitial = comment.user.name?.charAt(0)?.toUpperCase() || '?';

    return (
      <View key={comment.id} style={styles.commentItem}>
        {comment.user.image ? (
          <Image
            source={{ uri: comment.user.image }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.defaultAvatarText}>{userInitial}</Text>
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentHeaderRow}>
            <View style={styles.commentHeaderInfo}>
              <Text style={styles.commentAuthor} numberOfLines={1}>
                {comment.user.name}
              </Text>
              <Text style={styles.commentTime}>
                · {formatRelativeTime(comment.createdAt)}
                {comment.updatedAt !== comment.createdAt && ' · edited'}
              </Text>
            </View>
            {isOwner && !isEditing && (
              <View style={styles.menuWrapper}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => toggleMenu(comment.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Inline dropdown menu - no overlay */}
                {isMenuOpen && (
                  <View style={styles.dropdownMenu}>
                    <Pressable
                      style={styles.dropdownItem}
                      onPress={() => handleEditComment(comment)}
                    >
                      <Ionicons name="pencil-outline" size={14} color="#374151" />
                      <Text style={styles.dropdownItemText}>Edit</Text>
                    </Pressable>
                    <View style={styles.dropdownDivider} />
                    <Pressable
                      style={styles.dropdownItem}
                      onPress={() => handleDeleteComment(comment.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.dropdownItemText, styles.deleteText]}>Delete</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                maxLength={MAX_COMMENT_LENGTH}
                placeholder="Edit your comment..."
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!editText.trim() || isSubmitting) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveEdit}
                  disabled={!editText.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.commentText}>{comment.comment}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chatbubbles-outline" size={18} color="#374151" />
        <Text style={styles.title}>Comments</Text>
        {comments.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{comments.length}</Text>
          </View>
        )}
      </View>

      {/* Comments List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.loadingText}>Loading comments...</Text>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyText}>No comments yet</Text>
          {showInput && (
            <Text style={styles.emptySubtext}>Start the conversation</Text>
          )}
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map(renderComment)}
        </View>
      )}

      {/* Input Section */}
      {showInput && (
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Write a comment..."
              placeholderTextColor="#9CA3AF"
              maxLength={MAX_COMMENT_LENGTH}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.sendIconButton}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FEA04D" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={newComment.trim() ? "#FEA04D" : "#D1D5DB"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showInput && isUserParticipant && !canComment && (
        <View style={styles.disabledContainer}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text style={styles.disabledText}>
            Available after match starts
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#9CA3AF',
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  defaultAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    maxWidth: 120,
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  menuWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  menuButton: {
    padding: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 100,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  deleteText: {
    color: '#EF4444',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 2,
  },
  editContainer: {
    marginTop: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  inputWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingLeft: 14,
    paddingRight: 10,
    height: 64,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    paddingVertical: 0,
    marginRight: 8,
  },
  sendIconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  disabledText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#9CA3AF',
  },
});

export default MatchCommentsSection;
