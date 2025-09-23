import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LeagueRegistrationScreen() {
  const params = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('Men\'s Single');

  // Mock data - in real app this would come from API/params
  const leagueData = {
    name: params.leagueName || 'Subang League',
    sport: params.sport || 'Pickleball',
    playersJoined: params.playersJoined || '28 players joined',
    categories: [
      {
        id: 'mens_single',
        name: 'Men\'s Single',
        icon: '🏓',
        matches: [
          {
            id: 'winter_2025',
            name: 'Winter Season 2025',
            duration: '1 Dec 2025 - 31 Jan 2026',
            lastRegistration: '27 Nov 2025',
            entryFee: 'RM59.90',
            playersRegistered: '+95 players registered',
            status: 'In Progress' // In Progress, Upcoming, Past
          }
        ]
      },
      {
        id: 'mens_doubles',
        name: 'Men\'s Doubles',
        icon: '🏓',
        matches: []
      },
      {
        id: 'mixed_doubles',
        name: 'Mixed Doubles',
        icon: '🏓',
        matches: []
      }
    ]
  };

  const handleCategoryPress = (categoryName: string) => {
    setSelectedCategory(categoryName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRegisterPress = (matchId: string, entryFee: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to payment page with match details
    router.push({
      pathname: '/payment',
      params: {
        leagueName: leagueData.name,
        sport: leagueData.sport,
        category: selectedCategory,
        matchId: matchId,
        entryFee: entryFee
      }
    });
  };

  const selectedCategoryData = leagueData.categories.find(cat => cat.name === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#B98FAF', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{leagueData.sport}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* League Info */}
        <View style={styles.leagueInfoSection}>
          <Text style={styles.leagueName}>{leagueData.name}</Text>
          <Text style={styles.playersCount}>{leagueData.playersJoined}</Text>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          {leagueData.categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.name && styles.categoryCardSelected
              ]}
              onPress={() => handleCategoryPress(category.name)}
            >
              <View style={styles.categoryContent}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryName,
                  selectedCategory === category.name && styles.categoryNameSelected
                ]}>
                  {category.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Matches Section */}
        <View style={styles.matchesSection}>
          <View style={styles.matchesHeader}>
            <Text style={styles.sectionTitle}>{selectedCategory} - PJ League</Text>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            <TouchableOpacity style={[styles.tab, styles.activeTab]}>
              <Text style={[styles.tabText, styles.activeTabText]}>In Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab}>
              <Text style={styles.tabText}>Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab}>
              <Text style={styles.tabText}>Past</Text>
            </TouchableOpacity>
          </View>

          {/* Match Cards */}
          {selectedCategoryData?.matches.length ? (
            selectedCategoryData.matches.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchHeader}>
                  <Text style={styles.matchName}>{match.name}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>🏆 S1</Text>
                  </View>
                </View>

                <View style={styles.matchDetails}>
                  <View style={styles.matchDetailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.matchDetailText}>Duration: {match.duration}</Text>
                  </View>
                  <View style={styles.matchDetailRow}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.matchDetailText}>Last Registration: {match.lastRegistration}</Text>
                  </View>
                  <View style={styles.matchDetailRow}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <Text style={styles.matchDetailText}>Entry Fee: {match.entryFee}</Text>
                  </View>
                </View>

                <View style={styles.registrationInfo}>
                  <View style={styles.progressDots}>
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <View key={dot} style={styles.progressDot} />
                    ))}
                  </View>
                  <Text style={styles.registrationText}>{match.playersRegistered}</Text>
                </View>

                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={() => handleRegisterPress(match.id, match.entryFee)}
                >
                  <Text style={styles.registerButtonText}>Register</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No matches available for {selectedCategory}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontStyle: 'italic',
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  leagueInfoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  leagueName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  playersCount: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoriesSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryCardSelected: {
    borderColor: '#863A73',
    backgroundColor: '#F8F0F5',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  categoryNameSelected: {
    color: '#863A73',
  },
  matchesSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  matchesHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#111827',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: 'rgba(134, 58, 115, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#863A73',
  },
  matchDetails: {
    marginBottom: 16,
  },
  matchDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  currencySymbol: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  registrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressDots: {
    flexDirection: 'row',
    marginRight: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginRight: 4,
  },
  registrationText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#863A73',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});