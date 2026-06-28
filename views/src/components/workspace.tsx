import {
  Building2,
  FileText,
  LogOut,
  RefreshCw,
  Settings,
  Square,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  AppSettingsRecord,
  FiscalEntityRecord,
  SyncStatus,
  TaxDocumentRecord,
} from "../lib/types";
import { DocumentsScreen } from "./documents-screen";
import { FiscalEntitiesScreen } from "./fiscal-entities-screen";
import { SettingsScreen } from "./settings-screen";

type Tab = "entities" | "documents" | "settings";
const APP_DISPLAY_NAME = "Sincronizador de Documentos Fiscais";

interface Props {
  username: string;
  onLogout(): void;
}

export function Workspace({ username, onLogout }: Props): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("entities");
  const [entities, setEntities] = useState<FiscalEntityRecord[]>([]);
  const [documents, setDocuments] = useState<TaxDocumentRecord[]>([]);
  const [settings, setSettings] = useState<AppSettingsRecord | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload(): Promise<void> {
    setError(null);
    try {
      const [entities, documents, settings, status] = await Promise.all([
        window.taxDocumentSync.fiscalEntities.list() as Promise<FiscalEntityRecord[]>,
        window.taxDocumentSync.taxDocuments.list() as Promise<TaxDocumentRecord[]>,
        window.taxDocumentSync.settings.get() as Promise<AppSettingsRecord>,
        window.taxDocumentSync.sync.status() as Promise<SyncStatus>,
      ]);
      setEntities(entities);
      setDocuments(documents);
      setSettings(settings);
      setSyncStatus(status);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    void reload();
    return window.taxDocumentSync.sync.onStatus((status) => {
      setSyncStatus(status);
      void reload();
    });
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }

    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  async function logout(): Promise<void> {
    await window.taxDocumentSync.auth.logout();
    onLogout();
  }

  async function runSync(): Promise<void> {
    setSyncStatus(await window.taxDocumentSync.sync.runNow());
    await reload();
  }

  async function toggleSync(): Promise<void> {
    if (syncStatus?.running) {
      setSyncStatus(await window.taxDocumentSync.sync.stop());
    } else {
      setSyncStatus(await window.taxDocumentSync.sync.start());
    }
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <FileText size={26} />
          <span>{APP_DISPLAY_NAME}</span>
        </div>
        <nav>
          <button className={tab === "entities" ? "active" : ""} onClick={() => setTab("entities")}>
            <Building2 size={18} /> Empresas
          </button>
          <button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>
            <FileText size={18} /> Documentos
          </button>
          <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
            <Settings size={18} /> Configurações
          </button>
        </nav>
        <button className="ghost sidebar-logout" onClick={() => void logout()}>
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <strong>{username}</strong>
            <span>{syncStatus?.inProgress ? "Sincronizando" : syncStatus?.running ? "Loop ativo" : "Loop parado"}</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-text" onClick={() => void runSync()} disabled={syncStatus?.inProgress}>
              <RefreshCw size={18} /> Sincronizar
            </button>
            <button className="icon-text" onClick={() => void toggleSync()}>
              <Square size={18} /> {syncStatus?.running ? "Parar" : "Iniciar"}
            </button>
          </div>
        </header>

        {error ? <div className="banner error">{error}</div> : null}

        {tab === "entities" ? (
          <FiscalEntitiesScreen entities={entities} onChanged={() => void reload()} />
        ) : null}
        {tab === "documents" ? (
          <DocumentsScreen documents={documents} entities={entities} onChanged={() => void reload()} />
        ) : null}
        {tab === "settings" && settings ? (
          <SettingsScreen settings={settings} syncStatus={syncStatus} onChanged={() => void reload()} />
        ) : null}
      </section>
    </main>
  );
}
