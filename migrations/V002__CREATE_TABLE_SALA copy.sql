CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR NOT NULL,
  sala_id int8,
  nota int8
);
CREATE TABLE sala(
  id SERIAL PRIMARY KEY,
  hash VARCHAR
);
ALTER TABLE usuario ADD CONSTRAINT fk_sala FOREIGN KEY (sala_id) REFERENCES sala (id);