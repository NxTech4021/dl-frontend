import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface PlayerAvatarProps {
  image?: string | null;
  name: string;
  size?: number;
  showBorder?: boolean;
  borderColor?: string;
  style?: ViewStyle;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  image,
  name,
  size = 28,
  showBorder = false,
  borderColor = '#FFFFFF',
  style,
}) => {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  const fontSize = size * 0.5;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    ...(showBorder && {
      borderWidth: 2,
      borderColor,
    }),
    ...style,
  };

  if (image) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: image }} style={styles.image} />
      </View>
    );
  }

  return (
    <View style={[containerStyle, styles.defaultAvatar]}>
      <Text style={[styles.defaultAvatarText, { fontSize }]}>{initial}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default PlayerAvatar;
