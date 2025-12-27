import type { GameData, UserData } from '../types';

// Mock ELO data for the last 6 months with full match details
export const mockEloData: GameData[] = [
  {
    date: 'Mar 1, 2024', time: '10:00 AM', rating: 1350, ratingBefore: 1325, opponent: 'John D.', result: 'W',
    score: '6-4, 6-3', ratingChange: +25, league: 'Sepang Club League',
    player1: 'Ken', player2: 'John D.',
    scores: { set1: { player1: 6, player2: 4 }, set2: { player1: 6, player2: 3 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 6, opponentGames: 4, userWonSet: true },
      { setNumber: 2, userGames: 6, opponentGames: 3, userWonSet: true }
    ],
    status: 'completed'
  },
  {
    date: 'Mar 15, 2024', time: '2:30 PM', rating: 1375, ratingBefore: 1345, opponent: 'Sarah M.', result: 'W',
    score: '7-5, 6-4', ratingChange: +30, league: 'KL Open Tournament',
    player1: 'Ken', player2: 'Sarah M.',
    scores: { set1: { player1: 7, player2: 5 }, set2: { player1: 6, player2: 4 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 7, opponentGames: 5, userWonSet: true },
      { setNumber: 2, userGames: 6, opponentGames: 4, userWonSet: true }
    ],
    status: 'completed'
  },
  {
    date: 'Apr 2, 2024', time: '4:00 PM', rating: 1405, ratingBefore: 1425, opponent: 'Mike R.', result: 'L',
    score: '4-6, 5-7', ratingChange: -20, league: 'Petaling Jaya Singles League',
    player1: 'Ken', player2: 'Mike R.',
    scores: { set1: { player1: 4, player2: 6 }, set2: { player1: 5, player2: 7 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 4, opponentGames: 6, userWonSet: false },
      { setNumber: 2, userGames: 5, opponentGames: 7, userWonSet: false }
    ],
    status: 'completed'
  },
  {
    date: 'Apr 20, 2024', time: '9:00 AM', rating: 1385, ratingBefore: 1350, opponent: 'Emma L.', result: 'W',
    score: '6-3, 6-2', ratingChange: +35, league: 'Selangor Championship',
    player1: 'Ken', player2: 'Emma L.',
    scores: { set1: { player1: 6, player2: 3 }, set2: { player1: 6, player2: 2 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 6, opponentGames: 3, userWonSet: true },
      { setNumber: 2, userGames: 6, opponentGames: 2, userWonSet: true }
    ],
    status: 'completed'
  },
  {
    date: 'May 5, 2024', time: '11:00 AM', rating: 1420, ratingBefore: 1405, opponent: 'David K.', result: 'W',
    score: '6-4, 7-6', ratingChange: +15, league: 'Club Tournament',
    player1: 'Ken', player2: 'David K.',
    scores: { set1: { player1: 6, player2: 4 }, set2: { player1: 7, player2: 6 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 6, opponentGames: 4, userWonSet: true },
      { setNumber: 2, userGames: 7, opponentGames: 6, userWonSet: true, hasTiebreak: true, userTiebreak: 7, opponentTiebreak: 4 }
    ],
    status: 'completed'
  },
  {
    date: 'May 18, 2024', time: '3:00 PM', rating: 1435, ratingBefore: 1460, opponent: 'Lisa P.', result: 'L',
    score: '3-6, 4-6', ratingChange: -25, league: 'Weekend League',
    player1: 'Ken', player2: 'Lisa P.',
    scores: { set1: { player1: 3, player2: 6 }, set2: { player1: 4, player2: 6 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 3, opponentGames: 6, userWonSet: false },
      { setNumber: 2, userGames: 4, opponentGames: 6, userWonSet: false }
    ],
    status: 'completed'
  },
  {
    date: 'Jun 1, 2024', time: '10:30 AM', rating: 1410, ratingBefore: 1380, opponent: 'Tom H.', result: 'W',
    score: '6-2, 6-4', ratingChange: +30, league: 'Sepang Club League',
    player1: 'Ken', player2: 'Tom H.',
    scores: { set1: { player1: 6, player2: 2 }, set2: { player1: 6, player2: 4 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 6, opponentGames: 2, userWonSet: true },
      { setNumber: 2, userGames: 6, opponentGames: 4, userWonSet: true }
    ],
    status: 'completed'
  },
  {
    date: 'Jun 15, 2024', time: '5:00 PM', rating: 1440, ratingBefore: 1420, opponent: 'Amy S.', result: 'W',
    score: '7-5, 6-3', ratingChange: +20, league: 'KL Open Tournament',
    player1: 'Ken', player2: 'Amy S.',
    scores: { set1: { player1: 7, player2: 5 }, set2: { player1: 6, player2: 3 }, set3: { player1: null, player2: null } },
    setDetails: [
      { setNumber: 1, userGames: 7, opponentGames: 5, userWonSet: true },
      { setNumber: 2, userGames: 6, opponentGames: 3, userWonSet: true }
    ],
    status: 'completed'
  },
];

export const userData: UserData = {
  name: 'Kenneth Riadi Nugroho',
  username: 'kennethriadi',
  bio: 'Tennis enthusiast who loves playing competitive matches.',
  location: 'Sepang, Malaysia',
  gender: 'Male',
  skillLevel: 'Intermediate',
  sports: ['Tennis', 'Pickleball', 'Padel'],
  activeSports: ['Tennis', 'Pickleball', 'Padel'],
  achievements: [
    { id: '1', title: 'Club Champion', icon: 'trophy-outline', year: '2023' },
    { id: '2', title: 'Tournament Winner', icon: 'medal-outline', year: '2024' },
    { id: '3', title: 'Most Improved', icon: 'trending-up-outline' },
  ],
  leagueStats: null,
};

export const gameTypeOptions = ['Singles', 'Doubles'];