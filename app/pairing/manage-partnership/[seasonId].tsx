import { useLocalSearchParams } from 'expo-router';
import ManagePartnershipScreen from '@/features/pairing/screens/ManagePartnershipScreen';

export default function ManagePartnershipPage() {
  const { seasonId } = useLocalSearchParams();

  return <ManagePartnershipScreen seasonId={seasonId as string} />;
}
