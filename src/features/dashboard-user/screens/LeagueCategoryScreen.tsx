import React from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, Platform, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { NavBar } from '@/shared/components/layout';
import { SportDropdownHeader } from '@/shared/components/ui/SportDropdownHeader';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface LeagueCategoryScreenProps {
  leagueName?: string;
  playerCount?: number;
  season?: string;
  sport?: 'pickleball' | 'tennis';
}

export default function LeagueCategoryScreen({ 
  leagueName = 'Subang League', 
  playerCount = 28, 
  season = 'S1',
  sport = 'pickleball'
}: LeagueCategoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState(2);

  React.useEffect(() => {
    console.log('LeagueCategoryScreen loaded successfully!');
    console.log('League:', leagueName, 'Players:', playerCount, 'Season:', season, 'Sport:', sport);
  }, [leagueName, playerCount, season, sport]);

  const handleTabPress = (tabIndex: number) => {
    console.log(`Tab ${tabIndex} pressed - ${['Favourite', 'Friendly', 'Leagues', 'My Games', 'Chat'][tabIndex]}`);
    setActiveTab(tabIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCategoryPress = (category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log(`Selected category: ${category} for ${sport} league: ${leagueName}`);
    router.push('/user-dashboard/seasons');
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
            
            {/* Men's Single */}
            <TouchableOpacity 
              style={styles.categoryCard}
              activeOpacity={0.8}
              onPress={() => handleCategoryPress('Men\'s Single')}
            >
              <View style={styles.categoryIllustration}>
                <View style={styles.characterContainer}>
                  <Text style={styles.characterEmoji}>{getSportEmoji()}</Text>
                  <Text style={styles.characterText}>👤</Text>
                </View>
              </View>
              <Text style={styles.categoryTitle}>Men's Single</Text>
            </TouchableOpacity>

            {/* Men's Doubles */}
            <TouchableOpacity 
              style={styles.categoryCard}
              activeOpacity={0.8}
              onPress={() => handleCategoryPress('Men\'s Doubles')}
            >
              <View style={styles.categoryIllustration}>
                <View style={styles.characterContainer}>
                  <Text style={styles.characterEmoji}>{getSportEmoji()}</Text>
                  <View style={styles.doublesCharacters}>
                    <Text style={styles.characterText}>👤</Text>
                    <Text style={styles.characterText}>👤</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.categoryTitle}>Men's Doubles</Text>
            </TouchableOpacity>

            {/* Mixed Doubles */}
            <TouchableOpacity 
              style={styles.categoryCard}
              activeOpacity={0.8}
              onPress={() => handleCategoryPress('Mixed Doubles')}
            >
              <View style={styles.categoryIllustration}>
                <View style={styles.characterContainer}>
                  <Text style={styles.characterEmoji}>{getSportEmoji()}</Text>
                  <View style={styles.doublesCharacters}>
                    <Text style={styles.characterText}>👤</Text>
                    <Text style={styles.characterText}>👩</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.categoryTitle}>Mixed Doubles</Text>
            </TouchableOpacity>

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
    marginTop: 40,
    paddingHorizontal: 24,
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
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#863A73',
    flex: 1,
    textAlign: 'center',
  },
});
