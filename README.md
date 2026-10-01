# Gym — Diário de Treino

App pessoal para registrar treinos de academia. É um **PWA**: roda no navegador do celular, pode ser instalado na tela inicial e funciona **offline**. Não tem servidor nem login — os dados ficam salvos no próprio aparelho.

## O que ele faz

- **Rotinas** (Treino A/B/C já vêm de exemplo) com séries, repetições-alvo e tempo de descanso por exercício. Dá pra criar, editar, reordenar e duplicar.
- **Próximo treino sugerido**: segue a ordem das rotinas (A → B → C → A…).
- **Treino em andamento**
  - Mostra o que você fez **da última vez** em cada série e já sugere carga/reps (é só tocar no ✓).
  - **Timer de descanso** automático ao concluir uma série, com som e vibração (±15s / pular).
  - Dica de **sobrecarga progressiva** quando você bateu todas as reps da última vez.
  - Tela fica ligada durante o treino; o treino não se perde se fechar o app.
- **Recordes pessoais** 🏆 detectados ao finalizar (carga máxima e 1RM estimado).
- **Histórico** com calendário das últimas 4 semanas, volume, duração e anotações. Qualquer treino pode virar rotina.
- **Progresso** por exercício: gráfico de 1RM estimado, carga máxima, volume ou reps; e registro de **peso corporal**.
- **Backup**: exportar/importar os dados em JSON (Ajustes).

## Rodar localmente

Qualquer servidor estático serve:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Usar no celular

Publique a pasta em qualquer hospedagem estática com HTTPS. O jeito mais simples é o **GitHub Pages**:
Settings → Pages → *Deploy from a branch* → escolha a branch e a pasta `/ (root)`.
(Repositórios privados precisam de um plano pago do GitHub para usar Pages; Netlify ou Vercel são alternativas gratuitas.)

Depois, no celular:
- **Android (Chrome)**: menu ⋮ → “Instalar app”.
- **iPhone (Safari)**: Compartilhar → “Adicionar à Tela de Início”.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página, navegação e timer |
| `styles.css` | Visual (tema escuro, mobile-first) |
| `app.js` | Toda a lógica: dados, telas, timer, gráficos |
| `sw.js` | Service worker (cache offline) |
| `manifest.webmanifest`, `icons/` | Instalação como app |

Sem dependências nem etapa de build. Os dados ficam no `localStorage` sob a chave `gym:v1`.
