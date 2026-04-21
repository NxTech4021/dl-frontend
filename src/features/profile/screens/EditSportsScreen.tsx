import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { useSession } from '@/lib/auth-client';
import axiosInstance from '@/lib/endpoints';
import { SportButton, SkillLevelModal } from '@features/onboarding/components';
import { questionnaireAPI } from '@features/onboarding/services/api';
import type { SportType, SkillLevel } from '@features/onboarding/types';
import { theme } from '@/src/core/theme/theme';

const SPORTS: SportType[] = ['pickleball', 'tennis', 'padel'];

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenHeight < 700;
const horizontalPadding = Math.max(screenWidth * 0.06, 16);

export function EditSportsScreen() {
  const { data: session } = useSession();
  const insets = useSafeAreaInsets();
  // Optional param: when navigating from skill level card, pre-open the modal for that sport
  const { sport: sportParam } = useLocalSearchParams<{ sport?: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedSports, setSelectedSports] = useState<SportType[]>([]);
  const [sportSkillLevels, setSportSkillLevels] = useState<Partial<Record<SportType, SkillLevel>>>({});

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSport, setCurrentSport] = useState<SportType | null>(null);

  // Load the user's current sports + self-assessed skill levels on mount
  const fetchCurrentSports = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/player/profile/me');
      const profileData = response?.data?.data ?? response?.data;

      if (profileData) {
        const sports: SportType[] = (profileData.sports || []).map((s: string) => s.toLowerCase() as SportType);
        setSelectedSports(sports);

        const selfAssessed: Partial<Record<SportType, SkillLevel>> = {};
        const raw = profileData.selfAssessedSkillLevels || {};
        SPORTS.forEach((sport) => {
          const level = raw[sport] || raw[`${sport}SkillLevel`];
          if (level) selfAssessed[sport] = level as SkillLevel;
        });
        setSportSkillLevels(selfAssessed);
      }
    } catch (error) {
      console.error('EditSportsScreen: Failed to load profile', error);
      toast.error('Failed to load current sports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentSports();
  }, [fetchCurrentSports]);

  // If a sport param was passed (from skill level edit), open its modal once data has loaded
  useEffect(() => {
    if (!isLoading && sportParam && SPORTS.includes(sportParam as SportType)) {
      setCurrentSport(sportParam as SportType);
      setIsModalVisible(true);
    }
  }, [isLoading, sportParam]);

  const handleSportPress = (sport: SportType) => {
    if (selectedSports.includes(sport)) {
      // Deselect — remove sport and its skill level
      setSelectedSports((prev) => prev.filter((s) => s !== sport));
      setSportSkillLevels((prev) => {
        const updated = { ...prev };
        delete updated[sport];
        return updated;
      });
    } else {
      // Select — open skill level picker first
      setCurrentSport(sport);
      setIsModalVisible(true);
    }
  };

  const handleSkillLevelSave = (level: SkillLevel) => {
    if (currentSport) {
      setSportSkillLevels((prev) => ({ ...prev, [currentSport]: level }));
      setSelectedSports((prev) =>
        prev.includes(currentSport) ? prev : [...prev, currentSport]
      );
    }
    setIsModalVisible(false);
    setCurrentSport(null);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setCurrentSport(null);
  };

  const handleSave = async () => {
    if (selectedSports.length === 0) {
      toast.error('Select at least one sport');
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Not authenticated');
      return;
    }

    setIsSaving(true);
    try {
      // Update sports list (handles additions and removals)
      await axiosInstance.put('/api/player/sports', { sports: selectedSports });

      // Save self-assessed skill levels for selected sports
      const levelsToSave: Partial<Record<SportType, string>> = {};
      selectedSports.forEach((sport) => {
        if (sportSkillLevels[sport]) {
          levelsToSave[sport] = sportSkillLevels[sport] as string;
        }
      });
      if (Object.keys(levelsToSave).length > 0) {
        await questionnaireAPI.saveSkillLevels(userId, levelsToSave);
      }

      toast.success('Sports updated');
      router.back();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to save sports';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Sports</Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FEA04D" />
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>What do you play?</Text>
            <Text style={styles.helperText}>
              Play more than one? Just select them all.
            </Text>

            <View style={styles.sportsContainer}>
              {SPORTS.map((sport) => (
                <SportButton
                  key={sport}
                  sport={sport}
                  isSelected={selectedSports.includes(sport)}
                  onPress={() => handleSportPress(sport)}
                  skillLevel={sportSkillLevels[sport] ?? null}
                />
              ))}
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (selectedSports.length === 0 || isSaving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={selectedSports.length === 0 || isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <SkillLevelModal
        visible={isModalVisible}
        sport={currentSport}
        selectedLevel={currentSport ? (sportSkillLevels[currentSport] ?? null) : null}
        onSave={handleSkillLevelSave}
        onClose={handleModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalPadding,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: horizontalPadding,
    paddingTop: isSmallDevice ? 16 : 24,
    paddingBottom: 120,
  },
  subtitle: {
    fontSize: isSmallDevice ? 22 : 26,
    fontWeight: '700',
    color: '#FEA04D',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  helperText: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '500',
    color: '#8C8C8C',
    marginBottom: isSmallDevice ? 16 : 24,
    fontFamily: 'Inter',
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: horizontalPadding,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
