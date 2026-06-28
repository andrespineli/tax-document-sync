CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  storage_directory TEXT,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE fiscal_entities (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  uf TEXT NOT NULL,
  certificate_content TEXT,
  certificate_password TEXT,
  last_dfe_sequence_number INTEGER NOT NULL DEFAULT 0,
  next_search_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tax_documents (
  id TEXT PRIMARY KEY,
  fiscal_entity_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_document TEXT NOT NULL,
  access_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (fiscal_entity_id) REFERENCES fiscal_entities(id) ON DELETE CASCADE
);
