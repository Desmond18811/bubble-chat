import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { getSecureMediaUrl } from '../lib/api';

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  isGroup?: boolean;
  style?: any;
  imageStyle?: any;
  textStyle?: any;
}

const MATURE_COLORS = [
  '#708090', // Slate Grey
  '#191970', // Midnight Blue
  '#36454F', // Charcoal
  '#01796F', // Pine Green
  '#4B0082', // Indigo
  '#4E2A5A', // Royal Plum
  '#800020', // Burgundy
];

const getFallbackColor = (name: string, isGroup?: boolean): string => {
  if (isGroup) return '#000000';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % MATURE_COLORS.length;
  return MATURE_COLORS[index];
};

const getInitials = (name: string, isGroup?: boolean): string => {
  const clean = name.trim();
  if (!clean) return '?';
  if (isGroup) {
    return clean.slice(0, 2).toUpperCase();
  }
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name,
  size = 40,
  isGroup = false,
  style,
  imageStyle,
  textStyle,
}) => {
  const [imgError, setImgError] = useState(false);
  const displayName = name || 'User';
  const resolvedUrl = getSecureMediaUrl(url);

  // Reset error state if url changes
  useEffect(() => {
    setImgError(false);
  }, [url]);

  const initials = getInitials(displayName, isGroup);
  const backgroundColor = getFallbackColor(displayName, isGroup);

  if (resolvedUrl && !imgError) {
    return (
      <Image
        source={{ uri: resolvedUrl }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          imageStyle,
          style,
        ]}
        onError={() => setImgError(true)}
      />
    );
  }

  // Initials fallback
  const fontSize = size * 0.4;
  return (
    <View
      style={[
        styles.fallbackContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.fallbackText,
          { fontSize, lineHeight: fontSize * 1.2 },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#e1e2e6',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#ffffff',
    fontFamily: 'System',
    fontWeight: '700',
  },
});
