import React from 'react';
import {
  LegalModal,
  LegalSectionTitle,
  LegalSubTitle,
  LegalText,
  LegalBulletList,
} from './LegalModal';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <LegalModal visible={visible} onClose={onClose} title="Privacy Policy">
      <LegalSectionTitle isFirst>Last Updated: January 15, 2025</LegalSectionTitle>

      <LegalText>
        Welcome to Deuce League! We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our sports platform.
      </LegalText>

      <LegalSectionTitle>Information We Collect</LegalSectionTitle>

      <LegalSubTitle>Personal Information</LegalSubTitle>
      <LegalBulletList
        items={[
          'Name, email address, username, and phone number',
          'Profile photo and biographical information',
          'Date of birth and gender (optional)',
          'Location and area information',
        ]}
      />

      <LegalSubTitle>Game Data</LegalSubTitle>
      <LegalBulletList
        items={[
          'Match results and game statistics',
          'Skill levels and performance metrics',
          'Tournament participation and rankings',
          'Playing history and achievements',
        ]}
      />

      <LegalSubTitle>Device & Usage Information</LegalSubTitle>
      <LegalBulletList
        items={[
          'Device type, operating system, and unique identifiers',
          'App usage analytics and feature interactions',
          'IP address and network information',
          'Crash reports and performance data',
        ]}
      />

      <LegalSectionTitle>How We Use Your Information</LegalSectionTitle>
      <LegalText>
        We use your information to provide and improve our services, including:
      </LegalText>
      <LegalBulletList
        items={[
          'Matching you with other players of similar skill levels',
          'Tracking your progress and displaying achievements',
          'Providing personalized recommendations and insights',
          'Communicating important updates and notifications',
          'Improving app performance and user experience',
          'Ensuring platform security and preventing fraud',
        ]}
      />
      <LegalText>
        We never sell your personal data to third parties for marketing purposes.
      </LegalText>

      <LegalSectionTitle>Data Sharing & Disclosure</LegalSectionTitle>
      <LegalText>
        We may share your information in the following circumstances:
      </LegalText>
      <LegalBulletList
        items={[
          'With other players: Your profile information, match history, and statistics are visible to other users on the platform',
          'With service providers: We work with trusted third-party services for analytics, hosting, and customer support',
          'For legal compliance: We may disclose information when required by law or to protect our rights and safety',
          'In business transfers: If Deuce League is acquired or merged, your information may be transferred to the new entity',
        ]}
      />

      <LegalSectionTitle>Data Security</LegalSectionTitle>
      <LegalText>
        We implement industry-standard security measures to protect your data:
      </LegalText>
      <LegalBulletList
        items={[
          'Encryption of data in transit and at rest',
          'Secure servers with regular security audits',
          'Access controls and authentication requirements',
          'Regular security updates and monitoring',
        ]}
      />
      <LegalText>
        While we strive to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
      </LegalText>

      <LegalSectionTitle>Data Retention</LegalSectionTitle>
      <LegalText>
        We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we will:
      </LegalText>
      <LegalBulletList
        items={[
          'Permanently remove your personal information within 30 days',
          'Retain anonymized usage data for analytics purposes',
          'Keep transaction records as required by law',
          'Remove your profile and matches from public view immediately',
        ]}
      />

      <LegalSectionTitle>Your Rights & Choices</LegalSectionTitle>
      <LegalText>
        You have the right to:
      </LegalText>
      <LegalBulletList
        items={[
          'Access your personal information at any time through your account settings',
          'Update or correct your personal information',
          'Delete your account and associated data',
          'Opt out of non-essential communications',
          'Request a copy of your data in a portable format',
          'Object to certain data processing activities',
        ]}
      />

      <LegalSectionTitle>Children's Privacy</LegalSectionTitle>
      <LegalText>
        Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
      </LegalText>

      <LegalSectionTitle>International Data Transfers</LegalSectionTitle>
      <LegalText>
        Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
      </LegalText>

      <LegalSectionTitle>Changes to This Policy</LegalSectionTitle>
      <LegalText>
        We may update this Privacy Policy from time to time. We will notify you of any material changes by:
      </LegalText>
      <LegalBulletList
        items={[
          'Posting the new Privacy Policy in the app',
          'Sending you an email notification',
          'Displaying a prominent notice when you next use the app',
        ]}
      />
      <LegalText>
        Your continued use of our services after changes are made constitutes acceptance of the updated policy.
      </LegalText>

      <LegalSectionTitle>Contact Us</LegalSectionTitle>
      <LegalText>
        If you have any questions about this Privacy Policy or our data practices, please contact us at:
      </LegalText>
      <LegalText>
        Email: privacy@deuceleague.com{'\n'}
        Response Time: Within 48 hours
      </LegalText>
      <LegalText>
        For data deletion requests or to exercise your privacy rights, please use the contact form in the app or email us directly.
      </LegalText>
    </LegalModal>
  );
};