import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useOnboarding } from '../OnboardingContext';
import { SportButton, BackgroundGradient, DeuceLogo, BackButton, ConfirmButton } from '../components';
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
      <BackgroundGradient />
      <BackButton />

      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={styles.backgroundTouchable}
          activeOpacity={1}
          onPress={() => setSelectedSports([])}
        >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <DeuceLogo />
        </View>

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
    </SafeAreaView>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const horizontalPadding = Math.max(screenWidth * 0.08, 20); // 8% of screen, min 20px
const buttonPadding = Math.max(screenWidth * 0.18, 60); // 18% of screen, min 60px
const bottomPosition = Math.max(screenHeight * 0.05, 40); // 5% of screen height, min 40px

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
  },
  backgroundTouchable: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FE9F4D',
  },
  headerContainer: {
    paddingHorizontal: horizontalPadding,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 40,
    marginBottom: 10,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FEA04D',
    lineHeight: 34,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#BABABA',
    lineHeight: 20,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
  },
  sportsContainer: {
    alignItems: 'center',
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