// src/features/feed/components/CommentsSheet.tsx

import { useSession } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { formatDistanceToNow } from "date-fns";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useComments } from "../hooks";
import { feedTheme } from "../theme";
import { PostComment } from "../types";
import { processDisplayName } from "../utils/formatters";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface CommentInputBarProps {
  onSubmit: (text: string) => Promise<void>;
  isSubmitting: boolean;
  bottomInset: number;
}

const CommentInputBar = React.memo<CommentInputBarProps>(
  ({ onSubmit, isSubmitting, bottomInset }) => {
    const [text, setText] = useState("");

    const handlePress = useCallback(async () => {
      if (!text.trim() || isSubmitting) return;
      await onSubmit(text.trim());
      setText("");
    }, [text, isSubmitting, onSubmit]);

    return (
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: Platform.OS === "ios" ? Math.max(bottomInset, 8) : 8,
          },
        ]}
      >
        <BottomSheetTextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor={feedTheme.colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handlePress}
          disabled={!text.trim() || isSubmitting}
        >
          <Ionicons
            name="send"
            size={20}
            color={
              text.trim()
                ? feedTheme.colors.primary
                : feedTheme.colors.textTertiary
            }
          />
        </TouchableOpacity>
      </View>
    );
  },
);

interface CommentsSheetProps {
  postId: string | null;
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onClose: () => void;
  onCommentCountChange: (postId: string, count: number) => void;
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({
  postId,
  bottomSheetRef,
  onClose,
  onCommentCountChange,
}) => {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const {
    comments,
    isLoading,
    isSubmitting,
    fetchComments,
    addComment,
    deleteComment,
  } = useComments(postId || "");
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
  const commentsLengthRef = useRef(comments.length);
  useEffect(() => {
    commentsLengthRef.current = comments.length;
  }, [comments.length]);

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId, fetchComments]);

  const handleAddComment = useCallback(
    async (text: string) => {
      if (!postId) return;
      const newComment = await addComment(text);
      if (newComment) {
        onCommentCountChange(postId, commentsLengthRef.current + 1);
      }
    },
    [postId, addComment, onCommentCountChange],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!postId) return;

      const swipeableRef = swipeableRefs.current.get(commentId);
      if (swipeableRef) {
        swipeableRef.close();
      }

      const success = await deleteComment(commentId);
      if (success) {
        onCommentCountChange(postId, commentsLengthRef.current - 1);
      }
    },
    [postId, deleteComment, onCommentCountChange],
  );

  const renderRightActions = useCallback(
    (commentId: string) =>
      (
        _progress: Animated.AnimatedInterpolation<number>,
        _dragX: Animated.AnimatedInterpolation<number>,
      ) => (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDelete(commentId)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      ),
    [handleDelete],
  );

  const renderCommentContent = useCallback(
    (item: PostComment) => (
      <View style={styles.commentItem}>
        {item.user.image ? (
          <Image
            source={{ uri: item.user.image }}
            style={styles.commentAvatar}
          />
        ) : (
          <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
            <Text style={styles.commentAvatarText}>
              {item.user.name?.trim()
                ? item.user.name.charAt(0).toUpperCase()
                : "D"}
            </Text>
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor} numberOfLines={1}>
              {processDisplayName(item.user.name, 20)}
            </Text>
            <Text style={styles.commentTime}>
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: false,
              })}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
      </View>
    ),
    [],
  );

  const renderComment = useCallback(
    ({ item }: { item: PostComment }) => {
      const isOwnComment = item.user.id === currentUserId;

      if (isOwnComment) {
        return (
          <Swipeable
            ref={(ref) => {
              if (ref) {
                swipeableRefs.current.set(item.id, ref);
              } else {
                swipeableRefs.current.delete(item.id);
              }
            }}
            renderRightActions={renderRightActions(item.id)}
            rightThreshold={40}
            overshootRight={false}
          >
            {renderCommentContent(item)}
          </Swipeable>
        );
      }

      return renderCommentContent(item);
    },
    [currentUserId, renderRightActions, renderCommentContent],
  );

  // const renderFooter = useCallback(
  //   (props: BottomSheetFooterProps) => (
  //     <BottomSheetFooter {...props}>
  //       <CommentInputBar
  //         onSubmit={handleAddComment}
  //         isSubmitting={isSubmitting}
  //         bottomInset={insets.bottom}
  //       />
  //     </BottomSheetFooter>
  //   ),
  //   [handleAddComment, isSubmitting, insets.bottom],
  // );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <CommentInputBar
          onSubmit={handleAddComment}
          isSubmitting={isSubmitting}
          // If the keyboard is open, BottomSheetFooter handles the padding automatically
          bottomInset={insets.bottom}
        />
      </BottomSheetFooter>
    ),
    [handleAddComment, isSubmitting, insets.bottom],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing={true}
      maxDynamicContentSize={SCREEN_HEIGHT * 0.8}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetFlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isLoading ? "Loading comments..." : "Be the first to comment!"}
          </Text>
        }
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 4,
    paddingBottom: 12,
    paddingHorizontal: feedTheme.spacing.screenPadding,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: feedTheme.colors.textPrimary,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: feedTheme.spacing.screenPadding,
    paddingBottom: 80,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarPlaceholder: {
    backgroundColor: feedTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  commentAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: feedTheme.colors.textPrimary,
  },
  commentTime: {
    fontSize: 11,
    color: feedTheme.colors.textTertiary,
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    color: feedTheme.colors.textPrimary,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: "center",
    color: feedTheme.colors.textSecondary,
    marginTop: 40,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    marginBottom: 12,
    paddingHorizontal: feedTheme.spacing.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: feedTheme.colors.border,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    backgroundColor: feedTheme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: feedTheme.colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    padding: 10,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  deleteAction: {
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: 16,
    borderRadius: 8,
  },
  deleteActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});
