import { LogIn } from "lucide-react";
import { useState } from "react";

interface Props {
  onLogin(username: string): void;
}

export function LoginScreen({ onLogin }: Props): React.JSX.Element {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const session = await window.taxDocumentSync.auth.login({ username, password, remember });
      onLogin(session.username);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-panel" onSubmit={(event) => void submit(event)}>
        <LogIn size={30} />
        <h1>Entrar</h1>
        <label>
          Usuário
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="checkbox-row">
          <input
            checked={remember}
            type="checkbox"
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span>
            <strong>Manter conectado</strong>
            <small>Entrar automaticamente neste computador</small>
          </span>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={busy} type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
