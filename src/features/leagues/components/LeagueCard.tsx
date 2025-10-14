import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, Platform } from 'react-native';
import { League } from '../services/LeagueService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface LeagueCardProps {
  league: League;
  onJoinPress?: (leagueId: string) => void;
  variant?: 'featured' | 'regular';
}

export function LeagueCard({ league, onJoinPress, variant = 'regular' }: LeagueCardProps) {
  const handleJoinPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onJoinPress) {
      onJoinPress(league.id);
    } else {
      // Default navigation to category screen
      router.push('/user-dashboard/category');
    }
  };

  // Format location names
  // const formatLocation = (location: string) => {
  //   if (!location) return '';
    
  //   const formatted = location
  //     .split('-')
  //     .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  //     .join(' ');
    
  //   return formatted;
  // };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'ONGOING':
        return '#10B981'; // green
      case 'UPCOMING':
        return '#F59E0B'; // amber
      case 'FINISHED':
        return '#6B7280'; // gray
      case 'CANCELLED':
        return '#EF4444'; // red
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'ONGOING':
        return 'Ongoing';
      case 'UPCOMING':
        return 'Upcoming';
      case 'FINISHED':
        return 'Finished';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity activeOpacity={0.9} style={styles.featuredCard}>
        <View style={styles.featuredWhiteCard}>
          <View style={styles.featuredContent}>
            {/* Header with league name and status */}
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTitleSection}>
                <Text style={styles.featuredLeagueName}>{league.name}</Text>
                <View style={styles.gameTypeChip}>
                  <Text style={styles.gameTypeText}>{league.gameType}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(league.status) }]}>
                <Text style={styles.statusText}>{getStatusText(league.status)}</Text>
              </View>
            </View>
            
            {/* Description */}
            <View style={styles.featuredInfo}>
              {league.description && (
                <Text style={styles.featuredDescription} numberOfLines={2}>
                  {league.description}
                </Text>
              )}
            </View>
            
            {/* Bottom section with stats and CTA */}
            <View style={styles.featuredBottom}>
              <View style={styles.statsRow}>
                <Text style={styles.memberCountText}>
                  {league.memberCount || 0} players joined
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.featuredCta} 
                onPress={handleJoinPress}
              >
                <Text style={styles.featuredCtaText}>Join Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.regularCard}>
      <View style={styles.regularCardContent}>
        {/* Header with league name and status */}
        <View style={styles.regularHeader}>
          <View style={styles.regularTitleSection}>
            <Text style={styles.regularLeagueName}>{league.name}</Text>
            <View style={styles.gameTypeChip}>
              <Text style={styles.gameTypeText}>{league.gameType}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(league.status) }]}>
            <Text style={styles.statusText}>{getStatusText(league.status)}</Text>
          </View>
        </View>
        
        {/* Description */}
        <View style={styles.regularInfo}>
          {league.description && (
            <Text style={styles.regularDescription} numberOfLines={1}>
              {league.description}
            </Text>
          )}
        </View>
        
        {/* Bottom section with stats and CTA */}
        <View style={styles.regularBottom}>
          <View style={styles.regularStats}>
            <Text style={styles.regularStatText}>
              {league.memberCount || 0} players joined
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.regularCta} 
            onPress={handleJoinPress}
          >
            <Text style={styles.regularCtaText}>Join Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredWhiteCard: {
    width: '100%',
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredContent: {
    padding: isSmallScreen ? 14 : isTablet ? 20 : 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featuredTitleSection: {
    flex: 1,
    marginRight: 8,
  },
  featuredLeagueName: {
    color: '#111827',
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  gameTypeChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    paddingTop: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  gameTypeText: {
    color: '#6B7280',
    fontSize: isSmallScreen ? 10 : isTablet ? 12 : 11,
    fontWeight: '600',
  },
  featuredInfo: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  featuredLocation: {
    color: '#6B7280',
    fontSize: isSmallScreen ? 11 : isTablet ? 14 : 12,
    fontWeight: '500',
  },
  featuredDescription: {
    color: '#9CA3AF',
    fontSize: isSmallScreen ? 11 : isTablet ? 13 : 12,
    lineHeight: isSmallScreen ? 16 : isTablet ? 18 : 16,
  },
  featuredBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flex: 1,
  },
  memberCountText: {
    color: '#6B7280',
    fontSize: isSmallScreen ? 11 : isTablet ? 14 : 12,
    fontWeight: '600',
  },
  featuredCta: {
    backgroundColor: '#111827',
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 18 : 14,
    paddingVertical: isSmallScreen ? 6 : isTablet ? 10 : 8,
    borderRadius: 18,
    marginLeft: 12,
  },
  featuredCtaText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 11 : isTablet ? 14 : 12,
    fontWeight: '700',
  },
  
  // Regular card styles
  regularCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  regularCardContent: {
    paddingHorizontal: isSmallScreen ? 14 : isTablet ? 18 : 16,
    paddingVertical: isSmallScreen ? 10 : isTablet ? 14 : 12,
  },
  regularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  regularTitleSection: {
    flex: 1,
    marginRight: 8,
  },
  regularLeagueName: {
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  regularInfo: {
    marginBottom: 8,
  },
  regularLocation: {
    fontSize: isSmallScreen ? 10 : isTablet ? 13 : 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  regularDescription: {
    fontSize: isSmallScreen ? 10 : isTablet ? 12 : 11,
    color: '#9CA3AF',
  },
  regularBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regularStats: {
    flex: 1,
  },
  regularStatText: {
    color: '#6B7280',
    fontSize: isSmallScreen ? 10 : isTablet ? 13 : 11,
    fontWeight: '500',
  },
  regularCta: {
    backgroundColor: '#111827',
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 16 : 14,
    paddingVertical: isSmallScreen ? 6 : isTablet ? 8 : 7,
    borderRadius: 12,
  },
  regularCtaText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 10 : isTablet ? 13 : 11,
    fontWeight: '700',
  },
  
  // Shared styles
  statusBadge: {
    paddingHorizontal: isSmallScreen ? 6 : isTablet ? 10 : 8,
    paddingVertical: isSmallScreen ? 2 : isTablet ? 4 : 3,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 9 : isTablet ? 12 : 10,
    fontWeight: '600',
  },
});

