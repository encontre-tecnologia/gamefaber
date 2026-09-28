# Instruções para a IA que vai continuar este projeto

Leia este arquivo inteiro e depois o `README.md` antes de mexer em qualquer coisa.
Na primeira resposta, **resuma o que você entendeu** (arquitetura, onde ficam os dados, como testar e publicar) e espere o próximo pedido.

---

## 1. Seu papel

Você constrói e mantém uma **réplica 3D navegável de um campus industrial**, que roda no navegador, no computador e no celular.
O cliente não é técnico. Ele manda **prints do mapa com rabiscos** (setas, círculos, X, linhas vermelhas) e **fotos de referência**, e pede **um ajuste por vez**, em português informal.
Você responde em **português simples**: o que mudou, onde, e o que ainda não foi testado.

## 2. Tecnologia

- **three.js r146** via CDN (jsDelivr), JavaScript puro, sem etapa de build.
- `nova-fabrica.html`: a maquete inteira num único arquivo (prédios, ruas, cercas, interiores, passeio, visita, dia e noite, controles).
- `gerente.js`: modo gerente (simulação de gestão). Conversa com a maquete **só** pela ponte `window.NF` (e pelos ganchos `window.NFPAUSE` e `NF.onBuildingClick`).
- **Publicação:** Cloudflare Workers, rodando `npx wrangler deploy` na pasta do projeto. O `.assetsignore` define o que não vai para o site.
- **Repositório:** https://github.com/encontre-tecnologia/gamefaber (branch `main`).

## 3. A base de tudo: coordenadas da foto de satélite

Cada objeto é marcado **em pixels** de uma imagem de satélite de 1448 × 1086:

```js
const K = .25;                       // 1 px = 0,25 m
const wx = px => (px - 724) * K;     // X do mundo
const wz = py => (py - 543) * K;     // Z do mundo
```

**Como ler um print do cliente:** a câmera do print pode estar girada ou em perspectiva. Faça assim:

1. Ache no print dois ou três objetos conhecidos (prédios da lista `B`, ruas de `ROADS`, a Catraca, as etiquetas de nome).
2. Calcule escala e rotação a partir deles.
3. Converta o rabisco para pixels da foto de satélite.

Se ficar em dúvida sobre a orientação, confira pelas etiquetas dos prédios.

## 4. Onde ficam os dados

| Lista | O que guarda |
|---|---|
| `B` | Prédios: `[x1, y1, x2, y2, altura, telhado, direção, nome]` |
| `PROD` | Prédios com interior: `{ n, b:[x1,y1,x2,y2], t:tipo, i:texto, s:[etiquetas], o:1 se for setor de apoio }` |
| `ROADS` | Ruas (polilinhas em pixels, 12 px de largura) |
| `PERIMS` | Cercas (lista de polilinhas; para cerca nova, crie uma polilinha nova e acrescente aqui) |
| `LANE`, `PARK` | Faixa e polígono do estacionamento |
| `TSTOPS` | Paradas da visita guiada `[nome do prédio, fala da instrutora]` |
| `movers` | Carros, motos, caminhões e pedestres que andam |

**Mudar o layout é mudar números, não modelar.**

## 5. Peças prontas para reutilizar

- **Prédios:**
  - `sawB()`: galpão com telhado dente de serra, com variações "depósito" e "galpão".
  - `admB()`: administrativo, com faixa verde, janelas e ar-condicionado.
  - `cosB()`: cosméticos.
  - `fcRoof()`: telhado reto.
- **Postes:** `utilLine(xPx, [yPx...], alcanceDoBraço, [[índiceDoPoste, xDoPrédio]])` cria postes de concreto com cruzetas, fios, transformador e luminárias.
- **Portões de grade verde:** lista `for(const [gx,gy,rot] of [...])`, logo depois do comentário "portão de grade verde".
- **Texturas:** use `mkTex(largura, altura, (ctx, W, H) => { ... })`, que desenha em canvas. **Não use arquivos de imagem.**
- **Materiais:** `M(cor, {roughness, metalness})`.
- **Interiores:** `buildInterior(P)` monta por tipo (`t`). As animações entram em `PANIM.push(dt => { if(!g.visible) return; ... })`.

## 6. Regras de trabalho

1. **Uma mudança por pedido.** Faça exatamente o que foi marcado, sem "melhorar" o resto por conta própria.
2. **Backup antes de editar:** copie o arquivo para uma pasta temporária (`nova-fabrica.bakN.html`).
3. **Edite com substituição exata de trechos**, conferindo que cada trecho aparece **uma única vez** no arquivo. Um script Python com `assert s.count(a)==1` funciona bem.
4. **Teste no navegador antes de publicar:**
   - Crie uma cópia de teste. Na linha que contém `const C=Ctl?new Ctl`, acrescente `window.__cam=cam;window.__C=C;window.__R=R;window.__S=S;`. Procure a linha pelo texto, porque o número da linha muda.
   - Posicione a câmera no local alterado com `__C.target.set(...)` e `__cam.position.set(...)`, depois `__C.update()` e `__R.render(__S,__cam)`, e tire um print.
   - Veja os erros do console.
   - O navegador de teste pode estar com `requestAnimationFrame` pausado. Para simular o tempo, chame `window.WALKUP(.05)` em laço e `__S.updateMatrixWorld()`.
   - **Apague a cópia de teste** depois.
5. **Publicação:**
   - Compare com o site no ar os arquivos que você não mexeu (`index.html`, `style.css`, `game.js`, `factory3d.js`, `cores.js`, `visitantes.js`), para não sobrescrever o trabalho de outra pessoa.
   - Rode `npx wrangler deploy`.
   - Faça `git add -A`, `git commit` com mensagem em português descrevendo a mudança, e `git push`.
6. **Seja honesto na resposta:** diga o que conferiu e o que não conferiu. Nunca diga que testou algo que não testou.
7. **Mudou o `gerente.js`?** Aumente a versão em `gerente.js?v=N` no HTML, para o navegador não usar a versão antiga guardada.

## 7. Armadilhas conhecidas (não repita)

- **Luzes:** não adicione nem remova luzes durante o uso. Isso recompila todos os shaders e a página trava. Nos interiores use `ilight()`, que usa um conjunto fixo de luzes. As luzes da noite só ficam visíveis quando escurece.
- **`mergeStatic()`:** depois da montagem, as peças paradas são juntadas em blocos. Qualquer objeto que **se mexe ou some** precisa estar em `movers`, ter `userData.dyn=1` ou estar invisível no início, senão ele "congela".
- **Câmera NaN:** na visita guiada a direção do grupo pode não existir no primeiro meio segundo. Mantenha as verificações `isFinite`.
- **Mezanino:** dentro dos prédios a câmera usa `camHit()` para não ficar em cima do piso de cima. Não remova.
- **Painéis:** o painel do gerente atualiza só os cartões que mudaram (`patchBody`). Não volte para `innerHTML` a cada atualização, senão a rolagem pula.
- **Zoom da página:** está bloqueado (Ctrl + roda, pinça e Ctrl +/−) para não brigar com o zoom do mapa. Ctrl + 0 continua funcionando.
- **Celular:** teste também em 375 × 812. Os controles precisam funcionar com os dedos, e a GPU do celular derruba o WebGL se passar da memória. Por isso os interiores são desmontados ao sair.
- **Árvores:** `tree()` não planta em cima das cercas (`PERIMS`). Se uma cerca nova passar por uma área com árvores, elas somem sozinhas.
- **Marca e planta do cliente** são sensíveis. Confirme com o cliente antes de publicar em lugar público.

## 8. Fluxo de cada pedido

1. Leia o print e identifique o lugar pelos nomes e prédios conhecidos.
2. Converta o rabisco para pixels da foto de satélite.
3. Ache no código o bloco certo pelo comentário em português (todos os blocos têm um).
4. Faça o backup e a edição.
5. Teste com print de cima e de perto.
6. Publique, faça commit e push.
7. Responda: o que fez, onde, o que conferiu e o link.

## 9. Para fazer a mesma coisa em outra empresa

Siga a seção 8 do `README.md`:

1. Satélite e escala.
2. Prédios em caixas.
3. Ruas e cercas.
4. Estilos.
5. Interiores.
6. Textos e visita.
7. Modo gerente (edite `ST`, `PRODUCTS`, `RES`, `STAFF` e `EVENTS` em `gerente.js`).
8. Teste no celular.
9. Publique com acesso restrito.
