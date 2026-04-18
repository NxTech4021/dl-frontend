import PlayersListScreen from "@/src/features/dashboard-user/screens/PlayersListScreen";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function PlayersListRoute() {
  const params = useLocalSearchParams();

  return (
    <PlayersListScreen
      contextType={params.contextType as "league" | "season"}
      contextId={params.contextId as string}
      contextName={params.contextName as string}
      sport={params.sport as "pickleball" | "tennis" | "padel"}
      totalPlayers={Number(params.totalPlayers) || 0}
    />
  );
}
