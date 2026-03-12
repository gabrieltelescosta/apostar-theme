# Apostar Widget

Sistema de injeção de JS/SCSS via CDN para personalização do site Apostar.

O `widget.js` é o único script carregado no site. Ele funciona como um micro-framework que detecta a página, busca a configuração e carrega módulos sob demanda.

```html
<script src="https://cdn.mnply.com.br/apostar/widget.js" defer></script>
```

---

## Regras do Projeto

### Estrutura de Pastas

```
src/
├── widget.ts              # Entry point - registra módulos e inicia bootstrap
├── core/                  # Infraestrutura (NÃO editar sem necessidade)
│   ├── bootstrap.ts       # Orquestrador: config → lazy load → render
│   ├── config.ts          # Fetch config com cache (localStorage + TTL)
│   ├── module-registry.ts # Registry de módulos disponíveis
│   ├── event-bus.ts       # Pub/sub entre módulos
│   └── logger.ts          # Logger condicional (debug mode)
├── modules/
│   ├── base-module.ts     # Classe abstrata - todo módulo estende ela
│   └── <nome>/            # Cada módulo em sua própria pasta
│       ├── index.ts
│       └── <nome>.module.scss
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
```

### Como Criar um Módulo

1. Criar pasta `src/modules/<nome>/`
2. Criar `index.ts` estendendo `BaseModule`:

```typescript
import { BaseModule } from '../base-module'
import styles from './<nome>.module.scss?inline'

export default class NomeModule extends BaseModule {
  name = '<nome>'

  protected getStyles() { return styles }

  protected template(): string {
    const titulo = this.data<string>('titulo', '')
    return `<div class="apw-<nome>">${titulo}</div>`
  }
}
```

3. Criar `<nome>.module.scss` com prefixo `apw-`:

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

6. Build: `npm run build`

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

### Config JSON

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
  "cdnBase": "https://cdn.mnply.com.br/apostar",
  "debug": true,
  "cacheTTL": 300,
  "featureFlags": {}
}
```

### SCSS - Regras

- **Prefixo obrigatório**: Todos os estilos usam `.apw-` (`$prefix` em SCSS) para evitar conflito com o CSS do site
- **Variáveis**: Usar `_variables.scss` para cores, breakpoints, spacing
- **Mixins**: Usar `_mixins.scss` para responsividade, botões, cards
- **Mobile first**: Usar `@include respond-to(md)` para breakpoints
- **Isolamento**: Cada módulo tem seu próprio `.module.scss`
- Módulos que têm identidade visual própria (ex: cashback) podem usar cores customizadas, mas ainda devem prefixar seus seletores

### TypeScript - Regras

- **Strict mode** ativo
- Não usar `any` (warn no lint)
- Parâmetros não usados com prefixo `_` (ex: `_target`)
- Exportar classes de módulo como `export default`
- Usar `this.data<T>(key, fallback)` para acessar dados do config

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server com HMR (localhost) |
| `npm run build` | Type check + build → `cdn.mnply.com.br/apostar/` |
| `npm run preview` | Preview do build local |
| `npm run lint` | ESLint + Prettier check |
| `npm run lint:fix` | Fix automático |

---

## Build Output

O build gera em `cdn.mnply.com.br/apostar/`:

```
cdn.mnply.com.br/apostar/
├── widget.js            # Bundle principal
├── modules/             # Chunks lazy-loaded (um por módulo)
│   └── <nome>.<hash>.js
├── config/              # JSONs copiados de config/
└── assets/              # CSS extraído (se houver)
```

A pasta `cdn.mnply.com.br/` está configurada como override local no browser para testes.

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

1. Site carrega `widget.js` (defer)
2. Bootstrap: carrega `global.json` → detecta página → carrega `pages/<pagina>.json`
3. Para cada módulo no config: lazy import → init → render no target
4. Módulos `selfManaged` controlam seu próprio ciclo de vida
5. Estilos SCSS são compilados inline e injetados via `<style>` no head
