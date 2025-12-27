import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Pressable,
  Platform,
  Linking,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@core/theme/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// BackgroundGradient Component (consistent with settings)
const BackgroundGradient = () => {
  return (
    <LinearGradient
      colors={['#FE9F4D', '#FFF5EE', '#FFFFFF']}
      locations={[0, 0.4, 1.0]}
      style={styles.backgroundGradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    />
  );
};

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'How do I join a league?',
    answer: 'Navigate to the Leagues tab from the dashboard. Browse available leagues and tap on one to view details. If registration is open, you\'ll see a "Join" button. Complete the registration form and you\'ll be assigned to a division based on your skill level.',
  },
  {
    id: '2',
    question: 'How do I schedule a match?',
    answer: 'Go to your division chat from the Dashboard. Tap the "+" button to create a new match. Select your opponent, propose time slots, and wait for them to confirm. Once both players agree on a time, the match will be scheduled.',
  },
  {
    id: '3',
    question: 'How do I submit match results?',
    answer: 'After playing your match, go to the match details and tap "Submit Result". Enter the score for each set. Your opponent will need to confirm the result. Once confirmed, your ratings and standings will be updated automatically.',
  },
  {
    id: '4',
    question: 'What if my opponent disputes the score?',
    answer: 'If there\'s a disagreement about the score, your opponent can dispute it. An admin will review the dispute and make a final decision. Make sure to submit accurate scores to avoid disputes.',
  },
  {
    id: '5',
    question: 'How are ratings calculated?',
    answer: 'We use the DMR (Deuce Match Rating) system. Your rating changes based on match results, considering factors like your opponent\'s rating, match outcome, and game scores. Winning against higher-rated players gives you more points.',
  },
  {
    id: '6',
    question: 'How do I find a doubles partner?',
    answer: 'Go to the Community tab and browse players. You can send partner requests to players you\'d like to team up with. Once they accept, you\'ll be listed as partners and can join doubles matches together.',
  },
  {
    id: '7',
    question: 'Can I play friendly matches?',
    answer: 'Yes! Friendly matches don\'t affect your league standing but still count toward your overall statistics. Go to the Friendly Matches section to create or join casual games with other players.',
  },
  {
    id: '8',
    question: 'How do I change my skill level?',
    answer: 'Your skill level is initially set during onboarding based on your questionnaire answers. If you believe your level is incorrect, contact support. Your rating will also naturally adjust as you play more matches.',
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('mailto:support@deuceleague.com');
  };

  const handleSendFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/feedback' as any);
  };

  return (
    <View style={styles.container}>
      <BackgroundGradient />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.headerTitle}>Help Center</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

            <View style={styles.faqContainer}>
              {faqItems.map((item, index) => (
                <View key={item.id}>
                  <Pressable
                    style={styles.faqItem}
                    onPress={() => toggleExpanded(item.id)}
                  >
                    <View style={styles.faqQuestion}>
                      <Text style={styles.faqQuestionText}>{item.question}</Text>
                      <Ionicons
                        name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.colors.neutral.gray[500]}
                      />
                    </View>
                    {expandedId === item.id && (
                      <Text style={styles.faqAnswerText}>{item.answer}</Text>
                    )}
                  </Pressable>
                  {index < faqItems.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Still Need Help?</Text>

            <View style={styles.contactContainer}>
              <Pressable
                style={styles.contactCard}
                onPress={handleContactSupport}
              >
                <View style={styles.contactIconContainer}>
                  <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactTitle}>Email Support</Text>
                  <Text style={styles.contactSubtitle}>support@deuceleague.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral.gray[400]} />
              </Pressable>

              <Pressable
                style={styles.contactCard}
                onPress={handleSendFeedback}
              >
                <View style={styles.contactIconContainer}>
                  <Ionicons name="chatbubble-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactTitle}>Send Feedback</Text>
                  <Text style={styles.contactSubtitle}>Share your thoughts with us</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral.gray[400]} />
              </Pressable>
            </View>
          </View>

          {/* Quick Tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Tips</Text>

            <View style={styles.tipsContainer}>
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.tipText}>
                  Enable push notifications to never miss a match invitation
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.tipText}>
                  Propose multiple time slots to increase match scheduling success
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="trophy-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.tipText}>
                  Play regularly to improve your rating and climb the leaderboard
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
    height: '50%',
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.heavy as any,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.md,
  },
  faqContainer: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  faqItem: {
    padding: theme.spacing.lg,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.neutral.gray[800],
    fontFamily: theme.typography.fontFamily.primary,
    paddingRight: theme.spacing.md,
  },
  faqAnswerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 20,
    marginTop: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral.gray[100],
    marginHorizontal: theme.spacing.lg,
  },
  contactContainer: {
    gap: theme.spacing.md,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.neutral.gray[800],
    fontFamily: theme.typography.fontFamily.primary,
  },
  contactSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 2,
  },
  tipsContainer: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 20,
  },
});
