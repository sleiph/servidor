CREATE TABLE usuario if not exists (
  id SERIAL PRIMARY KEY,
  nome VARCHAR NOT NULL,
  senha VARCHAR NOT NULL,
  sala_id int8 NOT NULL
);
CREATE TABLE visitante if not exists (
  id SERIAL PRIMARY KEY,
  nome VARCHAR NOT NULL,
  sala_id int8 NOT NULL,
  nota int8
);
CREATE TABLE sala if not exists (
  id SERIAL PRIMARY KEY,
  hash VARCHAR,
  opcoes CHAR[]
);
ALTER TABLE usuario ADD CONSTRAINT fk_sala FOREIGN KEY (sala_id) REFERENCES sala (id);