// src/features/feed/screens/FeedScreen.tsx

import { getSportColors, SportType } from "@/constants/SportsColor";
import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CommentsSheet,
  EditCaptionSheet,
  FeedHeader,
  FeedPostCard,
  FriendsList,
  PostOptionsSheet,
  ScorecardCaptureWrapper,
  ShareOptionsSheet,
  SportFilterSheet,
  type ScorecardCaptureRef,
} from "../components";
import { useFeedPosts, usePostActions, useSharePost } from "../hooks";
import { feedTheme } from "../theme";
import { FeedPost } from "../types";

interface FeedScreenProps {
  sport?: string;
}

export default function FeedScreen({ sport = "default" }: FeedScreenProps) {
  // Session and post actions
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { deletePost, editCaption, isEditing } = usePostActions();

  // Existing state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const commentsSheetRef = useRef<BottomSheetModal>(null);
  const sportFilterRef = useRef<BottomSheetModal>(null);
  const [selectedLikerPostId, setSelectedLikerPostId] = useState<string | null>(
    null,
  );
  const [selectedLikerCount, setSelectedLikerCount] = useState(0);


  // Post options state
  const [selectedOptionsPostId, setSelectedOptionsPostId] = useState<
    string | null
  >(null);
  const [selectedOptionsPost, setSelectedOptionsPost] =
    useState<FeedPost | null>(null);
  const postOptionsRef = useRef<BottomSheetModal>(null);

  // Edit caption state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState<string>("");
  const editCaptionRef = useRef<BottomSheetModal>(null);

  // Share state
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const shareSheetRef = useRef<BottomSheetModal>(null);
  const shareCaptureRef = useRef<ScorecardCaptureRef>(null);
  const {
    captureAndShare,
    captureAndSave,
    shareLink,
    isCapturing,
    isSaving,
    shareError,
    clearShareError,
  } = useSharePost();

  // Refs for race condition prevention and cleanup
  const isDeletingRef = useRef(false);
  const isSavingRef = useRef(false);
  const isMountedRef = useRef(true);
  const editTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingMoreRef = useRef(false);

  const [selectedSportFilter, setSelectedSportFilter] = useState<
    string | undefined
  >(sport);
  const [userFilter, setUserFilter] = useState<"all" | "friends">("all");
  const [activeTab, setActiveTab] = useState<"activity" | "friends">(
    "activity",
  );
  const [friendRequestsPanelVisible, setFriendRequestsPanelVisible] =
    useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  // Lazy-mount: only render FriendsList after the first visit so the
  // initial load doesn't pay its cost, but keep it mounted after that
  // so tab switches have zero mounting cost — just a display toggle.
  const hasFriendsEverShown = useRef(false);
  if (activeTab === "friends") hasFriendsEverShown.current = true;

  // Fetch pending friend request count on mount so the Friends tab badge
  // is visible on the Activity tab without requiring the Friends tab to be visited first.
  useEffect(() => {
    if (!session?.user?.id) return;
    axiosInstance
      .get('/api/pairing/friendship/requests')
      .then((res) => {
        const data = res.data?.data ?? res.data;
        const received: any[] = data?.received ?? [];
        const count = Array.isArray(received)
          ? received.filter((r: any) => r.status === 'PENDING').length
          : 0;
        if (isMountedRef.current) setPendingFriendRequests(count);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeout
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }
    };
  }, []);

  const handleFilterPress = useCallback(() => {
    sportFilterRef.current?.present();
  }, []);

  const handleSportSelect = useCallback((sportValue: string | undefined) => {
    setSelectedSportFilter(sportValue);
    sportFilterRef.current?.dismiss();
  }, []);

  const handleCloseFilter = useCallback(() => {
    // Filter closed
  }, []);

  const handleUserFilterToggle = useCallback(() => {
    setUserFilter((prev) => (prev === "all" ? "friends" : "all"));
  }, []);

  const handleTabChange = useCallback((tab: "activity" | "friends") => {
    setActiveTab(tab);
    // OLD LOGIC: Navigate to friend list page
    // if (tab === 'friends') {
    //   router.push("/user-dashboard/friend-list");
    // }
    // NEW LOGIC: Just switch the tab, content will be conditionally rendered
  }, []);

  const {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    fetchPosts,
    loadMorePosts,
    updatePostLocally,
    removePostLocally,
  } = useFeedPosts({
    sport: selectedSportFilter,
    limit: 10,
    filter: userFilter,
  });

  // Debounced load more to prevent multiple rapid calls from onEndReached
  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current || isLoadingMore || !hasMore) return;
    isLoadingMoreRef.current = true;
    loadMorePosts();
    // Reset after a short delay to allow for next load
    setTimeout(() => {
      isLoadingMoreRef.current = false;
    }, 500);
  }, [loadMorePosts, isLoadingMore, hasMore]);

  // Get sport colors using the utility function (convert to uppercase for SportType)
  // Memoized to prevent unnecessary re-renders of FlatList items
  const sportType = sport?.toUpperCase() as SportType;
  const sportColors = useMemo(() => getSportColors(sportType), [sportType]);
  // Game score sports use gameScores array instead of setScores
  const isGameScoreSport = useMemo(
    () => sport !== "tennis" && sport !== "padel",
    [sport],
  );

  // Fetch posts on mount and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    fetchPosts();

    return () => {
      isMountedRef.current = false;
      // Clear any pending timeout to prevent memory leak
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
        editTimeoutRef.current = null;
      }
    };
  }, [fetchPosts]);

  const handleFriendListPress = useCallback(() => {
    router.push("/user-dashboard/friend-list");
  }, []);

  const handleCreatePostPress = useCallback(() => {
    // Navigate to My Games with share mode to select a match to share
    router.push(
      "/user-dashboard?view=myGames&tab=HISTORY&shareMode=true" as any,
    );
  }, []);

  const handleLikeUpdate = useCallback(
    (postId: string, liked: boolean, likeCount: number) => {
      updatePostLocally(postId, { isLikedByUser: liked, likeCount });
    },
    [updatePostLocally],
  );

  const handleCommentPress = useCallback((postId: string) => {
    setSelectedPostId(postId);
    commentsSheetRef.current?.present();
  }, []);

  const handleCommentCountChange = useCallback(
    (postId: string, count: number) => {
      updatePostLocally(postId, { commentCount: count });
    },
    [updatePostLocally],
  );

  const handleCloseComments = useCallback(() => {
    setSelectedPostId(null);
  }, []);

  const handleAuthorPress = useCallback((authorId: string) => {
    router.push(`/player-profile/${authorId}` as any);
  }, []);

  // const handleMatchPress = useCallback((matchId: string) => {
  //   router.push({
  //     pathname: "/match/match-details",
  //     params: { matchId },
  //   } as any);
  // }, []);

  const handleLikeCountPress = useCallback(
    (postId: string, likeCount: number) => {
      setSelectedLikerPostId(postId);
      setSelectedLikerCount(likeCount);
    },
    [],
  );

  const handleCloseLikers = useCallback(() => {
    setSelectedLikerPostId(null);
  }, []);

  // Post options handlers
  const handleOptionsPress = useCallback((post: FeedPost) => {
    setSelectedOptionsPostId(post.id);
    setSelectedOptionsPost(post);
    postOptionsRef.current?.present();
  }, []);

  const handleCloseOptions = useCallback(() => {
    setSelectedOptionsPostId(null);
    setSelectedOptionsPost(null);
  }, []);

  const handleEditPress = useCallback(() => {
    if (selectedOptionsPost) {
      setEditingPostId(selectedOptionsPost.id);
      setEditingCaption(selectedOptionsPost.caption || "");
      postOptionsRef.current?.dismiss();

      // Clear any existing timeout before setting new one
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }

      // Small delay to allow options sheet to close before opening edit sheet
      editTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          editCaptionRef.current?.present();
        }
        editTimeoutRef.current = null;
      }, 100);
    }
  }, [selectedOptionsPost]);

  const handleDeletePress = useCallback(async () => {
    // Guard against double-delete race condition
    if (isDeletingRef.current || !selectedOptionsPostId) return;
    isDeletingRef.current = true;

    try {
      const success = await deletePost(selectedOptionsPostId);
      if (success && isMountedRef.current) {
        // Remove the deleted post from local state
        removePostLocally(selectedOptionsPostId);
        postOptionsRef.current?.dismiss();
      }
    } finally {
      isDeletingRef.current = false;
    }
  }, [selectedOptionsPostId, deletePost, removePostLocally]);

  const handleCloseEdit = useCallback(() => {
    setEditingPostId(null);
    setEditingCaption("");
  }, []);

  const handleSaveCaption = useCallback(
    async (postId: string, newCaption: string) => {
      // Guard against double-save race condition
      if (isSavingRef.current) return;
      isSavingRef.current = true;

      try {
        const success = await editCaption(postId, newCaption);
        if (success && isMountedRef.current) {
          updatePostLocally(postId, { caption: newCaption });
          editCaptionRef.current?.dismiss();
        }
      } finally {
        isSavingRef.current = false;
      }
    },
    [editCaption, updatePostLocally],
  );

  // Share handlers
  const handleSharePress = useCallback((post: FeedPost) => {
    setSharePostId(post.id);
    shareSheetRef.current?.present();
  }, []);

  const handleShareImage = useCallback(
    async (style?: "transparent" | "white" | "dark") => {
      if (!sharePostId) return;
      const scorecardRef = shareCaptureRef.current;
      if (scorecardRef) {
        // Set background style based on selection
        scorecardRef.setBackgroundStyle(
          style === "dark"
            ? "dark"
            : style === "transparent"
              ? "transparent"
              : "white",
        );
        // Small delay to ensure style is applied before capture
        await new Promise((resolve) => setTimeout(resolve, 50));
        await captureAndShare(
          { current: scorecardRef.viewRef },
          {
            style,
            format: "png",
            quality: 1.0,
            pixelRatio: 3,
            width: 1080,
            height: 1920,
          },
        );
      }
    },
    [sharePostId, captureAndShare],
  );

  const handleSaveImage = useCallback(
    async (style?: "transparent" | "white" | "dark") => {
      if (!sharePostId) return;
      const scorecardRef = shareCaptureRef.current;
      if (scorecardRef) {
        // Set background style based on selection
        scorecardRef.setBackgroundStyle(
          style === "dark"
            ? "dark"
            : style === "transparent"
              ? "transparent"
              : "white",
        );
        // Small delay to ensure style is applied before capture
        await new Promise((resolve) => setTimeout(resolve, 50));
        await captureAndSave(
          { current: scorecardRef.viewRef },
          {
            style,
            format: "png",
            quality: 1.0,
            pixelRatio: 3,
            width: 1080,
            height: 1920,
          },
        );
      }
    },
    [sharePostId, captureAndSave],
  );

  const handleShareToInstagram = useCallback(
    async (style?: "transparent" | "white" | "dark") => {
      if (!sharePostId) return;
      const scorecardRef = shareCaptureRef.current;
      if (scorecardRef) {
        // Set background style based on selection
        scorecardRef.setBackgroundStyle(
          style === "dark"
            ? "dark"
            : style === "transparent"
              ? "transparent"
              : "white",
        );
        // Small delay to ensure style is applied before capture
        await new Promise((resolve) => setTimeout(resolve, 50));
        // Instagram share saves and shares to Instagram
        await captureAndShare(
          { current: scorecardRef.viewRef },
          {
            style,
            format: "png",
            quality: 1.0,
            pixelRatio: 3,
            width: 1080,
            height: 1920,
          },
        );
      }
    },
    [sharePostId, captureAndShare],
  );

  const handleShareLink = useCallback(async () => {
    if (!sharePostId) return;
    await shareLink(sharePostId);
  }, [sharePostId, shareLink]);

  const handleCloseShare = useCallback(() => {
    setSharePostId(null);
  }, []);

  // Get current share post and its match data
  const currentSharePost = useMemo(() => {
    if (!sharePostId) return null;
    return posts.find((post) => post.id === sharePostId);
  }, [sharePostId, posts]);

  const sharePostMatch = useMemo(() => {
    if (!currentSharePost) return undefined;
    // Convert FeedMatch to MatchResult format
    return {
      id: currentSharePost.match.id,
      matchType: currentSharePost.match.matchType,
      matchDate: currentSharePost.match.matchDate,
      sport: currentSharePost.match.sport,
      team1Score: currentSharePost.match.team1Score,
      team2Score: currentSharePost.match.team2Score,
      outcome: currentSharePost.match.outcome,
      setScores: currentSharePost.match.setScores,
      gameScores: currentSharePost.match.gameScores,
      team1Players: currentSharePost.match.team1Players,
      team2Players: currentSharePost.match.team2Players,
      isWalkover: currentSharePost.match.isWalkover,
      location: currentSharePost.match.location,
      leagueName: currentSharePost.match.leagueName,
      seasonName: currentSharePost.match.seasonName,
      divisionName: currentSharePost.match.divisionName,
    };
  }, [currentSharePost]);

  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => {
      const isOwnPost = currentUserId === item.authorId;
      return (
        <FeedPostCard
          post={item}
          onLikeUpdate={handleLikeUpdate}
          onCommentPress={handleCommentPress}
          onAuthorPress={handleAuthorPress}
          onLikeCountPress={handleLikeCountPress}
          onOptionsPress={handleOptionsPress}
          onSharePress={handleSharePress}
          // onMatchPress={handleMatchPress}
          showOptionsButton={isOwnPost}
          currentUserId={currentUserId}
        />
      );
    },
    [
      handleLikeUpdate,
      handleCommentPress,
      handleAuthorPress,
      handleLikeCountPress,
      handleOptionsPress,
      handleSharePress,
      // handleMatchPress,
      currentUserId,
    ],
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={feedTheme.colors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Nothing to see here yet..</Text>
        <Text style={styles.emptySubtitle}>
          Match results from you and other players will appear here
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <FeedHeader
        selectedSport={selectedSportFilter}
        userFilter={userFilter}
        onFilterPress={handleFilterPress}
        onFriendListPress={handleFriendListPress}
        onUserFilterToggle={handleUserFilterToggle}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddFriendPress={() => setFriendRequestsPanelVisible(true)}
        pendingFriendRequests={pendingFriendRequests}
      />

      {/* Tab panes — both always mounted after first visit, display toggles instantly */}

      {/* Activity Tab */}
      <View style={{ display: activeTab === "activity" ? "flex" : "none", flex: 1 }}>
        {isLoading && posts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={feedTheme.colors.primary}
            />
          </View>
        ) : error && posts.length === 0 ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorSubtitle}>
              We couldn't load the feed. Please try again.
            </Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                isLoading && styles.retryButtonDisabled,
              ]}
              onPress={fetchPosts}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.retryButtonText}>Retry</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && posts.length > 0}
                onRefresh={fetchPosts}
                tintColor={feedTheme.colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={10}
            initialNumToRender={5}
          />
        )}
      </View>

      {/* Friends Tab — lazy: only mounts after first visit, then stays mounted */}
      {hasFriendsEverShown.current && (
        <View style={{ display: activeTab === "friends" ? "flex" : "none", flex: 1 }}>
          <FriendsList
            sport={sport as "pickleball" | "tennis" | "padel"}
            panelVisible={friendRequestsPanelVisible}
            onPanelOpen={() => setFriendRequestsPanelVisible(true)}
            onPanelClose={() => setFriendRequestsPanelVisible(false)}
            onPendingCountChange={setPendingFriendRequests}
          />
        </View>
      )}

      {/* Floating Action Button - rendered before sheets so it stays behind them */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: feedTheme.colors.primary }]}
        onPress={handleCreatePostPress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Comments Bottom Sheet */}
      <CommentsSheet
        postId={selectedPostId}
        bottomSheetRef={commentsSheetRef}
        onClose={handleCloseComments}
        onCommentCountChange={handleCommentCountChange}
      />

      {/* Sport Filter Bottom Sheet */}
      <SportFilterSheet
        bottomSheetRef={sportFilterRef}
        selectedSport={selectedSportFilter}
        onSelect={handleSportSelect}
        onClose={handleCloseFilter}
      />

      {/* Post Options Bottom Sheet */}
      <PostOptionsSheet
        bottomSheetRef={postOptionsRef}
        isOwnPost={selectedOptionsPost?.authorId === currentUserId}
        onClose={handleCloseOptions}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
      />

      {/* Edit Caption Bottom Sheet */}
      <EditCaptionSheet
        postId={editingPostId}
        initialCaption={editingCaption}
        bottomSheetRef={editCaptionRef}
        onClose={handleCloseEdit}
        onSave={handleSaveCaption}
        isSaving={isEditing}
      />

      {/* Share Options Bottom Sheet */}
      <ShareOptionsSheet
        bottomSheetRef={shareSheetRef}
        onClose={handleCloseShare}
        onShareImage={handleShareImage}
        onSaveImage={handleSaveImage}
        onShareLink={handleShareLink}
        onShareInstagram={handleShareToInstagram}
        isLoading={isCapturing || isSaving}
        shareError={shareError}
        onClearError={clearShareError}
        match={sharePostMatch}
        sportType={currentSharePost?.match.sport}
      />

      {sharePostMatch && (
        <View style={styles.hiddenCaptureHost} pointerEvents="none">
          <ScorecardCaptureWrapper
            ref={shareCaptureRef}
            match={sharePostMatch}
            sportColors={getSportColors(
              (sharePostMatch.sport?.toUpperCase() || "TENNIS") as SportType,
            )}
            isPickleball={sharePostMatch.sport?.toUpperCase() === "PICKLEBALL"}
            cardWidth={1}
            captureOnly
          />
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedTheme.colors.background,
  },
  hiddenCaptureHost: {
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: feedTheme.spacing.screenPadding,
    paddingBottom: 100,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedTheme.colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: feedTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedTheme.colors.textPrimary,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: feedTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: feedTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
