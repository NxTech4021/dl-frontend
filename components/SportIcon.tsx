// components/SportIcon.tsx
// Global sport icon component — renders the correct SVG asset for a given sport.
// Accepts a `size` prop (or separate `width`/`height`) to control dimensions.

import PaddleIcon from '@/assets/icons/sports/Paddle.svg';
import PickleballIcon from '@/assets/icons/sports/Pickleball.svg';
import TennisIcon from '@/assets/icons/sports/Tennis.svg';
import React from 'react';

export type SportIconType = 'pickleball' | 'tennis' | 'padel';

interface SportIconProps {
  sport: SportIconType | string;
  size?: number;
  width?: number;
  height?: number;
}

const SportIcon: React.FC<SportIconProps> = ({ sport, size = 48, width, height }) => {
  const w = width ?? size;
  const h = height ?? size;

  const normalized = (sport ?? '').toLowerCase();

  if (normalized.includes('tennis')) {
    return <TennisIcon width={w} height={h} />;
  }
  if (normalized.includes('padel')) {
    return <PaddleIcon width={w} height={h} />;
  }
  // default: pickleball
  return <PickleballIcon width={w} height={h} />;
};

export default SportIcon;
