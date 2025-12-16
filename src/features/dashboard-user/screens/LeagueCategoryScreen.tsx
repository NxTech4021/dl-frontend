import React from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, Platform, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { NavBar } from '@/shared/components/layout';
import { SportDropdownHeader } from '@/shared/components/ui/SportDropdownHeader';
import * as Haptics from 'expo-haptics';
import { CategoryService, Category } from '@/src/features/dashboard-user/services/CategoryService';
import { useSession } from '@/lib/auth-client';
import { questionnaireAPI } from '@/src/features/onboarding/services/api';

const { width, height } = Dimensions.get('window');

interface LeagueCategoryScreenProps {
  leagueId?: string;
  leagueName?: string;
  playerCount?: number;
  season?: string;
  sport?: 'pickleball' | 'tennis';
  gameType?: 'SINGLES' | 'DOUBLES';
}

export default function LeagueCategoryScreen({
  leagueId,
  leagueName = 'Subang League',
  playerCount = 28,
  season = 'S1',
  sport = 'pickleball',
  gameType = 'SINGLES'
}: LeagueCategoryScreenProps) {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = React.useState(2);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userGender, setUserGender] = React.useState<string | null>(null);

  // Fetch user profile to get gender
  React.useEffect(() => {
    const fetchUserGender = async () => {
      if (!session?.user?.id) return;

      try {
        const { user } = await questionnaireAPI.getUserProfile(session.user.id);
        setUserGender(user.gender?.toUpperCase() || null);
        console.log('Fetched user gender from profile:', user.gender);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserGender();
  }, [session?.user?.id]);

  React.useEffect(() => {
    console.log('LeagueCategoryScreen loaded successfully!');
    console.log('League:', leagueName, 'Players:', playerCount, 'Season:', season, 'Sport:', sport, 'GameType:', gameType);
    console.log('User gender from profile:', userGender);

    // Fetch categories if leagueId is provided
    if (leagueId) {
      fetchCategories();
    } else {
      setIsLoading(false);
    }
  }, [leagueId, leagueName, playerCount, season, sport, gameType, userGender]);

  const fetchCategories = async () => {
    if (!leagueId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching categories for league:', leagueId);
      console.log('User gender:', userGender);

      const fetchedCategories = await CategoryService.fetchLeagueCategories(leagueId);
      console.log('Fetched categories:', fetchedCategories);

      // Filter by game type first
      const gameTypeFiltered = CategoryService.filterCategoriesByGameType(fetchedCategories, gameType);
      console.log('Game type filtered:', gameTypeFiltered);

      // Filter by user gender - show only categories user can join
      const genderFiltered = gameTypeFiltered.filter(category => {
        // Check both snake_case (gender_category) and camelCase (genderCategory) for backward compatibility
        const genderCategory = category.gender_category?.toUpperCase() || category.genderCategory?.toUpperCase();
        const genderRestriction = category.genderRestriction?.toUpperCase();

        // Use either gender_category/genderCategory or genderRestriction field
        const categoryGender = genderCategory || genderRestriction;

        console.log(`\n--- Filtering Category: ${category.name} ---`);
        console.log(`  gender_category: ${category.gender_category}`);
        console.log(`  genderRestriction: ${category.genderRestriction}`);
        console.log(`  Resolved categoryGender: ${categoryGender}`);
        console.log(`  User gender: ${userGender}`);

        // Show if category is MIXED (open to all)
        if (categoryGender === 'MIXED' || categoryGender === 'OPEN') {
          console.log(`  ✅ SHOW (MIXED/OPEN)`);
          return true;
        }

        // Show if category matches user's gender
        if (userGender && categoryGender === userGender) {
          console.log(`  ✅ SHOW (Gender match: ${categoryGender} === ${userGender})`);
          return true;
        }

        // Hide if no match
        console.log(`  ❌ HIDE (No match: ${categoryGender} !== ${userGender})`);
        return false;
      });

      console.log('Gender filtered categories:', genderFiltered);
      setCategories(genderFiltered);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabPress = (tabIndex: number) => {
    console.log(`Tab ${tabIndex} pressed - ${['Favourite', 'Friendly', 'Leagues', 'My Games', 'Chat'][tabIndex]}`);
    setActiveTab(tabIndex);
  };

  const handleCategoryPress = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const displayName = CategoryService.getCategoryDisplayName(category, gameType);
    const effectiveGender = CategoryService.getEffectiveGender(category);
    console.log(`Selected category: ${displayName} for ${sport} league: ${leagueName}`);
    console.log('Category details:', {
      id: category.id,
      name: category.name,
      game_type: category.game_type || category.gameType,
      genderRestriction: category.genderRestriction,
      gender_category: category.gender_category || category.genderCategory,
      effectiveGender,
      categoryOrder: category.categoryOrder
    });
    
    // Navigate to seasons screen with proper data
    router.push({
      pathname: '/user-dashboard/seasons',
      params: {
        category: displayName,
        categoryId: category.id,
        leagueId: leagueId || '',
        leagueName: leagueName || '',
        sport: sport || 'pickleball'
      }
    });
  };

  const getSportEmoji = () => {
    return sport === 'pickleball' ? '🏓' : '🎾';
  };


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={sport === 'pickleball' ? ['#B98FAF', '#FFFFFF'] : ['#B3CFBC', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.contentContainer}>
        {/* Header Section */}
        <SportDropdownHeader 
          currentSport={sport}
          sportName={sport === 'pickleball' ? 'Pickleball' : 'Tennis'}
          sportColor={sport === 'pickleball' ? '#863A73' : '#008000'}
        />
        
        {/* League Info Section */}
        <View style={styles.leagueInfoContainer}>
          <View style={styles.leagueInfoRow}>
            <View style={styles.leagueInfoLeft}>
              <Text style={styles.leagueNameText}>{leagueName}</Text>
              <Text style={styles.leagueSubtitleText}>{playerCount} players joined</Text>
            </View>
            <View style={styles.trophyBadge}>
              <Text style={styles.trophyText}>🏆 {season}</Text>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Category Selection Cards */}
          <View style={styles.categoriesContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#863A73" />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchCategories}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : categories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No categories available for this league
                </Text>
                <Text style={styles.emptySubtext}>
                  Categories will appear here once they are created by the league administrator.
                </Text>
              </View>
            ) : (
              categories
                .sort((a, b) => a.categoryOrder - b.categoryOrder)
                .map((category) => {
                  const effectiveGameType = CategoryService.getEffectiveGameType(category, gameType);
                  const displayName = CategoryService.getCategoryDisplayName(category, effectiveGameType);
                  const effectiveGender = CategoryService.getEffectiveGender(category);
                  const categoryEmoji = CategoryService.getCategoryEmoji(effectiveGender);
                  const isDoubles = effectiveGameType === 'DOUBLES';
                  
                  return (
                    <TouchableOpacity 
                      key={category.id}
                      style={styles.categoryCard}
                      activeOpacity={0.8}
                      onPress={() => handleCategoryPress(category)}
                    >
                      <View style={styles.categoryIllustration}>
                        <View style={styles.characterContainer}>
                          <Text style={styles.characterEmoji}>{getSportEmoji()}</Text>
                          {isDoubles ? (
                            <View style={styles.doublesCharacters}>
                              <Text style={styles.characterText}>{categoryEmoji}</Text>
                              <Text style={styles.characterText}>
                                {effectiveGender === 'MIXED' ? '👩' : categoryEmoji}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.characterText}>{categoryEmoji}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.categoryTitleContainer}>
                        <Text style={styles.categoryTitle}>
                          {displayName}
                        </Text>
                        {(category.game_type || category.gameType) && (
                          <Text style={styles.categoryGameTypeText}>
                            {(category.game_type || category.gameType || '').toLowerCase()}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </View>
        </ScrollView>
      </View>
      
      <NavBar activeTab={activeTab} onTabPress={handleTabPress} />
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
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  leagueInfoContainer: {
    marginTop: 5,
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  leagueInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leagueInfoLeft: {
    flex: 1,
  },
  leagueNameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'left',
  },
  leagueSubtitleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'left',
  },
  trophyBadge: {
    backgroundColor: '#863A73',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#863A73',
  },
  trophyText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  categoriesContainer: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  categoryIllustration: {
    width: 80,
    height: 80,
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  characterText: {
    fontSize: 20,
  },
  doublesCharacters: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#863A73',
    textAlign: 'center',
  },
  categoryGameTypeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#863A73',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
