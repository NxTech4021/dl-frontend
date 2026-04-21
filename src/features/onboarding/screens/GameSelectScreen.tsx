import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useOnboarding } from '../OnboardingContext';
import { SportButton, BackButton, ConfirmButton, ProgressIndicator, SkillLevelModal } from '../components';
import { questionnaireAPI } from '../services/api';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner-native';
import type { SportType, SkillLevel } from '../types';

const GameSelectScreen = () => {
  const { data, updateData } = useOnboarding();
  const { data: session } = useSession();
  const [selectedSports, setSelectedSports] = useState<SportType[]>(
    (data.selectedSports as SportType[]) || []
  );
  const [sportSkillLevels, setSportSkillLevels] = useState<Partial<Record<SportType, SkillLevel>>>(
    data.sportSkillLevels || {}
  );
  const [isSaving, setIsSaving] = useState(false);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSport, setCurrentSport] = useState<SportType | null>(null);

  // Update context when sport selection or skill levels change
  useEffect(() => {
    updateData({ selectedSports, sportSkillLevels });
  }, [selectedSports, sportSkillLevels]);

  const handleSportSelect = (sport: SportType) => {
    if (selectedSports.includes(sport)) {
      // Remove if already selected (deselect)
      setSelectedSports(prev => prev.filter(s => s !== sport));
      // Also remove the skill level
      setSportSkillLevels(prev => {
        const updated = { ...prev };
        delete updated[sport];
        return updated;
      });
    } else {
      // Open modal to select skill level
      setCurrentSport(sport);
      setIsModalVisible(true);
    }
  };

  const handleSkillLevelSave = (level: SkillLevel) => {
    if (currentSport) {
      // Save skill level
      setSportSkillLevels(prev => ({
        ...prev,
        [currentSport]: level,
      }));
      // Add sport to selected list
      setSelectedSports(prev => [...prev, currentSport]);
      // Close modal
      setIsModalVisible(false);
      setCurrentSport(null);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setCurrentSport(null);
  };

  const handleConfirm = async () => {
    if (selectedSports.length === 0) return;

    setIsSaving(true);
    try {
      // Save sports to backend
      if (session?.user?.id) {
        await questionnaireAPI.saveSports(session.user.id, selectedSports);
        console.log('Sports saved to backend:', selectedSports);

        // Save skill levels to backend
        if (Object.keys(sportSkillLevels).length > 0) {
          await questionnaireAPI.saveSkillLevels(session.user.id, sportSkillLevels);
          console.log('Skill levels saved to backend:', sportSkillLevels);
        }

        // Update onboarding step to GAME_SELECT
        try {
          await questionnaireAPI.updateOnboardingStep(session.user.id, 'GAME_SELECT');
          console.log('Onboarding step updated to GAME_SELECT');
        } catch (stepError) {
          console.error('Error updating onboarding step:', stepError);
        }
      }

      // Navigate to profile picture screen
      router.push('/onboarding/profile-picture');
    } catch (error) {
      console.error('Error saving sports:', error);
      toast.error('Error', {
        description: 'Failed to save sports selection. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <BackButton />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Choose your sport</Text>
          <Text style={styles.subtitle}>What do you play?</Text>
          <Text style={styles.helperText}>Play more than one? Just select them all.</Text>
        </View>

        {/* Sport Selection using reusable SportButton component */}
        <View style={styles.sportsContainer}>
          <SportButton
            sport="pickleball"
            isSelected={selectedSports.includes('pickleball')}
            onPress={() => handleSportSelect('pickleball')}
            skillLevel={sportSkillLevels.pickleball}
          />

          <SportButton
            sport="tennis"
            isSelected={selectedSports.includes('tennis')}
            onPress={() => handleSportSelect('tennis')}
            skillLevel={sportSkillLevels.tennis}
          />

          <SportButton
            sport="padel"
            isSelected={selectedSports.includes('padel')}
            onPress={() => handleSportSelect('padel')}
            skillLevel={sportSkillLevels.padel}
          />
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.buttonContainer}>
        <ConfirmButton
          onPress={handleConfirm}
          disabled={selectedSports.length === 0}
          isLoading={isSaving}
        />
      </View>

      {/* Fixed Progress Indicator */}
      <ProgressIndicator currentStep={2} totalSteps={3} />

      {/* Skill Level Selection Modal */}
      <SkillLevelModal
        visible={isModalVisible}
        sport={currentSport}
        selectedLevel={currentSport ? sportSkillLevels[currentSport] || null : null}
        onSave={handleSkillLevelSave}
        onClose={handleModalClose}
      />
    </SafeAreaView>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive calculations
const isSmallDevice = screenHeight < 700;
const horizontalPadding = Math.max(screenWidth * 0.08, 20); // 8% of screen, min 20px
const buttonPadding = Math.max(screenWidth * 0.18, 60); // 18% of screen, min 60px
const bottomPosition = isSmallDevice ? 70 : Math.max(screenHeight * 0.12, 80); // Smaller on small devices

// Responsive header margin
const headerTopMargin = isSmallDevice
  ? (Platform.OS === 'ios' ? 40 : 80)
  : (Platform.OS === 'ios' ? 70 : 130);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: isSmallDevice ? 140 : 160, // Space for button at bottom
  },
  buttonContainer: {
    position: 'absolute',
    bottom: bottomPosition,
    left: 0,
    right: 0,
    paddingHorizontal: buttonPadding,
    paddingBottom: 10,
  },
  headerContainer: {
    paddingHorizontal: horizontalPadding,
    marginTop: headerTopMargin,
  },
  title: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: '700',
    color: '#000000',
    lineHeight: isSmallDevice ? 36 : 40,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#FEA04D',
    lineHeight: isSmallDevice ? 28 : 34,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    marginBottom: isSmallDevice ? 12 : 18,
  },
  helperText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '500',
    color: '#8C8C8C',
    lineHeight: isSmallDevice ? 20 : 22,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    marginBottom: isSmallDevice ? 8 : 10,
  },
  sportsContainer: {
    paddingHorizontal: horizontalPadding,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});

export default GameSelectScreen;