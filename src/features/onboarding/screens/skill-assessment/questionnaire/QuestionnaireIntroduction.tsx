import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SportBranding } from '../components/SportBranding';
import { styles } from './QuestionnaireIntroduction.styles';

interface QuestionnaireIntroductionProps {
  sport: 'pickleball' | 'tennis' | 'padel';
  firstName: string;
  onStartAssessment: () => void;
  onSkipAssessment: () => void;
  skipButtonText?: string;
}

export const QuestionnaireIntroduction: React.FC<QuestionnaireIntroductionProps> = ({
  sport,
  firstName,
  onStartAssessment,
  onSkipAssessment,
  skipButtonText = 'Skip for now',
}) => {
  return (
    <View style={styles.fullContainer}>
      {/* Sport branding */}
      <View style={styles.brandingSection}>
        <SportBranding sport={sport} />
      </View>

      {/* Introduction container - Now in flex layout */}
      <View style={styles.introductionContainer}>
        <ScrollView
          // style={styles.scrollContainer}
          // contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.whiteCard}>
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={[
              styles.greetingText,
              sport === 'tennis' && styles.tennisGreetingText,
              sport === 'padel' && styles.padelGreetingText
            ]}>
              Hi, {firstName}
            </Text>
          </View>

          <Text style={styles.introTitle}>It&apos;s time to set your level.</Text>

          {/* Intro Points */}
          <View style={styles.introPoints}>
            <View style={styles.introPointContainer}>
              <View style={[
                styles.arrowCircle,
                sport === 'tennis' && styles.tennisArrowCircle,
                sport === 'padel' && styles.padelArrowCircle
              ]}>
                <Text style={[
                  styles.arrowText,
                  sport === 'tennis' && styles.tennisArrowText,
                  sport === 'padel' && styles.padelArrowText
                ]}>→</Text>
              </View>
              <Text style={styles.introPoint}>5 mins or less</Text>
            </View>

            <View style={styles.introPointContainer}>
              <View style={[
                styles.arrowCircle,
                sport === 'tennis' && styles.tennisArrowCircle,
                sport === 'padel' && styles.padelArrowCircle
              ]}>
                <Text style={[
                  styles.arrowText,
                  sport === 'tennis' && styles.tennisArrowText,
                  sport === 'padel' && styles.padelArrowText
                ]}>→</Text>
              </View>
              <Text style={styles.introPoint}>About your play style & experience</Text>
            </View>

            {sport !== 'tennis' && (
              <View style={styles.introPointContainer}>
                <View style={[
                  styles.arrowCircle,
                  sport === 'padel' && styles.padelArrowCircle
                ]}>
                  <Text style={[
                    styles.arrowText,
                    sport === 'padel' && styles.padelArrowText
                  ]}>→</Text>
                </View>
                <Text style={styles.introPoint}>
                  Already have a DUPR rating? We&apos;ll sync it
                </Text>
              </View>
            )}

            <View style={styles.introPointContainer}>
              <View style={[
                styles.arrowCircle,
                sport === 'tennis' && styles.tennisArrowCircle,
                sport === 'padel' && styles.padelArrowCircle
              ]}>
                <Text style={[
                  styles.arrowText,
                  sport === 'tennis' && styles.tennisArrowText,
                  sport === 'padel' && styles.padelArrowText
                ]}>→</Text>
              </View>
              <Text style={styles.introPoint}>Not sure? Skip and come back later</Text>
            </View>
          </View>

          <Text style={styles.introDescription}>
            You&apos;ll start with a provisional DMR based on your experience and skill level to match you with the most balanced competition in the right division.
          </Text>

          {/* Buttons */}
          <View style={styles.introButtonContainer}>
            <TouchableOpacity
              style={[
                styles.startButton,
                sport === 'tennis' && styles.tennisStartButton,
                sport === 'padel' && styles.padelStartButton
              ]}
              onPress={onStartAssessment}
            >
              <Text style={styles.startButtonText}>Start Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.answerLaterButton,
                sport === 'tennis' && styles.tennisAnswerLaterButton,
                sport === 'padel' && styles.padelAnswerLaterButton
              ]}
              onPress={onSkipAssessment}
            >
              <Text style={[
                styles.answerLaterButtonText,
                sport === 'tennis' && styles.tennisAnswerLaterButtonText,
                sport === 'padel' && styles.padelAnswerLaterButtonText
              ]}>{skipButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </View>
    </View>
  );
};
