import React from 'react';
import {
  LegalModal,
  LegalSectionTitle,
  LegalSubTitle,
  LegalText,
  LegalBulletList,
} from './LegalModal';

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <LegalModal visible={visible} onClose={onClose} title="Terms of Service">
      <LegalSectionTitle isFirst>Last Updated: January 15, 2025</LegalSectionTitle>

      <LegalText>
        Welcome to Deuce League! These Terms of Service ("Terms") govern your access to and use of our platform. By creating an account or using our services, you agree to be bound by these Terms.
      </LegalText>

      <LegalSectionTitle>1. Acceptance of Terms</LegalSectionTitle>
      <LegalText>
        By accessing or using Deuce League, you agree to comply with and be bound by these Terms, our Privacy Policy, and all applicable laws and regulations. If you do not agree with any part of these Terms, you may not use our services.
      </LegalText>

      <LegalSectionTitle>2. Eligibility</LegalSectionTitle>
      <LegalText>
        To use Deuce League, you must:
      </LegalText>
      <LegalBulletList
        items={[
          'Be at least 13 years of age (or the minimum age in your jurisdiction)',
          'Provide accurate and complete registration information',
          'Maintain the security of your account credentials',
          'Comply with all applicable laws in your jurisdiction',
        ]}
      />
      <LegalText>
        Users under 18 should obtain parental or guardian consent before using the platform.
      </LegalText>

      <LegalSectionTitle>3. Account Responsibilities</LegalSectionTitle>
      <LegalSubTitle>Account Security</LegalSubTitle>
      <LegalText>
        You are responsible for:
      </LegalText>
      <LegalBulletList
        items={[
          'Maintaining the confidentiality of your account password',
          'All activities that occur under your account',
          'Notifying us immediately of any unauthorized access',
          'Ensuring your account information is accurate and up-to-date',
        ]}
      />

      <LegalSubTitle>Account Conduct</LegalSubTitle>
      <LegalText>
        You agree not to:
      </LegalText>
      <LegalBulletList
        items={[
          'Create multiple accounts or impersonate others',
          'Share your account with others',
          'Use automated tools or bots to access the platform',
          'Attempt to gain unauthorized access to other accounts',
        ]}
      />

      <LegalSectionTitle>4. User Content & Conduct</LegalSectionTitle>
      <LegalSubTitle>Content Standards</LegalSubTitle>
      <LegalText>
        When using our platform, you agree not to post or share content that:
      </LegalText>
      <LegalBulletList
        items={[
          'Is offensive, abusive, threatening, or harassing',
          'Violates intellectual property rights',
          'Contains false or misleading information',
          'Promotes illegal activities or violence',
          'Contains spam, advertising, or promotional material',
          'Violates the privacy of others',
        ]}
      />

      <LegalSubTitle>Match Results & Statistics</LegalSubTitle>
      <LegalText>
        You agree to:
      </LegalText>
      <LegalBulletList
        items={[
          'Report match results accurately and honestly',
          'Not manipulate rankings or statistics',
          'Resolve disputes with other players respectfully',
          'Accept that all match results are subject to review',
        ]}
      />

      <LegalSectionTitle>5. Intellectual Property</LegalSectionTitle>
      <LegalSubTitle>Our Content</LegalSubTitle>
      <LegalText>
        All content, features, and functionality of Deuce League, including but not limited to text, graphics, logos, icons, images, and software, are owned by Deuce League and are protected by copyright, trademark, and other intellectual property laws.
      </LegalText>

      <LegalSubTitle>Your Content</LegalSubTitle>
      <LegalText>
        By posting content on Deuce League, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display your content in connection with operating and promoting the platform. You retain all ownership rights to your content.
      </LegalText>

      <LegalSectionTitle>6. Fair Play & Sportsmanship</LegalSectionTitle>
      <LegalText>
        Deuce League promotes fair play and good sportsmanship. Users are expected to:
      </LegalText>
      <LegalBulletList
        items={[
          'Treat other players with respect and courtesy',
          'Play matches fairly and honestly',
          'Follow the rules of the sport being played',
          'Accept wins and losses gracefully',
          'Report any unsportsmanlike conduct',
          'Resolve disputes through proper channels',
        ]}
      />

      <LegalSectionTitle>7. Prohibited Activities</LegalSectionTitle>
      <LegalText>
        You may not:
      </LegalText>
      <LegalBulletList
        items={[
          'Use the platform for any illegal purpose',
          'Interfere with or disrupt the platform or servers',
          'Attempt to reverse engineer or hack the platform',
          'Collect information about other users without consent',
          'Use the platform to solicit business or sales',
          'Create fake accounts or manipulate the system',
          'Harass, threaten, or intimidate other users',
        ]}
      />

      <LegalSectionTitle>8. Disclaimers & Limitations</LegalSectionTitle>
      <LegalSubTitle>Service Availability</LegalSubTitle>
      <LegalText>
        Deuce League is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the platform will be uninterrupted, secure, or error-free.
      </LegalText>

      <LegalSubTitle>Physical Activity</LegalSubTitle>
      <LegalText>
        Participation in sports and physical activities carries inherent risks. You acknowledge that:
      </LegalText>
      <LegalBulletList
        items={[
          'Deuce League is not responsible for injuries or accidents',
          'You participate in matches at your own risk',
          'You should consult a healthcare provider before engaging in physical activity',
          'You should use appropriate safety equipment and follow safety guidelines',
        ]}
      />

      <LegalSubTitle>Third-Party Content</LegalSubTitle>
      <LegalText>
        We are not responsible for content posted by other users or links to third-party websites. Your interactions with other users are solely between you and them.
      </LegalText>

      <LegalSectionTitle>9. Limitation of Liability</LegalSectionTitle>
      <LegalText>
        To the maximum extent permitted by law, Deuce League and its affiliates shall not be liable for:
      </LegalText>
      <LegalBulletList
        items={[
          'Any indirect, incidental, special, or consequential damages',
          'Loss of profits, data, or business opportunities',
          'Personal injury or property damage',
          'Actions or omissions of other users',
          'Service interruptions or technical issues',
        ]}
      />

      <LegalSectionTitle>10. Termination</LegalSectionTitle>
      <LegalSubTitle>Your Rights</LegalSubTitle>
      <LegalText>
        You may terminate your account at any time through the app settings. Upon termination, your personal data will be deleted in accordance with our Privacy Policy.
      </LegalText>

      <LegalSubTitle>Our Rights</LegalSubTitle>
      <LegalText>
        We reserve the right to suspend or terminate your account if you:
      </LegalText>
      <LegalBulletList
        items={[
          'Violate these Terms of Service',
          'Engage in fraudulent or illegal activities',
          'Harass or abuse other users',
          'Manipulate match results or rankings',
          'Fail to pay any applicable fees',
        ]}
      />

      <LegalSectionTitle>11. Dispute Resolution</LegalSectionTitle>
      <LegalSubTitle>Informal Resolution</LegalSubTitle>
      <LegalText>
        If you have a dispute with Deuce League, please contact us first at support@deuceleague.com. We will work with you to resolve the issue informally.
      </LegalText>

      <LegalSubTitle>Governing Law</LegalSubTitle>
      <LegalText>
        These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
      </LegalText>

      <LegalSectionTitle>12. Changes to Terms</LegalSectionTitle>
      <LegalText>
        We may modify these Terms at any time. We will notify you of material changes by:
      </LegalText>
      <LegalBulletList
        items={[
          'Posting an updated version in the app',
          'Sending you an email notification',
          'Displaying a prominent notice in the app',
        ]}
      />
      <LegalText>
        Your continued use of Deuce League after changes are posted constitutes your acceptance of the revised Terms.
      </LegalText>

      <LegalSectionTitle>13. Miscellaneous</LegalSectionTitle>
      <LegalSubTitle>Severability</LegalSubTitle>
      <LegalText>
        If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
      </LegalText>

      <LegalSubTitle>Entire Agreement</LegalSubTitle>
      <LegalText>
        These Terms, together with our Privacy Policy, constitute the entire agreement between you and Deuce League regarding the use of our services.
      </LegalText>

      <LegalSubTitle>Waiver</LegalSubTitle>
      <LegalText>
        Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
      </LegalText>

      <LegalSectionTitle>14. Contact Information</LegalSectionTitle>
      <LegalText>
        If you have questions about these Terms of Service, please contact us:
      </LegalText>
      <LegalText>
        Email: legal@deuceleague.com{'\n'}
        Support: support@deuceleague.com{'\n'}
        Response Time: Within 48 hours
      </LegalText>

      <LegalText>
        Thank you for being part of the Deuce League community. We're excited to have you play with us!
      </LegalText>
    </LegalModal>
  );
};