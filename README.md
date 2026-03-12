# Apostar Widget

Sistema de injecao de JS/SCSS para personalizacao do site Apostar.

O `widget.js` e carregado via **GTM** (Google Tag Manager) no site. Ele funciona como um micro-framework que detecta a pagina, busca a configuracao e carrega modulos sob demanda.

**Deploy**: Vercel (auto-deploy on push to `main`)
**URL de producao**: `https://apostar-theme.vercel.app/widget.js`

---

## Regras Criticas

### Build & Formato

- **ES Module com code-splitting** — O Vite gera `widget.js` como entry point e chunks separados em `modules/`. O widget deve ser carregado com `<script type="module">`.
- **Target es2017** — Nao usar features de ES2020+ no codigo. O Vite transpila para `es2017` para compatibilidade com iOS/Safari antigos.
- **`import.meta.url`** — Usado em `config.ts` para detectar a base URL do widget automaticamente. Funciona porque o build e ES module.
- **GTM deve usar `type="module"`** — O snippet GTM deve criar o script com `s.type = 'module'` para que o widget funcione corretamente.

### CSS / SCSS

- **Nunca usar `gap` em flexbox** — iOS antigo nao suporta. Usar `margin` em elementos adjacentes:

```scss
// ERRADO
.container { display: flex; gap: 8px; }

// CORRETO
.container { display: flex; }
.container > * + * { margin-left: 8px; }
```

- **Nunca usar `.module.scss`** — O CSS Modules do Vite faz hash nos nomes de classe, quebrando o codigo JS que cria elementos com classes literais. Usar `.scss` simples com import `?inline`.
- **Prefixo obrigatorio** — Seletores usam `.apw-` (`$prefix` em SCSS) para modulos padrao. Modulos com identidade visual propria (ex: cashback) podem usar seus proprios IDs/classes, mas devem ser unicos.
- **Variaveis e Mixins** — Sempre usar `_variables.scss` para cores/breakpoints e `_mixins.scss` para responsividade.
- **Mobile first** — Breakpoints via `@include respond-to(md)`.
- **Text nodes precisam de wrapper** — `margin` nao se aplica a text nodes soltos. Sempre envolver texto em `<span>` dentro de containers flex:

```html
<!-- ERRADO: margin nao funciona -->
Voce tem <span class="value">R$10</span> de Cashback!

<!-- CORRETO -->
<span>Voce tem</span> <span class="value">R$10</span> <span>de Cashback!</span>
```

### JavaScript / TypeScript

- **Strict mode** ativo
- Nao usar `any` (warn no lint)
- Parametros nao usados com prefixo `_` (ex: `_target`)
- Exportar classes de modulo como `export default`
- Usar `this.data<T>(key, fallback)` para acessar dados do config

### Fontes (em codigo injetado)

- **Nunca usar `@import url(...)` dentro de `style.textContent`** — Alguns browsers ignoram `@import` quando o `<style>` e criado via JS. Usar `<link>` element:

```javascript
// ERRADO
style.textContent = '@import url("https://fonts.googleapis.com/..."); ...';

// CORRETO
var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/...';
document.head.appendChild(link);
```

---

## Arquitetura

### Duas Versoes do Widget

1. **Vercel (producao)** — Build gerado pelo Vite em `dist/`. Deploy automatico via push para `main`. Carregado via GTM no site com `type="module"`.
2. **Chrome Override (debug)** — Loader em `cdn.mnply.com.br/apostar/widget.js` que carrega a versao Vercel. Usado para testes locais via Chrome Local Overrides.

### Estrutura de Pastas

```
src/
├── widget.ts              # Entry point — registra modulos e inicia bootstrap
├── core/                  # Infraestrutura (NAO editar sem necessidade)
│   ├── bootstrap.ts       # Orquestrador: config → lazy load → render
│   ├── config.ts          # Fetch config com cache (localStorage + TTL)
│   ├── module-registry.ts # Registry de modulos disponiveis
│   ├── event-bus.ts       # Pub/sub entre modulos
│   └── logger.ts          # Logger condicional (debug mode)
├── modules/
│   ├── base-module.ts     # Classe abstrata — todo modulo estende ela
│   └── <nome>/            # Cada modulo em sua propria pasta
│       ├── index.ts
│       └── <nome>.scss
├── styles/
│   ├── _variables.scss    # Design tokens (cores, breakpoints, spacing)
│   ├── _mixins.scss       # Mixins responsivos, botoes, cards
│   ├── _animations.scss   # Keyframes reutilizaveis
│   └── global.scss        # Reset scoped para [data-apw-module]
├── types/
│   ├── config.ts          # Tipos do config JSON
│   └── modules.ts         # Interface WidgetModule
└── utils/
    ├── dom.ts             # Helpers DOM (qs, createElement, injectStyles)
    ├── lazy-loader.ts     # Dynamic import com cache
    └── storage.ts         # LocalStorage com TTL

config/                    # JSONs de configuracao (copiados para dist/)
├── global.json
└── pages/
    ├── home.json
    ├── casino.json
    └── default.json

cdn.mnply.com.br/apostar/  # Loader para Chrome Override (gitignored)
└── widget.js
```

### Deteccao de Base URL

O widget detecta automaticamente de onde foi carregado usando `import.meta.url`. Isso permite que os fetch de config (`global.json`, `pages/*.json`) funcionem tanto em localhost quanto na Vercel.

---

## Como Criar um Modulo

1. Criar pasta `src/modules/<nome>/`
2. Criar `index.ts` estendendo `BaseModule`:

```typescript
import { BaseModule } from '../base-module'
import styles from './<nome>.scss?inline'

export default class NomeModule extends BaseModule {
  name = '<nome>'

  protected getStyles() { return styles }

  protected template(): string {
    const titulo = this.data<string>('titulo', '')
    return `<div class="apw-<nome>">${titulo}</div>`
  }
}
```

3. Criar `<nome>.scss` (sem `.module.` no nome):

```scss
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.#{$prefix}-<nome> {
  // estilos aqui
}
```

4. Registrar em `src/widget.ts`:

```typescript
moduleRegistry.register('<nome>', () => import('./modules/<nome>/index'))
```

5. Adicionar no config JSON da pagina:

```json
{
  "type": "<nome>",
  "target": "#seletor-no-site",
  "position": "after",
  "data": { "titulo": "Exemplo" }
}
```

6. Build e push: `npm run build && git add . && git commit && git push`

### Modulos Self-Managed

Modulos que controlam seu proprio DOM (buscam targets, criam elementos, etc.) devem definir `selfManaged = true`. O bootstrap pula a logica de target/wrapper para eles.

```typescript
export default class MeuModulo extends BaseModule {
  name = 'meu-modulo'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    // Toda logica de posicionamento aqui
  }

  render(): void { /* no-op */ }
}
```

---

## Config JSON

Cada pagina pode ter um JSON em `config/pages/<pagina>.json`:

```json
{
  "page": "home",
  "modules": [
    {
      "type": "nome-do-modulo",
      "target": "#seletor-css",
      "position": "before | after | replace | prepend | append",
      "trigger": { "event": "time | scroll | exit-intent | click", "delay": 3000 },
      "data": { "chave": "valor" }
    }
  ]
}
```

Config global em `config/global.json`:

```json
{
  "cdnBase": "https://apostar-theme.vercel.app",
  "debug": true,
  "cacheTTL": 300,
  "featureFlags": {}
}
```

---

## Scripts

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Dev server com HMR (localhost) |
| `npm run build` | Build ES module → `dist/` |
| `npm run preview` | Preview do build local |
| `npm run lint` | ESLint + Prettier check |
| `npm run lint:fix` | Fix automatico |

---

## Ambientes

O projeto usa **duas branches** com deploy automatico na Vercel:

| Ambiente | Branch | URL |
|----------|--------|-----|
| **Producao** | `main` | `https://apostar-theme.vercel.app/widget.js` |
| **Staging** | `staging` | `https://apostar-theme-git-staging-gabrieltelescostas-projects.vercel.app/widget.js` |

### Workflow

1. Desenvolver e testar na branch `staging`
2. Push para `staging` → Vercel faz deploy automatico na URL de staging
3. Testar no site via Chrome Override (com `?apw=staging` na URL) ou apontando o GTM para a URL de staging
4. Quando aprovado, abrir PR de `staging` → `main` no GitHub
5. Fazer merge → Vercel faz deploy automatico em producao

### Comandos Git

```bash
# Trabalhar em staging
git checkout staging

# Desenvolver, commitar e testar
npm run build
git add . && git commit -m "feat: descricao"
git push

# Quando pronto, promover para producao
# Opcao 1: PR no GitHub (recomendado)
# Opcao 2: Merge local
git checkout main
git merge staging
git push
git checkout staging
```

---

## Deploy

### Vercel

- Repositorio conectado ao Vercel
- Push para `main` = deploy em producao
- Push para `staging` = deploy em staging
- Headers CORS configurados via `vercel.json`
- Build output: `dist/widget.js` + `dist/modules/` + `dist/config/`

### GTM (injecao no site)

Tag HTML customizada no GTM para **producao**:

```html
<script>
(function(){
  var s = document.createElement('script');
  s.type = 'module';
  s.crossOrigin = 'anonymous';
  s.src = 'https://apostar-theme.vercel.app/widget.js';
  document.head.appendChild(s);
})();
</script>
```

Para testar staging via GTM, trocar a URL para a de staging manualmente.

**IMPORTANTE**: O `type="module"` e obrigatorio. Sem ele, `import()` e `import.meta.url` nao funcionam.

### Chrome Override (debug local)

1. DevTools → Sources → Overrides → selecionar pasta local
2. O arquivo `cdn.mnply.com.br/apostar/widget.js` e um loader inteligente
3. Por padrao carrega a versao de **producao**
4. Adicionar `?apw=staging` na URL do site para carregar a versao de **staging**

---

## Build Output

O build gera em `dist/`:

```
dist/
├── widget.js              # Entry point (ES module)
├── modules/               # Chunks lazy-loaded (um por modulo)
│   └── cashback-bar.<hash>.js
└── config/                # JSONs copiados de config/
```

---

## API Global

O widget expoe `window.ApostarWidget`:

```javascript
ApostarWidget.destroy()         // Remove todos os modulos
ApostarWidget.events.on(...)    // Event bus
ApostarWidget.events.emit(...)
ApostarWidget.registry.list()   // Lista modulos registrados
```

---

## Fluxo do Widget

1. GTM injeta `<script type="module" src=".../widget.js">`
2. Bootstrap: carrega `global.json` → detecta pagina → carrega `pages/<pagina>.json`
3. Para cada modulo no config: lazy import → init → render no target
4. Modulos `selfManaged` controlam seu proprio ciclo de vida
5. Estilos SCSS sao compilados inline e injetados via `<style>` no head

---

## Checklist — Antes de Todo Commit

- [ ] Funciona no Chrome desktop?
- [ ] Sem `gap` no CSS (usar `margin`)?
- [ ] Text nodes envolvidos em `<span>` dentro de flex containers?
- [ ] Nomes de SCSS sem `.module.` (usar `.scss` direto)?
- [ ] Fontes carregadas via `<link>` (nao `@import` em style tag)?
- [ ] Build passa sem erros (`npm run build`)?

---

## Historico de Problemas Resolvidos

Referencia rapida de bugs ja enfrentados para evitar reincidencia:

- **CSS Modules hash**: Renomear `.module.scss` para `.scss` — Vite hasheia classes em CSS Modules, quebrando classes criadas via JS
- **Flexbox `gap`**: Substituir por `margin > * + *` — iOS antigo nao suporta `gap`
- **`@import` em style tag**: Usar `<link>` element — browsers ignoram `@import` em styles injetadas via JS
- **Text nodes sem margin**: Envolver em `<span>` — `margin` so funciona em elementos, nao text nodes
- **`import.meta.url` e base URL**: Funciona com ES modules. `resolveBaseUrl()` usa isso para auto-detectar de onde o widget foi carregado
- **Infobip conflito**: `resolveBaseUrl()` ja usou `document.querySelector('script[src*=widget]')` que pegava o script errado. Resolvido com `import.meta.url`
