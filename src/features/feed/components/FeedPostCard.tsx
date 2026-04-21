// src/features/feed/components/FeedPostCard.tsx

import { getSportColors, SportType } from "@/constants/SportsColor";
import { MatchResult } from "@/features/standings/types";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLikes } from "../hooks";
import { feedTheme } from "../theme";
import { FeedPost } from "../types";
import { AuthorHeader } from "./AuthorHeader";
import {
  ScorecardCaptureWrapper,
  type ScorecardCaptureRef,
} from "./ScorecardCaptureWrapper";
import { SocialBar } from "./SocialBar";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH =
  SCREEN_WIDTH -
  feedTheme.spacing.screenPadding * 2 -
  feedTheme.spacing.cardPadding * 2;
const CAPTION_TRUNCATE_LENGTH = 125;

interface FeedPostCardProps {
  post: FeedPost;
  onLikeUpdate: (postId: string, liked: boolean, likeCount: number) => void;
  onCommentPress: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
  onLikeCountPress: (postId: string, likeCount: number) => void;
  onOptionsPress?: (post: FeedPost) => void;
  onSharePress?: (post: FeedPost) => void;
  onMatchPress?: (matchId: string) => void;
  showOptionsButton?: boolean;
  onScorecardRef?: (postId: string, ref: ScorecardCaptureRef | null) => void;
  currentUserId?: string;
}

export const FeedPostCard = forwardRef<View, FeedPostCardProps>(
  (
    {
      post,
      onLikeUpdate,
      onCommentPress,
      onAuthorPress,
      onLikeCountPress,
      onOptionsPress,
      onSharePress,
      onMatchPress,
      showOptionsButton = false,
      onScorecardRef,
      currentUserId,
    },
    ref,
  ) => {
    const { isLiking, toggleLike } = useLikes();
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const scorecardRef = useRef<ScorecardCaptureRef>(null);

    // Determine sport colors and type from the post's sport field
    const sportType = useMemo(
      () => (post.match.sport?.toUpperCase() || "TENNIS") as SportType,
      [post.match.sport],
    );
    const sportColors = useMemo(() => getSportColors(sportType), [sportType]);
    const isPickleball = useMemo(
      () => post.match.sport?.toUpperCase() === "PICKLEBALL",
      [post.match.sport],
    );

    // Notify parent component when scorecard ref is ready
    useEffect(() => {
      if (onScorecardRef && scorecardRef.current) {
        onScorecardRef(post.id, scorecardRef.current);
      }
      return () => {
        if (onScorecardRef) {
          onScorecardRef(post.id, null);
        }
      };
    }, [post.id, onScorecardRef]);

    // Caption truncation logic
    const shouldTruncate =
      post.caption && post.caption.length > CAPTION_TRUNCATE_LENGTH;
    const displayCaption =
      shouldTruncate && !captionExpanded
        ? post.caption!.slice(0, CAPTION_TRUNCATE_LENGTH)
        : post.caption;

    // Convert FeedMatch to MatchResult format for MatchResultCard
    const matchForCard: MatchResult = useMemo(
      () => ({
        id: post.match.id,
        matchType: post.match.matchType,
        matchDate: post.match.matchDate,
        sport: post.match.sport,
        team1Score: post.match.team1Score,
        team2Score: post.match.team2Score,
        outcome: post.match.outcome,
        setScores: post.match.setScores,
        gameScores: post.match.gameScores,
        team1Players: post.match.team1Players,
        team2Players: post.match.team2Players,
        isWalkover: post.match.isWalkover,
        isFriendly: post.match.isFriendly,
        location: post.match.location,
        leagueName: post.match.leagueName,
        seasonName: post.match.seasonName,
        divisionName: post.match.divisionName,
      }),
      [post.match],
    );

    const handleLikePress = useCallback(async () => {
      try {
        const result = await toggleLike(post.id);
        if (result) {
          onLikeUpdate(post.id, result.liked, result.likeCount);
        }
      } catch (err) {
        // Error already logged in hook
      }
    }, [post.id, toggleLike, onLikeUpdate]);

    const handleCommentPress = useCallback(() => {
      onCommentPress(post.id);
    }, [post.id, onCommentPress]);

    const handleSharePress = useCallback(() => {
      onSharePress?.(post);
    }, [post, onSharePress]);

    const handleAuthorPress = useCallback(() => {
      onAuthorPress?.(post.author.id);
    }, [post.author.id, onAuthorPress]);

    const handleLikeCountPress = useCallback(() => {
      onLikeCountPress(post.id, post.likeCount);
    }, [post.id, post.likeCount, onLikeCountPress]);

    const handleOptionsPress = useCallback(() => {
      onOptionsPress?.(post);
    }, [post, onOptionsPress]);

    // const handleMatchPress = useCallback(() => {
    //   onMatchPress?.(post.matchId);
    // }, [post.matchId, onMatchPress]);

    return (
      <View ref={ref} style={styles.container} collapsable={false}>
        {/* Author Header */}
        <AuthorHeader
          author={post.author}
          createdAt={post.createdAt}
          updatedAt={post.updatedAt}
          sportType={post.match.sport}
          sportColor={sportColors.background}
          onAuthorPress={handleAuthorPress}
          showOptionsButton={showOptionsButton}
          onOptionsPress={handleOptionsPress}
        />

        {/* Caption */}
        {post.caption && (
          <TouchableOpacity
            onPress={() =>
              shouldTruncate && setCaptionExpanded(!captionExpanded)
            }
            activeOpacity={shouldTruncate ? 0.7 : 1}
            style={styles.captionContainer}
          >
            <Text style={styles.caption}>
              {displayCaption}
              {shouldTruncate && !captionExpanded && (
                <Text style={styles.moreText}>...more</Text>
              )}
            </Text>
          </TouchableOpacity>
        )}

        {/* Match Scorecard - Tappable to navigate to match detail */}
        <View
          // onPress={handleMatchPress}
          style={[styles.scorecardContainer]}
        >
          <View style={styles.scorecardShadowWrapper}>
            <ScorecardCaptureWrapper
              ref={scorecardRef}
              match={matchForCard}
              sportColors={sportColors}
              isPickleball={isPickleball}
              cardWidth={CARD_WIDTH}
              renderCaptureHost={false}
            />
          </View>
        </View>

        {/* Social Bar */}
        <SocialBar
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          isLiked={post.isLikedByUser}
          isLiking={isLiking === post.id}
          onLikePress={handleLikePress}
          onCommentPress={handleCommentPress}
          onSharePress={handleSharePress}
          onLikeCountPress={handleLikeCountPress}
          showShareButton={showOptionsButton}
          currentUserId={currentUserId}
          postAuthorId={post.authorId}
        />

        {/* Divider - End of Post */}
        <View style={styles.postDivider} />
      </View>
    );
  },
);

FeedPostCard.displayName = "FeedPostCard";

const styles = StyleSheet.create({
  container: {
    backgroundColor: feedTheme.colors.cardBackground,
    // borderRadius: feedTheme.spacing.cardBorderRadius,
    marginBottom: feedTheme.spacing.sectionGap,
    // ...feedTheme.shadows.card,
    
  },
  captionContainer: {
    paddingHorizontal: feedTheme.spacing.cardPadding,
    paddingBottom: 10,
  },
  caption: {
    ...feedTheme.typography.caption,
    color: feedTheme.colors.textPrimary,
  },
moreText: {
    color: feedTheme.colors.textSecondary,
  },
  scorecardContainer: {
    paddingHorizontal: feedTheme.spacing.cardPadding,
    paddingBottom: 10,
  },
  scorecardShadowWrapper: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  scorecardPressed: {
    opacity: 0.7,
  },
  postDivider: {
    height: 1,
    backgroundColor: feedTheme.colors.border,
    width: "100%",
    alignSelf: "stretch",
    marginTop: feedTheme.spacing.cardPadding,
  },
});
