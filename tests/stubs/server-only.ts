// O pacote `server-only` lança ao ser importado fora de um React Server
// Component. Nos testes, os módulos de servidor rodam em Node puro, então
// o vitest.config.ts aponta `server-only` para este stub vazio.
//
// Isso não enfraquece a proteção: quem garante que uma chave de service role
// não vaze para o cliente é o build do Next, que continua resolvendo o pacote
// de verdade.
export {}
