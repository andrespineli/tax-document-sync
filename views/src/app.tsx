import { useEffect, useState } from "react";
import type { AuthState } from "./lib/types";
import { LoginScreen } from "./components/login-screen";
import { SetupScreen } from "./components/setup-screen";
import { Workspace } from "./components/workspace";

export function App(): React.JSX.Element {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  async function loadAuthState(): Promise<void> {
    const state = await window.taxDocumentSync.auth.state();
    setAuthState(state);

    if (state.hasAdmin) {
      const session = await window.taxDocumentSync.auth.resume();
      if (session) {
        setUsername(session.username);
      }
    }
  }

  useEffect(() => {
    void loadAuthState();
  }, []);

  if (!authState) {
    return <main className="loading">Carregando</main>;
  }

  if (!authState.hasAdmin) {
    return <SetupScreen onReady={() => void loadAuthState()} />;
  }

  if (!username) {
    return <LoginScreen onLogin={setUsername} />;
  }

  return <Workspace username={username} onLogout={() => setUsername(null)} />;
}
