export type SportType = 'PICKLEBALL' | 'TENNIS' | 'PADEL';

export interface SportColors {
  background: string;
  badgeColor: string;
  header: string;
  label: string;
  buttonColor: string;
  icon: string;
  messageColor: string;
}

export const SPORT_COLORS: Record<SportType, SportColors> = {
  PICKLEBALL: {
    background: '#A04DFE',
    badgeColor: '#A855F7',
    header:'#A04DFE',
    label: 'PICKLEBALL',
    buttonColor: '#602E98',
    icon: 'disc',
    messageColor: '#DCC6FD',
  },
  TENNIS: {
    background: '#65B741',
    badgeColor: '#22C55E',
    header:'#A2E047',
    label: 'TENNIS',
    buttonColor: '#587A27',
    icon: 'tennisball',
    messageColor: '#D4F0B4',
  },
  PADEL: {
    background: '#3B82F6',
    badgeColor: '#60A5FA',
    header:'#4DABFE',
    label: 'PADEL',
    buttonColor: '#2E6698',
    icon: 'tennisball',
    messageColor: '#B9DEFD',
  },
};

export const getSportColors = (
  sportType: SportType | null | undefined
): SportColors => {
  if (!sportType) {
    return SPORT_COLORS.PICKLEBALL;
  }
  return SPORT_COLORS[sportType] || SPORT_COLORS.PICKLEBALL;
};
