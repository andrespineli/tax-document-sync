import { Save, Upload } from "lucide-react";
import { useState } from "react";
import type { FiscalEntityRecord } from "../lib/types";

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

interface Props {
  entities: FiscalEntityRecord[];
  onChanged(): void;
}

export function FiscalEntitiesScreen({ entities, onChanged }: Props): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | undefined>();
  const [legalName, setLegalName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [uf, setUf] = useState("SP");
  const [certificatePath, setCertificatePath] = useState<string | undefined>();
  const [certificatePassword, setCertificatePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickCertificate(): Promise<void> {
    const selected = await window.taxDocumentSync.certificates.pick();
    if (selected) {
      setCertificatePath(selected);
    }
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await window.taxDocumentSync.fiscalEntities.save({
        id: editingId,
        legalName,
        cnpj,
        uf,
        certificatePath,
        certificatePassword: certificatePassword || undefined,
      });
      clear();
      onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function edit(entity: FiscalEntityRecord): void {
    setEditingId(entity.id);
    setLegalName(entity.legalName);
    setCnpj(entity.cnpj);
    setUf(entity.uf);
    setCertificatePath(undefined);
    setCertificatePassword("");
  }

  function clear(): void {
    setEditingId(undefined);
    setLegalName("");
    setCnpj("");
    setUf("SP");
    setCertificatePath(undefined);
    setCertificatePassword("");
  }

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <h1>Empresas</h1>
          <p>{entities.length} cadastrada(s)</p>
        </div>
      </div>

      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label className="span-2">
          Razão social
          <input value={legalName} onChange={(event) => setLegalName(event.target.value)} />
        </label>
        <label>
          CNPJ
          <input value={cnpj} onChange={(event) => setCnpj(event.target.value)} />
        </label>
        <label>
          UF
          <select value={uf} onChange={(event) => setUf(event.target.value)}>
            {UFS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="span-2">
          Certificado A1
          <div className="input-action">
            <input readOnly value={certificatePath ?? ""} placeholder="Selecione um .pfx ou .p12" />
            <button type="button" onClick={() => void pickCertificate()}>
              <Upload size={17} /> Arquivo
            </button>
          </div>
        </label>
        <label>
          Senha do certificado
          <input
            type="password"
            value={certificatePassword}
            onChange={(event) => setCertificatePassword(event.target.value)}
          />
        </label>
        <div className="form-actions">
          <button className="primary" disabled={busy} type="submit">
            <Save size={17} /> Salvar
          </button>
          <button type="button" onClick={clear}>Limpar</button>
        </div>
        {error ? <p className="error span-all">{error}</p> : null}
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Razão social</th>
              <th>CNPJ</th>
              <th>UF</th>
              <th>Certificado</th>
              <th>Último NSU</th>
              <th>Próxima busca</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity) => (
              <tr key={entity.id} onDoubleClick={() => edit(entity)}>
                <td>{entity.legalName}</td>
                <td>{entity.cnpj}</td>
                <td>{entity.uf}</td>
                <td>{entity.hasCertificate ? "Sim" : "Não"}</td>
                <td>{entity.lastDfeSequenceNumber}</td>
                <td>{entity.nextSearchAt ? new Date(entity.nextSearchAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
            {entities.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">Nenhuma empresa cadastrada</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
