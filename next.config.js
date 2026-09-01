/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse é um pacote ESM/CJS híbrido ("type": "module" + exports map) -
  // o webpack quebra ele ao empacotar no bundle especial de Server Actions
  // ("action-browser"), com "TypeError: Object.defineProperty called on
  // non-object" só de importar (erro real visto ao clicar em "Analisar de
  // novo" em /contratos/[id] - reanalisarContrato nem usa extrairTexto, mas
  // o import dele no topo de contratos/actions.js já derruba o módulo
  // inteiro). Isso aqui tira os dois do bundling do webpack - Next usa
  // require() nativo do Node em vez de tentar transformar.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};

module.exports = nextConfig;
