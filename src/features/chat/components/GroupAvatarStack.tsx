import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { filterOutAdmins, isAdminUser, User } from '../types';
import { getUserNameColor } from '../utils/userColors';

interface GroupAvatarStackProps {
  participants: User[];
  sportColor: string;
  size?: number;
}

const SingleAvatar: React.FC<{
  participant: User;
  size: number;
  sportColor: string;
  style?: ViewStyle;
}> = ({ participant, size, sportColor, style }) => {
  const avatarUrl = participant.avatar;
  const initial = participant.name?.charAt(0)?.toUpperCase() || '?';
  const isAdmin = isAdminUser(participant);
  const bgColor = avatarUrl ? undefined : getUserNameColor(participant.id || participant.name || '', isAdmin);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: bgColor || sportColor,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: size * 0.4,
              fontWeight: '600',
            }}
          >
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
};

export const GroupAvatarStack: React.FC<GroupAvatarStackProps> = React.memo(({
  participants,
  sportColor,
  size = 40,
}) => {
  // Filter out admin users from display
  const visibleParticipants = useMemo(() => filterOutAdmins(participants), [participants]);

  // Memoize derived values
  const { count, displayParticipants, remainingCount } = useMemo(() => ({
    count: visibleParticipants.length,
    displayParticipants: visibleParticipants.slice(0, 3),
    remainingCount: visibleParticipants.length > 3 ? visibleParticipants.length - 3 : 0,
  }), [visibleParticipants]);

  // Size scaling based on CSS: Avatar 1 (32px), Avatar 2 (22px smallest), Avatar 3 (34px biggest)
  // Ratio from CSS: size1=32/34=0.94, size2=22/34=0.65, size3=34/34=1.0
  const { size1, size2, size3, badgeSize, scale, containerWidth, containerHeight, soloSize, duoAvatarSize, duoOverlap, duoContainerWidth } = useMemo(() => {
    const s3 = size;              // Avatar 3: biggest (34px ratio, front, most visible)
    const s1 = size * 0.94;       // Avatar 1: medium (32px ratio)
    const s2 = size * 0.65;       // Avatar 2: smallest (22px ratio)
    const badge = size * 0.7;     // Badge (24px ratio)
    const sc = size / 34;         // Scale factor
    const cw = 52 * sc;           // Container width
    const ch = 67 * sc;           // Container height
    const solo = 56;              // Full size avatar matching groupAvatarCircle
    const duoAvatar = 42;         // Size for each avatar in duo
    const overlap = duoAvatar * 0.35;
    const duoCW = duoAvatar * 2 - overlap;

    return {
      size1: s1,
      size2: s2,
      size3: s3,
      badgeSize: badge,
      scale: sc,
      containerWidth: cw,
      containerHeight: ch,
      soloSize: solo,
      duoAvatarSize: duoAvatar,
      duoOverlap: overlap,
      duoContainerWidth: duoCW,
    };
  }, [size]);

  if (count === 0) {
    return null;
  }

  // Single participant - just show one avatar at full size (centered)
  if (count === 1) {
    return (
      <SingleAvatar
        participant={displayParticipants[0]}
        size={soloSize}
        sportColor={sportColor}
      />
    );
  }

  // Two participants - Venn diagram style (two overlapping circles)
  if (count === 2) {
    return (
      <View style={[styles.container, { width: duoContainerWidth, height: duoAvatarSize }]}>
        {/* Avatar 1 - left side, back layer */}
        <SingleAvatar
          participant={displayParticipants[0]}
          size={duoAvatarSize}
          sportColor={sportColor}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        />
        {/* Avatar 2 - right side, front layer */}
        <SingleAvatar
          participant={displayParticipants[1]}
          size={duoAvatarSize}
          sportColor={sportColor}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 2,
          }}
        />
      </View>
    );
  }

  // Three or more participants
  // CSS positions (scaled from 52x67 container with base size 34):
  // Avatar 1: left:1, top:0 (32px) - top-left, back
  // Avatar 3: left:19, top:16 (34px) - middle-right, biggest, front
  // Avatar 2: left:3, top:27 (22px) - bottom-left, smallest, middle
  // Badge: left:14, top:43 (24px)

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {/* Avatar 1 - medium, top-left, back layer (CSS: left:1, top:0, 32px) */}
      <SingleAvatar
        participant={displayParticipants[0]}
        size={size1}
        sportColor={sportColor}
        style={{
          position: 'absolute',
          top: 0,
          left: 1 * scale,
          zIndex: 1,
        }}
      />
      {/* Avatar 2 - smallest, bottom-left, middle layer (CSS: left:3, top:27, 22px) */}
      <SingleAvatar
        participant={displayParticipants[1]}
        size={size2}
        sportColor={sportColor}
        style={{
          position: 'absolute',
          top: 27 * scale,
          left: 3 * scale,
          zIndex: 2,
        }}
      />
      {/* Avatar 3 - biggest, middle-right, front layer (CSS: left:19, top:16, 34px) */}
      <SingleAvatar
        participant={displayParticipants[2]}
        size={size3}
        sportColor={sportColor}
        style={{
          position: 'absolute',
          top: 16 * scale,
          left: 19 * scale,
          zIndex: 3,
        }}
      />

      {/* Badge showing remaining count (CSS: left:14, top:43, 24px) */}
      {remainingCount > 0 && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              top: 43 * scale,
              left: 14 * scale,
              zIndex: 4,
            },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: badgeSize * 0.42 }]}>
            {remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
});

GroupAvatarStack.displayName = 'GroupAvatarStack';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  badgeText: {
    fontWeight: '700',
    color: '#374151',
  },
});
