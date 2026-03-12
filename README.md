# Apostar Widget

Sistema de injeção de JS/SCSS via CDN para personalização do site Apostar.

O `widget.js` é carregado via **GTM** (Google Tag Manager) no site. Ele funciona como um micro-framework que detecta a página, busca a configuração e carrega módulos.

**Deploy**: Vercel (auto-deploy on push to `main`)
**URL de produção**: `https://apostar-theme.vercel.app/widget.js`

---

## Regras Críticas

### Build & Compatibilidade

- **Formato IIFE** — O build gera um único `widget.js` sem ES modules (`format: 'iife'`). Isso é obrigatório porque o GTM injeta `<script>` sem `type="module"`, e Safari rejeita silenciosamente ES modules nesse contexto.
- **Target es2017** — Não usar features de ES2020+ no código. O Vite transpila para `es2017` para compatibilidade com iOS/Safari antigos.
- **Sem code-splitting** — Tudo é inline em um único arquivo (`inlineDynamicImports: true`). O bundle total é ~19KB, aceitável.
- **Sem `import.meta.url`** — Não funciona em IIFE. Usar `document.currentScript.src` para detectar a URL base (capturado no topo do módulo, antes de qualquer async).

### CSS / SCSS

- **Nunca usar `gap` em flexbox** — iOS antigo não suporta. Usar `margin` em elementos adjacentes:
  ```scss
  // ERRADO
  .container { display: flex; gap: 8px; }
  
  // CORRETO
  .container { display: flex; }
  .container > * + * { margin-left: 8px; }
  ```
- **Nunca usar `.module.scss`** — O CSS Modules do Vite faz hash nos nomes de classe, quebrando o código JS que cria elementos com classes literais. Usar `.scss` simples com import `?inline`.
- **Prefixo obrigatório** — Seletores usam `.apw-` (`$prefix` em SCSS) para módulos padrão. Módulos com identidade visual própria (ex: cashback) podem usar seus próprios IDs/classes, mas devem ser únicos.
- **Variáveis e Mixins** — Sempre usar `_variables.scss` para cores/breakpoints e `_mixins.scss` para responsividade.
- **Mobile first** — Breakpoints via `@include respond-to(md)`.
- **Text nodes precisam de wrapper** — `margin` não se aplica a text nodes soltos. Sempre envolver texto em `<span>` dentro de containers flex:
  ```html
  <!-- ERRADO: margin não funciona -->
  Você tem <span class="value">R$10</span> de Cashback!
  
  <!-- CORRETO -->
  <span>Você tem</span> <span class="value">R$10</span> <span>de Cashback!</span>
  ```

### JavaScript / TypeScript

- **Strict mode** ativo
- Não usar `any` (warn no lint)
- Parâmetros não usados com prefixo `_` (ex: `_target`)
- Exportar classes de módulo como `export default`
- Usar `this.data<T>(key, fallback)` para acessar dados do config
- **Sem `?.` e `??` no IIFE manual** — O arquivo `cdn.mnply.com.br/apostar/widget.js` é escrito à mão e não passa pelo Vite. Usar checks manuais com `&&` e ternário.

### Fontes (em código injetado)

- **Nunca usar `@import url(...)` dentro de `style.textContent`** — Alguns browsers ignoram `@import` quando o `<style>` é criado via JS. Usar `<link>` element:
  ```javascript
  // ERRADO
  style.textContent = '@import url("https://fonts.googleapis.com/..."); ...';
  
  // CORRETO
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/...';
  document.head.appendChild(link);
  ```

---

## Arquitetura

### Duas Versões do Widget

1. **Vercel (produção)** — Build gerado pelo Vite em `dist/`. Deploy automático via push para `main`. Carregado via GTM no site.
2. **Chrome Override (debug)** — IIFE manual em `cdn.mnply.com.br/apostar/widget.js`. Usado para testes locais via Chrome Local Overrides. Não passa pelo Vite, então cuidados extras com compatibilidade (sem `?.`, `??`, `gap`, etc).

Ao fazer mudanças, **sempre atualizar ambas as versões** (SCSS/TS para Vercel + CSS/JS inline para o IIFE).

### Estrutura de Pastas

```
src/
├── widget.ts              # Entry point — registra módulos e inicia bootstrap
├── core/                  # Infraestrutura (NÃO editar sem necessidade)
│   ├── bootstrap.ts       # Orquestrador: config → load → render
│   ├── config.ts          # Fetch config com cache (localStorage + TTL)
│   ├── module-registry.ts # Registry de módulos disponíveis
│   ├── event-bus.ts       # Pub/sub entre módulos
│   └── logger.ts          # Logger condicional (debug mode)
├── modules/
│   ├── base-module.ts     # Classe abstrata — todo módulo estende ela
│   └── <nome>/            # Cada módulo em sua própria pasta
│       ├── index.ts
│       └── <nome>.scss
├── styles/
│   ├── _variables.scss    # Design tokens (cores, breakpoints, spacing)
│   ├── _mixins.scss       # Mixins responsivos, botões, cards
│   ├── _animations.scss   # Keyframes reutilizáveis
│   └── global.scss        # Reset scoped para [data-apw-module]
├── types/
│   ├── config.ts          # Tipos do config JSON
│   └── modules.ts         # Interface WidgetModule
└── utils/
    ├── dom.ts             # Helpers DOM (qs, createElement, injectStyles)
    ├── lazy-loader.ts     # Dynamic import com cache
    └── storage.ts         # LocalStorage com TTL

config/                    # JSONs de configuração (copiados para dist/)
├── global.json
└── pages/
    ├── home.json
    ├── casino.json
    └── default.json

cdn.mnply.com.br/apostar/  # IIFE manual para Chrome Override (gitignored)
└── widget.js
```

### Detecção de Base URL

O widget detecta automaticamente de onde foi carregado usando `document.currentScript.src`. Isso permite que os fetch de config (`global.json`, `pages/*.json`) funcionem tanto em localhost quanto na Vercel.

A referência a `document.currentScript` é capturada no topo do módulo (durante execução síncrona) porque ela se torna `null` após o script terminar de executar.

---

## Como Criar um Módulo

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

3. Criar `<nome>.scss` (sem `.module.` no nome) com prefixo `apw-`:

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

5. Adicionar no config JSON da página:

```json
{
  "type": "<nome>",
  "target": "#seletor-no-site",
  "position": "after",
  "data": { "titulo": "Exemplo" }
}
```

6. Build e push: `npm run build && git add . && git commit && git push`

### Módulos Self-Managed

Módulos que controlam seu próprio DOM (buscam targets, criam elementos, etc.) devem definir `selfManaged = true`. O bootstrap pula a lógica de target/wrapper para eles.

```typescript
export default class MeuModulo extends BaseModule {
  name = 'meu-modulo'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    // Toda lógica de posicionamento aqui
  }

  render(): void { /* no-op */ }
}
```

---

## Config JSON

Cada página pode ter um JSON em `config/pages/<pagina>.json`:

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

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server com HMR (localhost) |
| `npm run build` | Build IIFE → `dist/widget.js` (~19KB) |
| `npm run preview` | Preview do build local |
| `npm run lint` | ESLint + Prettier check |
| `npm run lint:fix` | Fix automático |

---

## Deploy

### Vercel (produção)

- Repositório conectado ao Vercel
- Push para `main` = deploy automático
- URL: `https://apostar-theme.vercel.app/`
- Headers CORS configurados via `vercel.json`

### GTM (injeção no site)

Tag HTML customizada no GTM:

```html
<script>
(function(){
  var s = document.createElement('script');
  s.src = 'https://apostar-theme.vercel.app/widget.js';
  s.async = true;
  document.head.appendChild(s);
})();
</script>
```

### Chrome Override (debug local)

1. DevTools → Sources → Overrides → selecionar pasta local
2. O arquivo `cdn.mnply.com.br/apostar/widget.js` substitui o script do CDN
3. Esse arquivo é um IIFE manual (não gerado pelo Vite)
4. Útil para testar mudanças sem deploy

---

## Build Output

O build gera em `dist/`:

```
dist/
├── widget.js       # Bundle IIFE único (~19KB)
└── config/         # JSONs copiados de config/
```

---

## API Global

O widget expõe `window.ApostarWidget`:

```javascript
ApostarWidget.destroy()         // Remove todos os módulos
ApostarWidget.events.on(...)    // Event bus
ApostarWidget.events.emit(...)
ApostarWidget.registry.list()   // Lista módulos registrados
```

---

## Fluxo do Widget

1. GTM injeta `<script src=".../widget.js">`
2. IIFE executa: captura `document.currentScript.src` para base URL
3. Bootstrap: carrega `global.json` → detecta página → carrega `pages/<pagina>.json`
4. Para cada módulo no config: importa → init → render no target
5. Módulos `selfManaged` controlam seu próprio ciclo de vida
6. Estilos SCSS são compilados inline e injetados via `<style>` no head

---

## Checklist — Antes de Todo Commit

- [ ] Funciona no Safari (iOS 11+)?
- [ ] Funciona no Chrome mobile?
- [ ] Sem `gap` no CSS (usar `margin`)?
- [ ] Sem `?.` / `??` no IIFE manual?
- [ ] Text nodes envolvidos em `<span>` dentro de flex containers?
- [ ] IIFE manual (`cdn.mnply.com.br/apostar/widget.js`) atualizado junto com o TS/SCSS?
- [ ] Build passa sem erros (`npm run build`)?
