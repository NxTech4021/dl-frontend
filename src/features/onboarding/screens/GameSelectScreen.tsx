import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useOnboarding } from '../OnboardingContext';
import { SportButton, DeuceLogo, BackButton, ConfirmButton, ProgressIndicator } from '../components';
import { questionnaireAPI } from '../services/api';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner-native';
import type { SportType } from '../types';

const GameSelectScreen = () => {
  const { data, updateData } = useOnboarding();
  const { data: session } = useSession();
  const [selectedSports, setSelectedSports] = useState<SportType[]>(
    (data.selectedSports as SportType[]) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  // Update context when sport selection changes
  useEffect(() => {
    updateData({ selectedSports });
  }, [selectedSports]);

  const handleSportSelect = (sport: SportType) => {
    setSelectedSports(prev => {
      if (prev.includes(sport)) {
        // Remove if already selected
        return prev.filter(s => s !== sport);
      } else {
        // Add to selection in order
        return [...prev, sport];
      }
    });
  };

  const handleConfirm = async () => {
    if (selectedSports.length === 0) return;

    setIsSaving(true);
    try {
      // Save sports to backend
      if (session?.user?.id) {
        await questionnaireAPI.saveSports(session.user.id, selectedSports);
        console.log('Sports saved to backend:', selectedSports);

        // Update onboarding step to GAME_SELECT
        try {
          await questionnaireAPI.updateOnboardingStep(session.user.id, 'GAME_SELECT');
          console.log('Onboarding step updated to GAME_SELECT');
        } catch (stepError) {
          console.error('Error updating onboarding step:', stepError);
        }
      }

      // Navigate to skill assessment for first sport
      router.push(`/onboarding/skill-assessment?sport=${selectedSports[0]}&sportIndex=0`);
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

      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={styles.backgroundTouchable}
          activeOpacity={1}
          onPress={() => setSelectedSports([])}
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
          />
          
          <SportButton
            sport="tennis"
            isSelected={selectedSports.includes('tennis')}
            onPress={() => handleSportSelect('tennis')}
          />
          
          <SportButton
            sport="padel"
            isSelected={selectedSports.includes('padel')}
            onPress={() => handleSportSelect('padel')}
          />
        </View>

        </TouchableOpacity>
      </View>
      
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
    </SafeAreaView>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const horizontalPadding = Math.max(screenWidth * 0.08, 20); // 8% of screen, min 20px
const buttonPadding = Math.max(screenWidth * 0.18, 60); // 18% of screen, min 60px
const bottomPosition = Math.max(screenHeight * 0.12, 80); // 12% of screen height, min 80px

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 120,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: bottomPosition,
    left: 0,
    right: 0,
    paddingHorizontal: buttonPadding,
    paddingBottom: 10,
  },
  backgroundTouchable: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: horizontalPadding,
    marginTop: Platform.OS === 'ios' ? 70 : 130,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 40,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FEA04D',
    lineHeight: 34,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    marginBottom: 18,
  },
  helperText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8C8C8C',
    lineHeight: 22,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    marginBottom: 10,
  },
  sportsContainer: {
    paddingHorizontal: horizontalPadding,
    gap: 8,
  },
  sportButton: {
    height: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 4,
  },
  sportButtonPickleballActive: {
    borderColor: '#512546',
    backgroundColor: '#F9F5F8',
  },
  sportButtonTennisActive: {
    borderColor: '#374F35',
    backgroundColor: '#F5F7F5',
  },
  sportButtonPadelActive: {
    borderColor: '#7D3C03',
    backgroundColor: '#FBF7F5',
  },
  sportText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 24,
  },
});

export default GameSelectScreen;