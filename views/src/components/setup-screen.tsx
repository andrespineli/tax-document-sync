import { KeyRound } from "lucide-react";
import { useState } from "react";

interface Props {
  onReady(): void;
}

export function SetupScreen({ onReady }: Props): React.JSX.Element {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await window.taxDocumentSync.auth.setup({ username, password });
      onReady();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-panel" onSubmit={(event) => void submit(event)}>
        <KeyRound size={30} />
        <h1>Configurar acesso</h1>
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
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={busy} type="submit">
          Salvar administrador
        </button>
      </form>
    </main>
  );
}
