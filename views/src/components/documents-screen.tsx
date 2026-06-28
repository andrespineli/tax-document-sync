import { ExternalLink, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { FiscalEntityRecord, TaxDocumentRecord } from "../lib/types";

interface Props {
  documents: TaxDocumentRecord[];
  entities: FiscalEntityRecord[];
  onChanged(): void;
}

export function DocumentsScreen({ documents, entities, onChanged }: Props): React.JSX.Element {
  const [status, setStatus] = useState("");
  const [fiscalEntityId, setFiscalEntityId] = useState("");

  const filtered = useMemo(() => documents.filter((document) => {
    return (!status || document.status === status) &&
      (!fiscalEntityId || document.fiscalEntityId === fiscalEntityId);
  }), [documents, fiscalEntityId, status]);

  async function open(filePath: string | null): Promise<void> {
    if (!filePath) {
      return;
    }
    await window.taxDocumentSync.taxDocuments.open(filePath);
  }

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <h1>Documentos</h1>
          <p>{filtered.length} de {documents.length}</p>
        </div>
        <button onClick={onChanged}>
          <RefreshCw size={17} /> Atualizar
        </button>
      </div>

      <div className="filters">
        <label>
          Empresa
          <select value={fiscalEntityId} onChange={(event) => setFiscalEntityId(event.target.value)}>
            <option value="">Todas</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.legalName}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="MANIFESTED">Manifestado</option>
            <option value="DOWNLOADED">Baixado</option>
            <option value="LOADED">Salvo</option>
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chave</th>
              <th>Empresa</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Atualizado</th>
              <th>XML</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((document) => (
              <tr key={document.id}>
                <td className="mono">{document.key}</td>
                <td>{document.companyName}</td>
                <td>{document.type}</td>
                <td><span className="status-pill">{document.status}</span></td>
                <td>{new Date(document.updatedAt).toLocaleString()}</td>
                <td>
                  <button
                    className="icon-only"
                    disabled={!document.filePath}
                    title="Abrir XML"
                    onClick={() => void open(document.filePath)}
                  >
                    <ExternalLink size={17} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">Nenhum documento encontrado</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
