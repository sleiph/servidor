CREATE TABLE carta (
  id SERIAL PRIMARY KEY,
  valor int8 NOT NULL,
  naipe VARCHAR(8),
  cima TEXT NOT NULL,
  baixo TEXT NOT NULL
);