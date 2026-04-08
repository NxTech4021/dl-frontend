import React from 'react';

import DivisionScreen from '@/src/features/dashboard-user/screens/DivisionScreen';

// TODO(divisions): This screen uses dummy data. Real division info is on the standings screen (app/standings.tsx).
// Replace with actual API data from GET /api/division/season/{seasonId} if this screen is activated.

export default function DivisionsRoute() {
  // DivisionScreen uses useLocalSearchParams internally
  return <DivisionScreen />;
}