import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DropdownIcon from '@/assets/icons/dropdown-icon.svg';
import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';
import TennisIcon from '@/assets/images/033-TENNIS 1.svg';
import PadelIcon from '@/assets/images/036-PADEL 1.svg';

interface SportDropdownHeaderProps {
  currentSport: 'pickleball' | 'tennis' | 'padel';
  sportName: string;
  sportColor: string;
}

const sportData = [
  { 
    label: 'Pickleball', 
    value: 'pickleball',
    route: '/user-dashboard/pickleball',
    color: '#A04DFE',
    icon: PickleballIcon
  },
  { 
    label: 'Tennis', 
    value: 'tennis',
    route: '/user-dashboard/tennis',
    color: '#008000',
    icon: TennisIcon
  },
  { 
    label: 'Padel', 
    value: 'padel',
    route: '/user-dashboard/padel',
    color: '#4DABFE',
    icon: PadelIcon
  },
];

export const SportDropdownHeader: React.FC<SportDropdownHeaderProps> = ({
  currentSport,
  sportName,
  sportColor
}) => {
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const handleSportChange = (sport: typeof sportData[0]) => {
    setIsHeaderMenuOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(sport.route as any);
  };

  return (
    <View style={styles.headerSection}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
            router.back(); 
          }} 
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity
            style={styles.headerTitleRow}
            activeOpacity={0.7}
            onPress={() => setIsHeaderMenuOpen((v) => !v)}
          >
            <Text style={[styles.headerTitleText, { color: sportColor }]}>
              {sportName}
            </Text>
            <DropdownIcon width={18} height={18} />
          </TouchableOpacity>
          
          {/* Dropdown positioned relative to header */}
          {isHeaderMenuOpen && (
            <View style={styles.dropdownMenu}>
              <View style={styles.dropdownCard}>
                {sportData.map((sport, index) => {
                  const IconComponent = sport.icon;
                  const isSelected = sport.value === currentSport;
                  
                  return (
                    <React.Fragment key={sport.value}>
                      <TouchableOpacity
                        style={styles.dropdownRow}
                        onPress={() => handleSportChange(sport)}
                      >
                        <IconComponent width={24} height={24} />
                        <Text style={[styles.dropdownLabelText, { color: sport.color }]}>
                          {sport.label}
                        </Text>
                        {isSelected && (
                          <Text style={[styles.dropdownCheck, { color: sport.color }]}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                      {index < sportData.length - 1 && <View style={styles.dropdownDivider} />}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginTop: 10, 
  },
  headerTitleContainer: {
    flex: 1,
    position: 'relative',
  },
  backIcon: {
    fontSize: 35,
    fontWeight: '600',
    color: '#111827',
    marginRight: 5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10, 
  },
  headerTitleText: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontStyle: 'italic',
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 20,
    marginRight: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    left: -10,
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
  },
  dropdownCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dropdownLabelText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  dropdownCheck: {
    fontSize: 16,
  },
});