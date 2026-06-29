import { Bell, FolderOpen, Moon, RefreshCw, Save, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppSettingsRecord, SyncStatus, UpdateStatus } from "../lib/types";

interface Props {
  settings: AppSettingsRecord;
  syncStatus: SyncStatus | null;
  onChanged(): void;
}

export function SettingsScreen({ settings, syncStatus, onChanged }: Props): React.JSX.Element {
  const [storageDirectory, setStorageDirectory] = useState(settings.storageDirectory ?? "");
  const [logDirectory, setLogDirectory] = useState(settings.logDirectory ?? "");
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(settings.syncIntervalMinutes);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [theme, setTheme] = useState(settings.theme);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStorageDirectory(settings.storageDirectory ?? "");
    setLogDirectory(settings.logDirectory ?? "");
    setSyncIntervalMinutes(settings.syncIntervalMinutes);
    setNotificationsEnabled(settings.notificationsEnabled);
    setTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    void loadUpdateStatus();
    return window.taxDocumentSync.updates.onStatus(setUpdateStatus);
  }, []);

  async function loadUpdateStatus(): Promise<void> {
    setUpdateStatus(await window.taxDocumentSync.updates.status());
  }

  async function checkForUpdates(): Promise<void> {
    setUpdateStatus(await window.taxDocumentSync.updates.check());
  }

  async function installUpdate(): Promise<void> {
    setUpdateStatus(await window.taxDocumentSync.updates.install());
  }

  function updateLabel(): string {
    if (!updateStatus) {
      return "Carregando atualização";
    }

    const labels: Record<UpdateStatus["state"], string> = {
      disabled: "Atualizações disponíveis apenas no app empacotado",
      idle: "Pronto para verificar atualizações",
      checking: "Verificando atualizações",
      available: "Nova versão encontrada",
      "not-available": "Nenhuma atualização disponível",
      downloading: `Baixando atualização${updateStatus.progress === null ? "" : ` (${updateStatus.progress}%)`}`,
      downloaded: "Atualização pronta para instalar",
      error: updateStatus.error ?? "Falha ao verificar atualizações",
    };
    return labels[updateStatus.state];
  }

  function normalizedStorageDirectory(): string | null {
    const value = storageDirectory.trim();
    return value.length > 0 ? value : null;
  }

  function normalizedLogDirectory(): string | null {
    const value = logDirectory.trim();
    return value.length > 0 ? value : null;
  }

  async function chooseStorageDirectory(): Promise<void> {
    const selected = await window.taxDocumentSync.settings.chooseDirectory();
    if (selected) {
      setStorageDirectory(selected);
    }
  }

  async function chooseLogDirectory(): Promise<void> {
    const selected = await window.taxDocumentSync.settings.chooseDirectory();
    if (selected) {
      setLogDirectory(selected);
    }
  }

  async function toggleTheme(): Promise<void> {
    const previousTheme = theme;
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setError(null);

    try {
      await window.taxDocumentSync.settings.save({
        storageDirectory: normalizedStorageDirectory(),
        logDirectory: normalizedLogDirectory(),
        syncIntervalMinutes,
        notificationsEnabled,
        theme: nextTheme,
      });
      onChanged();
    } catch (error) {
      setTheme(previousTheme);
      document.documentElement.dataset.theme = previousTheme;
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    try {
      await window.taxDocumentSync.settings.save({
        storageDirectory: normalizedStorageDirectory(),
        logDirectory: normalizedLogDirectory(),
        syncIntervalMinutes,
        notificationsEnabled,
        theme,
      });
      onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <h1>Configurações</h1>
          <p>{syncStatus?.nextRunAt ? `Próxima busca ${new Date(syncStatus.nextRunAt).toLocaleString()}` : "Sem próxima busca agendada"}</p>
        </div>
      </div>

      <form className="form-grid compact" onSubmit={(event) => void save(event)}>
        <label className="span-2">
          Diretório dos XMLs
          <div className="input-action">
            <input value={storageDirectory} onChange={(event) => setStorageDirectory(event.target.value)} />
            <button type="button" onClick={() => void chooseStorageDirectory()}>
              <FolderOpen size={17} /> Escolher
            </button>
          </div>
        </label>
        <label className="span-2">
          Diretório dos logs
          <div className="input-action">
            <input value={logDirectory} onChange={(event) => setLogDirectory(event.target.value)} />
            <button type="button" onClick={() => void chooseLogDirectory()}>
              <FolderOpen size={17} /> Escolher
            </button>
          </div>
        </label>
        <label>
          Intervalo em minutos
          <input
            min={1}
            type="number"
            value={syncIntervalMinutes}
            onChange={(event) => setSyncIntervalMinutes(Number(event.target.value))}
          />
        </label>
        <label className="checkbox-row span-2">
          <input
            checked={notificationsEnabled}
            type="checkbox"
            onChange={(event) => setNotificationsEnabled(event.target.checked)}
          />
          <span>
            <strong><Bell size={16} /> Notificações</strong>
            <small>Avisar quando novos documentos fiscais forem encontrados</small>
          </span>
        </label>
        <div className="form-actions">
          <button type="button" onClick={() => void toggleTheme()}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <button className="primary" type="submit">
            <Save size={17} /> Salvar
          </button>
        </div>
        {error ? <p className="error span-all">{error}</p> : null}
      </form>

      <div className="metrics">
        <div><span>Entidades</span><strong>{syncStatus?.lastSummary?.searchedEntities ?? 0}</strong></div>
        <div><span>Manifestados</span><strong>{syncStatus?.lastSummary?.manifestedDocuments ?? 0}</strong></div>
        <div><span>Baixados</span><strong>{syncStatus?.lastSummary?.downloadedDocuments ?? 0}</strong></div>
        <div><span>Salvos</span><strong>{syncStatus?.lastSummary?.loadedDocuments ?? 0}</strong></div>
      </div>

      <div className="update-panel">
        <div>
          <span>Versão atual</span>
          <strong>{updateStatus?.currentVersion ?? "-"}</strong>
          <p>{updateLabel()}</p>
        </div>
        <div className="form-actions">
          <button
            type="button"
            disabled={updateStatus?.state === "checking" || updateStatus?.state === "downloading"}
            onClick={() => void checkForUpdates()}
          >
            <RefreshCw size={17} /> Verificar atualizações
          </button>
          {updateStatus?.state === "downloaded" ? (
            <button className="primary" type="button" onClick={() => void installUpdate()}>
              Reiniciar e instalar
            </button>
          ) : null}
        </div>
      </div>

      {syncStatus?.lastError ? <div className="banner error">{syncStatus.lastError}</div> : null}
      {syncStatus?.lastSummary?.errors.length ? (
        <div className="banner warning">
          {syncStatus.lastSummary.errors.join(" | ")}
        </div>
      ) : null}
    </section>
  );
}
