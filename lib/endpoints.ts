import { getBackendBaseURL } from "@/src/config/network";
import axios, { AxiosError } from "axios";
import { authClient } from "./auth-client";

const axiosInstance = axios.create({
  baseURL: getBackendBaseURL(),
  withCredentials: false,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    // console.log("\n📡 [Axios] ========== NEW REQUEST ==========");
    // console.log(`   Method: ${config.method?.toUpperCase()}`);
    // console.log(`   URL: ${config.url}`);
    // console.log(`   Base URL: ${config.baseURL}`);
    // console.log(`   Full URL: ${config.baseURL}${config.url}`);

    try {
      // Use authClient.getCookie() as per better-auth Expo docs
      // This returns the session cookie that better-auth expects
      // IMPORTANT: Only use getCookie() here - NOT getSession()!
      // getSession() validates with backend and can invalidate the session on errors,
      // causing the logout loop bug where any backend hiccup logs out the user.
      const cookies = authClient.getCookie();

      if (cookies) {
        // Send as Cookie header - this is what better-auth expects for Expo apps
        // Strip leading "; " that Expo client may prepend (breaks cookie parsing)
        config.headers['Cookie'] = cookies.replace(/^;\s*/, '');

        // Extract user ID from session cookie if needed for backwards compatibility
        // The backend verifyAuth middleware will validate the session and extract user info
        // We don't need to send x-user-id separately - the cookie is sufficient
      }

      if (!cookies && __DEV__) {
        console.warn("⚠️ No session cookie found - request will be unauthenticated");
      }
    } catch (err) {
      if (__DEV__) {
        console.error("❌ Failed to get session cookie:", err);
      }
    }

    if (__DEV__) {
      console.log("📤 Final headers:", JSON.stringify(config.headers, null, 2));
    }
    return config;
  },
  (err) => {
    console.error("❌ [Axios] Request error:", err);
    return Promise.reject(err);
  }
);

axiosInstance.interceptors.response.use(
  (res) => {
    return res;
  },
  (error: AxiosError) => {
    console.error("\n❌ [Axios] ========== RESPONSE ERROR ==========");
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   URL: ${error.config?.url}`);
      console.error(`   Data:`, error.response.data);
    } else if (error.request) {
      console.error(`   No response received`);
      console.error(`   Request URL: ${error.config?.baseURL}${error.config?.url}`);
      console.error(`   Request was made but no response`);
    } else {
      console.error(`   Error setting up request: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;


export const fetcher = async (args: unknown) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosInstance.get(url, { ...config });
  return res.data;
};

export const endpoints = {
  auth: {
    verifyResetOtp: "/api/auth-custom/verify-reset-otp",
    checkEmail: "/api/auth-custom/check-email",
    checkUsername: "/api/auth-custom/check-username",
  },

  user: {
    trackLogin: "/api/player/track-login",
  },

  admin: {
    getInvite: "/api/admin/get-invite",
    getSession: "/api/admin/session",
    getAdmins: "/api/admin/getadmins",
    getProfile: (id: string) => `/api/admin/profile/${id}`,
    updateAccount: "/api/admin/account/update",
    createSuperadmin: "/api/admin/superadmin",
    updatepassword: "/api/admin/updatepassword",
    sendInvite: "/api/admin/invite",
  },

  player: {
    getAll: "/api/player/",
    getStats: "/api/player/stats",
    getById: (id: string) => `/api/player/${id}`,

    // Player history endpoints
    getLeagueHistory: (id: string) => `/api/player/${id}/leagues`,
    getSeasonHistory: (id: string) => `/api/player/${id}/seasons`,
    getDivisionHistory: (id: string) => `/api/player/${id}/divisions`,
    getMatchHistoryAdmin: (id: string) => `/api/player/${id}/matches`,

    // authenticated player profile
    getProfile: "/api/player/profile/me",
    updateProfile: "/api/player/profile/me",
    changePassword: "/api/player/profile/password",
    getMatchHistory: "/api/player/profile/matches",
    getAchievements: "/api/player/profile/achievements",
    getMatchDetails: (matchId: string) => `/api/player/matches/${matchId}`,
  },

  league: {
    getAll: "/api/league/",
    getById: (id: string) => `/api/league/${id}`,
    create: "/api/league/create",
    update: (id: string) => `/api/league/${id}`,
    delete: (id: string) => `/api/league/${id}`,
    addPlayer: "/api/league/add-player",
    removePlayer: "/api/league/remove-player",
  },

  season: {
    create: "/api/season/",
    getAll: "/api/season/",
    getById: (id: string) => `/api/season/${id}`,
    update: (id: string) => `/api/season/${id}`,
    updateStatus: (id: string) => `/api/season/${id}/status`,
    delete: (id: string) => `/api/season/${id}`,
  },

  sponsors: {
    create: "/api/sponsor/create",
    getAll: "/api/sponsor/",
    getById: (id: string) => `/api/sponsor/${id}`,
    update: (id: string) => `/api/sponsor/${id}`,
    delete: (id: string) => `/api/sponsor/${id}`,
  },

  categories: {
    create: "/api/category/create",
    getAll: "/api/category/",
    getById: (id: string) => `/api/category/${id}`,
    update: (id: string) => `/api/category/${id}`,
    delete: (id: string) => `/api/category/${id}`,
    getByLeague: (leagueId: string) => `/api/category/league/${leagueId}`,
  },

  division: {
    create: "/api/division/create",
    getAll: "/api/division/",
    getById: (id: string) => `/api/division/${id}`,
    update: (id: string) => `/api/division/${id}`,
    delete: (id: string) => `/api/division/delete/${id}`,
    getbySeasionId : (seasonId: string)    =>  `/api/division/season/${seasonId}`,
   
    //Player Assign to Division 
    assignPlayer: "/api/division/assign",
    removePlayer: (divisionId: string, userId: string) => `/api/division/${divisionId}/users/${userId}`,
    getDivisionAssignments: (divisionId: string) => `/api/division/divisions/${divisionId}`,
    getUserDivisionAssignments: (userId: string) => `/api/division/users/${userId}`,
    autoAssign: "/api/division/auto-assign",
    transferPlayer: "/api/division/transfer",
  },

  match: {
    // Match CRUD
    create: "/api/match/create",
    getAll: "/api/match",
    getMy: "/api/match/my",
    getAvailable: (divisionId: string) => `/api/match/available/${divisionId}`,
    getById: (id: string) => `/api/match/${id}`,
    getDetails: (id: string) => `/api/match/${id}/details`, // Full match details for UI display
    update: (id: string) => `/api/match/${id}`,
    delete: (id: string) => `/api/match/delete/${id}`,
    
    // Join match
    join: (id: string) => `/api/match/${id}/join`,
    
    // Time slots
    proposeTimeSlot: (id: string) => `/api/match/${id}/timeslots`,
    voteForTimeSlot: (id: string) => `/api/match/timeslots/${id}/vote`,
    confirmTimeSlot: (id: string) => `/api/match/timeslots/${id}/confirm`,
    
    // Invitations
    getPendingInvitations: "/api/match/invitations/pending",
    getInvitationById: (id: string) => `/api/match/invitations/${id}`,
    respondToInvitation: (id: string) => `/api/match/invitations/${id}/respond`,
    
    // Results
    getResult: (id: string) => `/api/match/${id}/result`,
    submitResult: (id: string) => `/api/match/${id}/result`,
    confirmResult: (id: string) => `/api/match/${id}/confirm`,
    submitWalkover: (id: string) => `/api/match/${id}/walkover`,
    getDivisionResults: (divisionId: string) => `/api/match/division/${divisionId}/results`,
    
    // Cancel/Reschedule
    cancel: (id: string) => `/api/match/${id}/cancel`,
    requestReschedule: (id: string) => `/api/match/${id}/reschedule`,
    
    // History and Statistics
    getHistory: "/api/match/history",
    getStats: "/api/match/stats",
    getUpcoming: "/api/match/upcoming",
    getRecent: "/api/match/recent",
    getHeadToHead: (opponentId: string) => `/api/match/head-to-head/${opponentId}`,

    // Comments
    getComments: (id: string) => `/api/match/${id}/comments`,
    createComment: (id: string) => `/api/match/${id}/comment`,
    updateComment: (id: string, commentId: string) => `/api/match/${id}/comment/${commentId}`,
    deleteComment: (id: string, commentId: string) => `/api/match/${id}/comment/${commentId}`,
  },

  friendly: {
    getAll: "/api/friendly",
    getById: (id: string) => `/api/friendly/${id}`,
    getDetails: (id: string) => `/api/friendly/${id}/details`, // Full match details for UI display
    create: "/api/friendly/create",
    join: (id: string) => `/api/friendly/${id}/join`,
    submitResult: (id: string) => `/api/friendly/${id}/result`,
    confirmResult: (id: string) => `/api/friendly/${id}/confirm`,
    accept: (id: string) => `/api/friendly/${id}/accept`,
    decline: (id: string) => `/api/friendly/${id}/decline`,
    cancel: (id: string) => `/api/friendly/${id}/cancel`,

    // Comments
    getComments: (id: string) => `/api/friendly/${id}/comments`,
    createComment: (id: string) => `/api/friendly/${id}/comment`,
    updateComment: (id: string, commentId: string) => `/api/friendly/${id}/comment/${commentId}`,
    deleteComment: (id: string, commentId: string) => `/api/friendly/${id}/comment/${commentId}`,
  },

  notifications: {
    getAll: "/api/notifications/",
    unreadCount: "/api/notifications/unread-count",
    markRead: (id: string) => `/api/notifications/${id}/read`,
    markAllRead: "/api/notifications/mark-all-read",
    delete: (id: string) => `/api/notifications/${id}`,
    stats: "/api/notifications/stats",
    byCategory: (category: string) => `/api/notifications/category/${category}`,
    testNotification: "/api/notifications/test",
    cleanup: "/api/notifications/cleanup",
    // Push token management
    registerPushToken: "/api/notifications/push-token",
    unregisterPushToken: "/api/notifications/push-token",
    getPushTokens: "/api/notifications/push-tokens",
  },

  chat: {
    createThread: "/api/chat/threads/",
    getThreads: (userId: string) => `/api/chat/threads/${userId}`,
    getThread: (threadId: string) => `/api/chat/thread/${threadId}`,
    getThreadMembers: (threadId: string) => `/api/chat/threads/${threadId}/members`,
    sendMessage: (threadId: string) => `/api/chat/threads/${threadId}/messages`,
    getMessages: (threadId: string) => `/api/chat/threads/${threadId}/messages`,
    getAvailableUsers: (userId: string) => `/api/chat/threads/users/available/${userId}`,
    deleteMessage: (messageId: string) => `/api/chat/threads/messages/${messageId}`,
    
    // Unread count endpoints
    getUnreadCount: (threadId: string) => `/api/chat/threads/${threadId}/unread-count`,
    getTotalUnreadCount: (userId: string) => `/api/chat/user/${userId}/total-unread`,
    markThreadAsRead: (threadId: string) => `/api/chat/${threadId}/mark-read`,

    // Add contacts endpoints
    getContacts: (userId: string) => `/api/users/${userId}/contacts`,
    getAllUsers: "/api/users",
  },

  standings: {
    getDivisionStandings: (divisionId: string) => `/api/standings/division/${divisionId}`,
    getMyStanding: "/api/standings/me",
    getPlayerStanding: (userId: string, divisionId: string) => `/api/standings/${userId}/division/${divisionId}`,
  },

  bug: {
    // Initialize DL Mobile app (auto-creates if not exists, returns appId)
    initApp: "/api/bug/init/dlm",
    // Get modules for a specific app
    getModules: (appId: string) => `/api/bug/apps/${appId}/modules`,
    // Create bug report/feedback (uses optionalAuth - works without login)
    createReport: "/api/bug/reports",
    // Get current user's bug reports
    getMyReports: "/api/bug/reports/my",
    // Get specific bug report
    getReport: (id: string) => `/api/bug/reports/${id}`,
    // Add comment to bug report
    addComment: (id: string) => `/api/bug/reports/${id}/comments`,
    // Upload screenshot file (multipart form)
    uploadScreenshot: "/api/bug/screenshots/upload",
    // Sync bug report to Google Sheets
    syncReport: (id: string) => `/api/bug/reports/${id}/sync`,
  },
};
