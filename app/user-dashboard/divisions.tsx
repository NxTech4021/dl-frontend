import React from 'react';

import DivisionScreen from '@/src/features/dashboard-user/screens/DivisionScreen';

export default function DivisionsRoute() {
  // DivisionScreen uses useLocalSearchParams internally
  return <DivisionScreen />;
}