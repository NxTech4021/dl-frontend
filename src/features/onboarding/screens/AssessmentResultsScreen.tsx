import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useOnboarding } from '../OnboardingContext';
import { useSession } from '@/lib/auth-client';
import { questionnaireAPI } from '../services/api';
import { Svg, Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BackgroundGradient } from '../components';
import type { SportType } from '../types';
import PickleballCheckIcon from '../../../../assets/icons/pickleball-check.svg';
import PickleballBgIcon from '../../../../assets/icons/pickleball-bg.svg';
import TennisCheckIcon from '../../../../assets/icons/tennis-check.svg';
import TennisBgIcon from '../../../../assets/icons/tennis-bg.svg';
import PadelCheckIcon from '../../../../assets/icons/padel-check.svg';
import PadelBgIcon from '../../../../assets/icons/padel-bg.svg';

// Sport Icons - Using proper icons from SportButton component
const PickleballIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width="64" height="64" viewBox="0 0 65 64" fill="none">
    <Path
      d="M37.132 11.798C37.1307 13.3856 36.5316 14.9145 35.4539 16.0803C34.3763 17.246 32.8991 17.9632 31.3165 18.089C29.7339 18.2148 28.1619 17.74 26.9136 16.7591C25.6653 15.7782 24.8322 14.3631 24.5801 12.7956C24.3281 11.2282 24.6756 9.62328 25.5534 8.30046C26.4313 6.97765 27.7751 6.03395 29.3174 5.65725C30.8596 5.28055 32.4872 5.49848 33.876 6.26765C35.2649 7.03682 36.3131 8.30081 36.812 9.80797V9.80997L36.848 9.91997C37.0347 10.516 37.1294 11.142 37.132 11.798Z"
      fill={color}
    />
    <Path
      d="M39.132 11.798C39.1328 13.6131 38.5396 15.3787 37.4431 16.8252C36.3465 18.2717 34.8068 19.3197 33.0589 19.8093C31.311 20.2988 29.4509 20.2031 27.7625 19.5366C26.0741 18.8701 24.6502 17.6694 23.708 16.118C20.966 19.072 19.56 21.908 19.042 24.548C18.072 29.488 20.322 33.278 22.71 36.002C21.6688 36.0276 20.6508 36.3151 19.75 36.838C17.674 34.198 15.962 30.702 16.83 26.284C17.6649 22.7444 19.5467 19.5385 22.23 17.084C22.6567 16.66 23.102 16.256 23.566 15.872C22.8414 14.5867 22.4734 13.1312 22.5 11.656C21.3933 12.432 20.3633 13.2986 19.41 14.256C16.1613 17.271 13.8933 21.1925 12.9 25.512C11.72 31.52 14.092 36.162 16.71 39.442L7.60001 47.776L7.56801 47.808C6.9818 48.3832 6.54079 49.0897 6.28137 49.869C6.02195 50.6483 5.95156 51.4781 6.07602 52.29C6.28202 53.774 7.03401 55.144 7.95401 56.248L7.97601 56.274L9.40802 57.876L9.46002 57.926C10.628 59.058 12.16 59.936 13.746 60.266C15.344 60.596 17.252 60.4 18.686 58.966L18.734 58.918L26.866 49.558C29.716 51.784 33.386 53.732 37.84 53.732C39.1841 53.7286 40.5217 53.547 41.818 53.192C44.9868 52.2645 47.9035 50.6293 50.348 48.41C51.1987 47.81 52.012 47.164 52.788 46.472C55.3751 44.1878 57.433 41.367 58.8185 38.2061C60.2039 35.0453 60.8836 31.6203 60.81 28.17C60.7489 24.8553 59.9657 21.5938 58.5149 18.6129C57.0642 15.6319 54.9808 13.0032 52.41 10.91C48.3038 7.59224 43.1851 5.78107 37.906 5.77795H37.914C37.47 5.77795 37.028 5.78995 36.588 5.81395C37.368 6.56595 38.334 7.99995 38.782 9.41395C39.13 10.508 39.132 11.522 39.132 11.798ZM47.89 45.254C45.8648 47.143 43.431 48.5392 40.778 49.334C39.824 49.596 38.838 49.732 37.85 49.734C34.57 49.734 31.724 48.24 29.414 46.454C29.924 45.554 30.192 44.552 30.214 43.544C33.332 46.324 37.708 49.036 42.988 47.598C44.556 47.17 46.196 46.418 47.89 45.254ZM21.33 40.63C22.17 39.79 23.544 39.79 24.382 40.63L25.592 41.84C26.432 42.708 26.418 44.096 25.592 44.93L25.548 44.976L17.254 54.522C16.7965 53.3048 16.0863 52.1985 15.17 51.276C14.2686 50.3604 13.1815 49.6484 11.982 49.188L21.3 40.66L21.33 40.63Z"
      fill={color}
    />
  </Svg>
);

const TennisIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width="52" height="52" viewBox="0 0 53 52" fill="none">
    <Path
      d="M0.702515 22.8526C1.40069 17.0866 4.0112 11.721 8.117 7.61294C12.2228 3.50488 17.587 0.891411 23.3525 0.190049C23.489 0.173751 23.6275 0.185783 23.7591 0.225394C23.8908 0.265004 24.0129 0.331341 24.1178 0.420261C24.2226 0.50918 24.308 0.618772 24.3686 0.742189C24.4293 0.865605 24.4638 1.00019 24.47 1.13755C24.5937 4.16775 24.0882 7.1907 22.9855 10.0158C21.8827 12.841 20.2067 15.407 18.0629 17.5522C15.9192 19.6973 13.3542 21.3751 10.5298 22.4797C7.70541 23.5843 4.68279 24.0917 1.65252 23.97C1.51495 23.9641 1.38008 23.9299 1.25637 23.8694C1.13266 23.8089 1.02277 23.7236 0.933581 23.6187C0.844395 23.5138 0.777837 23.3916 0.738076 23.2597C0.698315 23.1279 0.686208 22.9893 0.702515 22.8526ZM51.3375 28.0275C51.0575 28.0275 50.78 28.01 50.5 28.01C47.5387 28.0063 44.6072 28.6014 41.8818 29.7598C39.1564 30.9182 36.6935 32.6158 34.6411 34.7506C32.5888 36.8854 30.9894 39.4133 29.9392 42.1821C28.889 44.951 28.4097 47.9037 28.53 50.8625C28.5363 50.9999 28.5708 51.1345 28.6314 51.2579C28.692 51.3813 28.7774 51.4909 28.8823 51.5798C28.9871 51.6688 29.1092 51.7351 29.2409 51.7747C29.3726 51.8143 29.511 51.8263 29.6475 51.8101C35.4135 51.1086 40.7779 48.4947 44.8837 44.3862C48.9896 40.2776 51.5999 34.9115 52.2975 29.1451C52.3139 29.0075 52.3015 28.8681 52.2611 28.7356C52.2207 28.6031 52.1533 28.4804 52.063 28.3754C51.9728 28.2703 51.8617 28.1852 51.7368 28.1253C51.6119 28.0654 51.4759 28.0321 51.3375 28.0275ZM32.115 31.6151C34.5239 29.1933 37.3891 27.2733 40.5448 25.9662C43.7006 24.6591 47.0843 23.9908 50.5 24H51.2725C51.4159 24.0052 51.5587 23.9794 51.6912 23.9245C51.8238 23.8696 51.9429 23.7868 52.0406 23.6817C52.1383 23.5767 52.2123 23.4518 52.2575 23.3156C52.3027 23.1795 52.318 23.0352 52.3025 22.8925C51.6132 17.1055 48.998 11.7183 44.8772 7.59703C40.7564 3.4758 35.3695 0.859958 29.5825 0.170049C29.4399 0.154534 29.2956 0.16989 29.1594 0.215075C29.0233 0.26026 28.8984 0.334216 28.7934 0.431921C28.6883 0.529626 28.6055 0.648793 28.5506 0.781331C28.4956 0.913868 28.4699 1.05667 28.475 1.20005C28.5887 4.7454 27.9738 8.27637 26.6683 11.5746C25.3628 14.8727 23.3944 17.868 20.885 20.375C18.477 22.7986 15.6122 24.7205 12.4564 26.0293C9.30055 27.3381 5.91646 28.008 2.50002 28H1.72751C1.58414 27.9949 1.44133 28.0207 1.3088 28.0756C1.17626 28.1305 1.05709 28.2133 0.959387 28.3184C0.861682 28.4234 0.787726 28.5483 0.742541 28.6845C0.697356 28.8206 0.682 28.9649 0.697515 29.1075C1.38679 34.8946 4.00204 40.2818 8.12282 44.4031C12.2436 48.5243 17.6305 51.1401 23.4175 51.8301C23.5601 51.8456 23.7044 51.8302 23.8406 51.785C23.9768 51.7398 24.1016 51.6659 24.2067 51.5682C24.3117 51.4705 24.3945 51.3513 24.4495 51.2188C24.5044 51.0862 24.5302 50.9434 24.525 50.8C24.4099 47.253 25.0242 43.7202 26.3297 40.4202C27.6353 37.1202 29.6044 34.1233 32.115 31.6151Z"
      fill={color}
    />
  </Svg>
);

const PadelIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width="60" height="60" viewBox="0 0 59 54" fill="none">
    <Path
      d="M47.1 53.6667L31.5667 38.2L29.7 40.0667C28.6778 41.0889 27.5115 41.8667 26.2013 42.4C24.8911 42.9334 23.5462 43.2 22.1667 43.2C20.7871 43.2 19.4315 42.9334 18.1 42.4C16.7684 41.8667 15.5907 41.0889 14.5667 40.0667L3.29999 28.7334C2.27777 27.7111 1.49999 26.5449 0.966656 25.2347C0.433323 23.9245 0.166656 22.5796 0.166656 21.2C0.166656 19.8205 0.433323 18.4765 0.966656 17.168C1.49999 15.8596 2.27777 14.6925 3.29999 13.6667L10.8333 6.13337C11.8555 5.11115 13.0227 4.33337 14.3347 3.80004C15.6467 3.26671 16.9907 3.00004 18.3667 3.00004C19.7427 3.00004 21.0875 3.26671 22.4013 3.80004C23.7151 4.33337 24.8813 5.11115 25.9 6.13337L37.2333 17.4C38.2555 18.4223 39.0333 19.6 39.5667 20.9334C40.1 22.2667 40.3667 23.6223 40.3667 25C40.3667 26.3778 40.1 27.7227 39.5667 29.0347C39.0333 30.3467 38.2555 31.5129 37.2333 32.5334L35.3667 34.4L50.8333 49.9334L47.1 53.6667ZM22.1667 37.8667C22.8333 37.8667 23.4893 37.7449 24.1347 37.5014C24.78 37.2578 25.3684 36.8685 25.9 36.3334L33.5 28.7334C34.0333 28.2445 34.4227 27.6667 34.668 27C34.9133 26.3334 35.0351 25.6667 35.0333 25C35.0315 24.3334 34.9098 23.6667 34.668 23C34.4262 22.3334 34.0369 21.7334 33.5 21.2L22.1667 9.93337C21.6778 9.40004 21.1 9.00004 20.4333 8.73337C19.7667 8.46671 19.1 8.33337 18.4333 8.33337C17.7667 8.33337 17.1 8.46671 16.4333 8.73337C15.7667 9.00004 15.1667 9.40004 14.6333 9.93337L7.09999 17.4667C6.56666 18 6.17821 18.5894 5.93466 19.2347C5.6911 19.88 5.56843 20.5352 5.56666 21.2C5.56488 21.8649 5.68755 22.5316 5.93466 23.2C6.18177 23.8685 6.57021 24.4685 7.09999 25L18.4333 36.3334C18.9222 36.8667 19.5 37.256 20.1667 37.5014C20.8333 37.7467 21.5 37.8685 22.1667 37.8667ZM11.3 24.6C11.8778 24.6 12.356 24.4116 12.7347 24.0347C13.1133 23.6578 13.3018 23.1796 13.3 22.6C13.2982 22.0205 13.1098 21.5431 12.7347 21.168C12.3595 20.7929 11.8813 20.6036 11.3 20.6C10.7187 20.5965 10.2413 20.7858 9.86799 21.168C9.49466 21.5503 9.30532 22.0276 9.29999 22.6C9.29466 23.1725 9.48399 23.6507 9.86799 24.0347C10.252 24.4187 10.7293 24.6072 11.3 24.6ZM15.5667 20.4C16.1444 20.4 16.6227 20.2116 17.0013 19.8347C17.38 19.4578 17.5684 18.9796 17.5667 18.4C17.5649 17.8205 17.3755 17.3432 16.9987 16.968C16.6218 16.5929 16.1444 16.4036 15.5667 16.4C14.9889 16.3965 14.5115 16.5858 14.1347 16.968C13.7578 17.3503 13.5684 17.8276 13.5667 18.4C13.5649 18.9725 13.7542 19.4507 14.1347 19.8347C14.5151 20.2187 14.9924 20.4072 15.5667 20.4ZM16.0333 29.3334C16.6111 29.3334 17.0893 29.144 17.468 28.7654C17.8467 28.3867 18.0351 27.9094 18.0333 27.3334C18.0315 26.7574 17.8422 26.28 17.4653 25.9014C17.0884 25.5227 16.6111 25.3334 16.0333 25.3334C15.4555 25.3334 14.9782 25.5227 14.6013 25.9014C14.2244 26.28 14.0351 26.7574 14.0333 27.3334C14.0315 27.9094 14.2209 28.3876 14.6013 28.768C14.9818 29.1485 15.4591 29.3369 16.0333 29.3334ZM19.7667 16.1334C20.3444 16.1334 20.8227 15.944 21.2013 15.5654C21.58 15.1867 21.7684 14.7094 21.7667 14.1334C21.7649 13.5574 21.5755 13.08 21.1987 12.7014C20.8218 12.3227 20.3444 12.1334 19.7667 12.1334C19.1889 12.1334 18.7115 12.3227 18.3347 12.7014C17.9578 13.08 17.7684 13.5574 17.7667 14.1334C17.7649 14.7094 17.9542 15.1876 18.3347 15.568C18.7151 15.9485 19.1924 16.1369 19.7667 16.1334ZM20.3 25.1334C20.8778 25.1334 21.3551 24.944 21.732 24.5654C22.1089 24.1867 22.2982 23.7094 22.3 23.1334C22.3018 22.5574 22.1124 22.08 21.732 21.7014C21.3515 21.3227 20.8742 21.1334 20.3 21.1334C19.7258 21.1334 19.2484 21.3227 18.868 21.7014C18.4875 22.08 18.2982 22.5574 18.3 23.1334C18.3018 23.7094 18.4911 24.1876 18.868 24.568C19.2449 24.9485 19.7222 25.1369 20.3 25.1334ZM20.7 34.0667C21.2778 34.0667 21.756 33.8774 22.1347 33.4987C22.5133 33.12 22.7018 32.6427 22.7 32.0667C22.6982 31.4907 22.5098 31.0134 22.1347 30.6347C21.7595 30.256 21.2813 30.0667 20.7 30.0667C20.1187 30.0667 19.6413 30.256 19.268 30.6347C18.8947 31.0134 18.7053 31.4907 18.7 32.0667C18.6947 32.6427 18.884 33.1209 19.268 33.5014C19.652 33.8818 20.1293 34.0703 20.7 34.0667ZM24.5 20.8667C25.0778 20.8667 25.556 20.6774 25.9347 20.2987C26.3133 19.92 26.5018 19.4427 26.5 18.8667C26.4982 18.2907 26.3089 17.8134 25.932 17.4347C25.5551 17.056 25.0778 16.8667 24.5 16.8667C23.9222 16.8667 23.4449 17.056 23.068 17.4347C22.6911 17.8134 22.5018 18.2907 22.5 18.8667C22.4982 19.4427 22.6875 19.9209 23.068 20.3014C23.4484 20.6818 23.9258 20.8703 24.5 20.8667ZM24.9667 29.8C25.5444 29.8 26.0227 29.6107 26.4013 29.232C26.78 28.8534 26.9684 28.376 26.9667 27.8C26.9649 27.224 26.7755 26.7467 26.3987 26.368C26.0218 25.9894 25.5444 25.8 24.9667 25.8C24.3889 25.8 23.9115 25.9894 23.5347 26.368C23.1578 26.7467 22.9684 27.224 22.9667 27.8C22.9649 28.376 23.1542 28.8543 23.5347 29.2347C23.9151 29.6152 24.3924 29.8036 24.9667 29.8ZM29.2333 25.5334C29.8111 25.5334 30.2893 25.3449 30.668 24.968C31.0467 24.5912 31.2351 24.1129 31.2333 23.5334C31.2315 22.9538 31.0422 22.4765 30.6653 22.1014C30.2884 21.7263 29.8111 21.5369 29.2333 21.5334C28.6555 21.5298 28.1782 21.7192 27.8013 22.1014C27.4244 22.4836 27.2351 22.9609 27.2333 23.5334C27.2315 24.1058 27.4209 24.584 27.8013 24.968C28.1818 25.352 28.6591 25.5405 29.2333 25.5334ZM49.5 19C46.9222 19 44.7222 18.0889 42.9 16.2667C41.0778 14.4445 40.1667 12.2445 40.1667 9.66671C40.1667 7.08893 41.0778 4.88893 42.9 3.06671C44.7222 1.24449 46.9222 0.333374 49.5 0.333374C52.0778 0.333374 54.2778 1.24449 56.1 3.06671C57.9222 4.88893 58.8333 7.08893 58.8333 9.66671C58.8333 12.2445 57.9222 14.4445 56.1 16.2667C54.2778 18.0889 52.0778 19 49.5 19ZM49.5 13.6667C50.6111 13.6667 51.556 13.2783 52.3347 12.5014C53.1133 11.7245 53.5018 10.7796 53.5 9.66671C53.4982 8.55382 53.1098 7.60982 52.3347 6.83471C51.5595 6.0596 50.6147 5.67026 49.5 5.66671C48.3853 5.66315 47.4413 6.05249 46.668 6.83471C45.8947 7.61693 45.5053 8.56093 45.5 9.66671C45.4947 10.7725 45.884 11.7174 46.668 12.5014C47.452 13.2854 48.396 13.6738 49.5 13.6667Z"
      fill={color}
    />
  </Svg>
);

// Sport configuration with colors
const SPORT_CONFIG = {
  pickleball: {
    iconColor: '#512546',
  },
  tennis: {
    iconColor: '#374F35',
  },
  padel: {
    iconColor: '#7D3C03',
  },
};

// Success checkmark icon - sport-specific
const CheckmarkIcon = ({ sport }: { sport: string }) => {
  const getCheckIcon = () => {
    switch (sport) {
      case 'pickleball':
        return <PickleballCheckIcon width={32} height={32} />;
      case 'tennis':
        return <TennisCheckIcon width={32} height={32} />;
      case 'padel':
        return <PadelCheckIcon width={32} height={32} />;
      default:
        return <PickleballCheckIcon width={32} height={32} />;
    }
  };

  return getCheckIcon();
};

// Background SVG icon - sport-specific
const BackgroundSvgIcon = ({ sport }: { sport: string }) => {
  const getBgIcon = () => {
    switch (sport) {
      case 'pickleball':
        return <PickleballBgIcon width={231} height={129} />;
      case 'tennis':
        return <TennisBgIcon width={231} height={72} />;
      case 'padel':
        return <PadelBgIcon width={231} height={101} />;
      default:
        return <PickleballBgIcon width={231} height={129} />;
    }
  };

  return getBgIcon();
};

// White arrow icon for continue button
const WhiteArrowIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18L15 12L9 6"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AssessmentResultsScreen = () => {
  const { sport, sportIndex, fromDashboard } = useLocalSearchParams();
  const { data, updateData } = useOnboarding();
  const { data: session } = useSession();
  const currentSportIndex = parseInt(sportIndex as string) || 0;
  const selectedSports = data.selectedSports || [];

  // Extract first name from full name
  const firstName = data.fullName ? data.fullName.split(' ')[0] : 'there';

  // Update onboarding step to ASSESSMENT_RESULTS when viewing results (not from dashboard)
  useEffect(() => {
    const updateStep = async () => {
      if (session?.user?.id && fromDashboard !== 'true') {
        try {
          await questionnaireAPI.updateOnboardingStep(session.user.id, 'ASSESSMENT_RESULTS');
          console.log('Onboarding step updated to ASSESSMENT_RESULTS');
        } catch (error) {
          console.error('Error updating onboarding step:', error);
        }
      }
    };
    updateStep();
  }, [session?.user?.id, fromDashboard]);

  // Get the assessment results for the current sport
  const getAssessmentResults = () => {
    console.log('🔍 Getting assessment results for sport:', sport);
    console.log('🔍 All skill assessments:', data.skillAssessments);
    
    const skillData = data.skillAssessments?.[sport as SportType];
    console.log('🔍 Skill data for current sport:', skillData);
    
    if (skillData && typeof skillData === 'string') {
      try {
        // Parse the JSON string to get the assessment data
        const parsedData = JSON.parse(skillData);
        console.log('🔍 Parsed skill data:', parsedData);
        if (parsedData && typeof parsedData === 'object' && parsedData.rating) {
          return parsedData;
        }
      } catch (error) {
        console.error('Failed to parse skill data:', error);
      }
    }
    console.log('❌ No valid assessment results found');
    return null;
  };

  const results = getAssessmentResults();
  const ratingData = results?.rating;

  const extractSplitRatings = () => {
    if (!ratingData || typeof ratingData !== 'object') return null;
    const ratingObj = ratingData as any;
    if ('singles_rating' in ratingObj && 'doubles_rating' in ratingObj) {
      return {
        singles: ratingObj.singles_rating,
        doubles: ratingObj.doubles_rating,
      };
    }
    if ('singles' in ratingObj && 'doubles' in ratingObj) {
      return {
        singles: ratingObj.singles,
        doubles: ratingObj.doubles,
      };
    }
    return null;
  };

  const splitRatings = extractSplitRatings();
  const shouldShowSplitRatings =
    !!splitRatings && (sport === 'pickleball' || sport === 'tennis');

  const getPrimaryRatingValue = (): number | null => {
    if (!ratingData) return null;
    if (typeof ratingData === 'number') return ratingData;
    if (typeof ratingData === 'object') {
      const ratingObj = ratingData as any;
      if ('singles_rating' in ratingObj) return ratingObj.singles_rating;
      if ('singles' in ratingObj) return ratingObj.singles;
      if ('rating' in ratingObj) return ratingObj.rating;
    }
    return null;
  };

  const primaryRatingValue = getPrimaryRatingValue();
  
  const getSportTitle = () => {
    return typeof sport === 'string' ? sport.charAt(0).toUpperCase() + sport.slice(1) : '';
  };

  const getSportIcon = () => {
    const config = SPORT_CONFIG[sport as keyof typeof SPORT_CONFIG];
    if (!config) return null;
    
    switch (sport) {
      case 'pickleball':
        return <PickleballIcon color={config.iconColor} />;
      case 'tennis':
        return <TennisIcon color={config.iconColor} />;
      case 'padel':
        return <PadelIcon color={config.iconColor} />;
      default:
        return null;
    }
  };

  const getSkillLevelFromRating = (rating: number): string => {
    if (sport === 'pickleball') {
      if (rating < 1200) return 'Beginner';
      if (rating < 1500) return 'Advanced Beginner';
      if (rating < 1800) return 'Lower Intermediate';
      if (rating < 2200) return 'Intermediate';
      if (rating < 2800) return 'Upper Intermediate';
      if (rating < 3500) return 'Advanced';
      if (rating < 4500) return 'Expert';
      return 'Professional';
    } else if (sport === 'tennis') {
      if (rating < 1000) return 'Beginner';
      if (rating < 1300) return 'Advanced Beginner';
      if (rating < 1600) return 'Improver';
      if (rating < 1900) return 'Intermediate';
      if (rating < 2300) return 'Upper Intermediate';
      if (rating < 2800) return 'Advanced';
      if (rating < 3500) return 'Expert';
      return 'Professional';
    } else {
      if (rating < 1000) return 'Beginner';
      if (rating < 1300) return 'Improver';
      if (rating < 1600) return 'Intermediate';
      if (rating < 1900) return 'Upper Intermediate';
      if (rating < 2300) return 'Advanced';
      if (rating < 2800) return 'Expert';
      return 'Professional';
    }
  };

  // Capitalize confidence levels properly
  const formatConfidence = (confidence: string): string => {
    return confidence.toLowerCase().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleContinue = () => {
    // Check if we're coming from the dashboard
    if (fromDashboard === 'true') {
      // Coming from dashboard - return to user dashboard
      router.push('/user-dashboard');
    } else {
      // During onboarding flow - continue to next step
      // Check if there are more sports to assess
      if (currentSportIndex < selectedSports.length - 1) {
        // Navigate to skill assessment for next sport
        const nextSport = selectedSports[currentSportIndex + 1];
        router.push(`/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${currentSportIndex + 1}`);
      } else {
        // All sports assessed, go to profile picture
        router.push('/onboarding/profile-picture');
      }
    }
  };

  if (!results) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No assessment results found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundGradient sport={sport as string} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={[
            styles.logo, 
            sport === 'pickleball' && styles.pickleballLogo,
            sport === 'tennis' && styles.tennisLogo,
            sport === 'padel' && styles.padelLogo
          ]}>
            {sport === 'pickleball' ? 'pickleball' : 
             sport === 'tennis' ? 'tennis' : 
             sport === 'padel' ? 'padel' : 'DEUCE'}
          </Text>
        </View>

        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <CheckmarkIcon sport={sport as string} />
        </View>

        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            <Text style={styles.titleWhite}>You're All Set, </Text>
            <Text style={styles.titleOrange}>{firstName}!</Text>
          </Text>
          <Text style={styles.subtitle}>Here&apos;s your initial rating for {getSportTitle()}.</Text>
        </View>

        {/* Sport Icon */}
        {/* <View style={styles.sportIconContainer}>
          {getSportIcon()}
        </View> */}

        {/* Results Card */}
        <View style={styles.resultsCard}>
          {/* White Top Section */}
          <View style={styles.cardTopSection}>
            {/* Background SVG */}
            <View style={styles.backgroundSvgContainer}>
              <BackgroundSvgIcon sport={sport as string} />
            </View>
            
            {/* Logo */}
            <View style={styles.cardLogoContainer}>
              <Svg width="48" height="48" viewBox="0 0 146.46 154.58" fill="none">
                <Path d="m146.45,76.67c-.04,1.52-.19,3.06-.46,4.6-4.06,23.39-34.72,48.43-102.74,73.18-1.72.62-3.28-.94-2.88-2.72,10.78-48.65,9.38-119.74-.72-148.91-.58-1.65,1.11-3.24,2.79-2.71,62.42,19.74,104.79,46.66,104.01,76.56Z" fill="#44a7de"/>
                <Path d="m45.08,76.67v4.6h1.11v-4.6h-1.11Z" fill="none" stroke="#ed2124" strokeMiterlimit="10"/>
                <Path d="m48.94,17.75c-1.51-.71-3.04-1.41-4.6-2.1C31.91,10.08,17.98,4.89,2.87.11,1.2-.42-.39,1.13.08,2.82c14.06,50.94,15.69,100.47.72,148.91-.54,1.74,1.17,3.34,2.88,2.72,15.43-5.62,28.95-11.25,40.66-16.88,1.57-.74,3.1-1.5,4.6-2.25,36.77-18.4,54.47-36.68,57.49-54.05.27-1.54.42-3.08.46-4.6.57-21.76-21.71-41.94-57.95-58.92Zm0,84.23c-.89.37-1.81.73-2.75,1.1v-21.81h-1.11v-4.6h1.11v-22.5c.94.45,1.85.9,2.75,1.35,13.99,6.99,23.28,14.03,25.46,21.15.47,1.53.62,3.06.4,4.6-.94,6.82-8.85,13.73-25.86,20.71Z" fill="#195e9a"/>
                <Path d="m74.4,76.67c.47,1.53.62,3.06.4,4.6h-29.72v-4.6h29.32Z" fill="#fff"/>
                <Path d="m146.45,76.67c-.04,1.52-.19,3.06-.46,4.6h-39.56c.27-1.54.42-3.08.46-4.6h39.56Z" fill="#fff"/>
                <Path d="m48.94,17.75v117.57c-1.5.75-3.03,1.51-4.6,2.25V15.65c1.56.69,3.09,1.39,4.6,2.1Z" fill="#fff"/>
              </Svg>
            </View>
            
            {/* DMR Title */}
            <Text style={styles.dmrTitle}>
              <Text style={styles.dmrTitleBrand}>DEUCE</Text> Match Rating (DMR)
            </Text>
            {/* Main Rating Display */}
            <View style={styles.ratingContainer}>
              {shouldShowSplitRatings ? (
                <>
                  <View style={styles.ratingSection}>
                    <Text style={styles.ratingLabel}>Singles</Text>
                    <View style={styles.ratingValueContainer}>
                      <Text style={styles.ratingValue}>
                        {splitRatings ? splitRatings.singles : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ratingDivider} />
                  <View style={styles.ratingSection}>
                    <Text style={styles.ratingLabel}>Doubles</Text>
                    <View style={styles.ratingValueContainer}>
                      <Text style={styles.ratingValue}>
                        {splitRatings ? splitRatings.doubles : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingLabel}>Rating</Text>
                  <View style={styles.ratingValueContainer}>
                    <Text style={styles.ratingValue}>
                      {primaryRatingValue ?? 'N/A'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Skill Level */}
            {/* <View style={styles.skillLevelContainer}>
              <Text style={styles.skillLevelLabel}>Level</Text>
              <Text style={styles.skillLevelValue}>
                {getSkillLevelFromRating(primaryRatingValue ?? 0)}
              </Text>
            </View> */}
          </View>

          {/* Bottom Section */}
          <LinearGradient
            colors={sport === 'pickleball' ? ['#BC82FD', '#916DB8'] : 
                   sport === 'tennis' ? ['#B4E56C', '#95AB74'] : 
                   ['#82C3FC', '#6D94B7']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.cardBottomSection,
            ]}
          >
            <Text style={styles.instructionalText}>
              Think of this DMR as your kick-off point that will adjust as you play.
            </Text>
            <Text style={styles.instructionalTextFun}>
              Now hit the court and have fun!
            </Text>
          </LinearGradient>
        </View>

            {/* Confidence (for tennis and padel) */}
            {results.confidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence</Text>
                <Text style={styles.confidenceValue}>{formatConfidence(results.confidence)}</Text>
              </View>
            )}

        {/* Feedback Section */}
        {/* {results.feedback && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Assessment Feedback</Text>
            <Text style={styles.feedbackText}>{results.feedback}</Text>
          </View>
        )} */}

      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={['#FF7903', '#FEA04D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <WhiteArrowIcon />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  cardLogoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  backgroundSvgContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FE9F4D',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  pickleballLogo: {
    color: '#CA9BFF',
    fontSize: 32,
    fontWeight: '500',
    fontFamily: 'Poppins',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  tennisLogo: {
    color: '#D7FFA9',
    fontSize: 32,
    fontWeight: '500',
    fontFamily: 'Poppins',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  padelLogo: {
    color: '#9BD0FF',
    fontSize: 32,
    fontWeight: '500',
    fontFamily: 'Poppins',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  successIconContainer: {
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 37,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 36,
    marginBottom: 8,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  titleWhite: {
    fontSize: 30,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 36,
    fontFamily: 'Inter',
    letterSpacing: 1,
  },
  titleOrange: {
    fontSize: 30,
    fontWeight: '600',
    color: '#FEA04D',
    lineHeight: 36,
    fontFamily: 'Inter',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 20,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginTop: 5,
  },
  sportIconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultsCard: {
    marginHorizontal: 37,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardTopSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cardBottomSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 5,
  },
  dmrTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FEA04D',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 30,
  },
  dmrTitleBrand: {
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#FEA04D',
    fontFamily: 'Inter',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 24,
    width: '100%',
  },
  ratingSection: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
    flexShrink: 1,
  },
  ratingDivider: {
    width: 2,
    height: 80,
    backgroundColor: '#777777',
    marginHorizontal: 8,
    opacity: 0.2,
    flexShrink: 0,
  },
  ratingLabel: {
    fontSize: 22,
    fontWeight: '600',
    color: '#777777',
    marginBottom: 4,
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  ratingValueContainer: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FEA04D',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  skillLevelContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  skillLevelLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C7278',
    marginBottom: 4,
    fontFamily: 'Roboto',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skillLevelValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Inter',
  },
  instructionalText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 12,
  },
  instructionalTextFun: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Inter',
    fontWeight: '500',
    textAlign: 'center',
  },
  confidenceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C7278',
    marginBottom: 4,
    fontFamily: 'Roboto',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'Inter',
  },
  noteContainer: {
    backgroundColor: '#FFF7F0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FE9F4D',
  },
  noteText: {
    fontSize: 14,
    color: '#8B4513',
    fontFamily: 'Roboto',
    fontWeight: '500',
    textAlign: 'center',
  },
  feedbackCard: {
    marginHorizontal: 37,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDF1F3',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  feedbackText: {
    fontSize: 14,
    color: '#6C7278',
    lineHeight: 20,
    fontFamily: 'Roboto',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    right: 40,
  },
  continueButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: '#E4E5E7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  gradientButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 37,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontFamily: 'Roboto',
    textAlign: 'center',
  },
});

export default AssessmentResultsScreen;
