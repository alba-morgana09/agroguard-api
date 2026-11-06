# 🌾 AgroGuard — Protótipo de Monitoramento de Cargas

> Dashboard frontend visual para apresentar o monitoramento de cargas sensíveis. O projeto é construído com React, TypeScript e Vite. Pode consultar a API do AgroGuard ou funcionar em modo demonstração com dados simulados.

## 📸 Demo                                                                                                                                  

![Painel do AgroGuard em modo demonstração](./agroguard-preview.gif)

👉 **[Acessar a demo no GitHub Pages](https://alba-morgana09.github.io/agroguard-api/)**

## 🎯 Sobre o projeto

O dashboard representa uma central de acompanhamento de uma carga farmacêutica termossensível. A interface exibe informações como temperatura, umidade, status do lacre, desvio de rota e eventos de auditoria.

Quando a API está disponível, cargas, telemetria, logs, integridade da cadeia e ações de lacre são obtidos/enviados pelo backend. Sem uma URL configurada em produção, o dashboard não faz requisições de rede e usa o modo demonstração.

## 💻 Tecnologias

- React
- TypeScript
- Vite
- React DOM
- CSS e estilos inline
- GitHub Pages para publicação da demo

## 🚀 Como executar

Requisitos: Node.js e npm.

```bash
npm ci
npm run dev
```

No desenvolvimento, se `VITE_API_URL` não estiver definida, o dashboard usa
`http://localhost:8080`. Para configurar explicitamente, copie `.env.example`
para `.env.local` e ajuste:

```bash
VITE_API_URL=http://localhost:8080
```

O dashboard consulta `GET /cargas`, `GET /cargas/{id}/telemetria`,
`GET /cargas/{id}/logs` e `GET /cargas/{id}/logs/verificar`. O botão de lacre
envia `POST /cargas/{id}/lacre`. Cada chamada tem timeout de 5 segundos; em
caso de erro, a interface mantém os dados simulados.

Para gerar o build de produção:

```bash
npm run build
```

Para visualizar localmente o build gerado:

```bash
npm run preview
```

## 📁 Estrutura principal

```text
.
├── public/                 # Arquivos públicos e ícones
├── src/
│   ├── assets/             # Imagens e SVGs
│   ├── App.tsx             # Componente raiz
│   ├── DashboardIntegridade.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx            # Inicialização do React
├── .github/workflows/
│   └── deploy.yml          # Build e publicação no GitHub Pages
├── index.html
├── package.json
└── vite.config.ts
```

Em produção (por exemplo, no GitHub Pages), `VITE_API_URL` deve ser fornecida
no momento do build para conectar a uma API. Se não estiver definida, nenhuma
requisição de rede é feita e a tela entra diretamente no modo demonstração.

## ✅ Implementado

- Dashboard visual de monitoramento de cargas.
- Integração opcional com a API `alba-morgana09/agroguard`.
- Fallback automático para dados simulados após erro ou timeout de 5 segundos.
- Exibição do estado da conexão e da integridade da cadeia de logs.
- Relógio atualizado no frontend.
- Simulação de abertura e bloqueio do lacre.
- Micrográficos SVG para os indicadores exibidos.
- Build e publicação no GitHub Pages.

## ✍️ Autoria

Desenvolvido por **Alba Morgana dos Santos Benicio**.

- [Perfil no GitHub](https://github.com/alba-morgana09)
- [LinkedIn](https://www.linkedin.com/in/albamorgana/)
