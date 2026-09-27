# Fábrica de Lápis · Nova Fábrica 3D

Réplica 3D navegável de um campus industrial, a fábrica de lápis de São Carlos (SP), que roda direto no navegador, no computador e no celular.
Tem dois modos:

- **Visitante:** voa sobre o terreno como no Google Earth, anda com um boneco, faz uma visita guiada com instrutora e entra nos prédios para ver as máquinas funcionando.
- **Gerente:** um jogo de gestão em cima da maquete. Você abre o turno, aceita pedidos, compra matéria-prima, liga as etapas, conserta máquinas e contrata equipe. Um gerente contratado toca a fábrica sozinho, inclusive com a página fechada.

Este documento explica **como o projeto foi feito**, **como replicar para outra empresa** e **como levar a mesma ideia para outras tecnologias de 3D e animação**.

---

## Sumário

1. [O que tem no repositório](#1-o-que-tem-no-repositório)
2. [Como rodar e publicar](#2-como-rodar-e-publicar)
3. [Como a maquete foi construída](#3-como-a-maquete-foi-construída)
4. [Interiores e animações](#4-interiores-e-animações)
5. [Passeio, visita guiada, dia e noite](#5-passeio-visita-guiada-dia-e-noite)
6. [Modo gerente (a simulação)](#6-modo-gerente-a-simulação)
7. [Desempenho: como ficou leve no celular](#7-desempenho-como-ficou-leve-no-celular)
8. [Passo a passo para replicar em outra empresa](#8-passo-a-passo-para-replicar-em-outra-empresa)
9. [Levando para outras tecnologias](#9-levando-para-outras-tecnologias)
10. [Animações: técnicas e equivalentes](#10-animações-técnicas-e-equivalentes)
11. [Lições aprendidas e armadilhas](#11-lições-aprendidas-e-armadilhas)

---

## 1. O que tem no repositório

| Arquivo | O que é |
|---|---|
| `nova-fabrica.html` | **A maquete 3D** (three.js). Terreno, prédios, ruas, cercas, carros, pessoas, interiores, passeio, visita guiada, dia/noite, controles estilo Google Earth. É um arquivo único e autossuficiente. |
| `gerente.js` | **Modo gerente**: regras do jogo, painel, marcadores sobre os prédios, gerente automático e simulação offline. Conversa com a maquete por uma ponte (`window.NF`). |
| `index.html`, `game.js`, `style.css`, `factory3d.js`, `cores.js` | O **primeiro jogo** (Fábrica de Lápis 2D/3D), onde nasceu a lógica de gestão que depois foi levada para a maquete. |
| `visitantes.js` | Visitantes em tempo real no primeiro jogo. |
| `worker/index.js` + `wrangler.jsonc` | **Cloudflare Worker** que serve os arquivos e guarda salas (Durable Objects) do primeiro jogo. |
| `vendor/three.min.js` | Cópia local do three.js para uso offline do primeiro jogo. |
| `LEIA-ME.txt`, `INICIAR-JOGO.bat` | Como jogar e atalho para abrir localmente no Windows. |

Não tem etapa de build: são arquivos HTML e JS puros. O three.js **r146** é carregado do jsDelivr.

---

## 2. Como rodar e publicar

**Local**

```bash
python -m http.server 8765
```

Depois abra `http://localhost:8765/nova-fabrica.html`. Precisa ser por servidor e não por `file://`, por causa das texturas geradas e do `localStorage`.

**Publicar (Cloudflare Workers)**

```bash
npx wrangler deploy
```

O `wrangler.jsonc` publica a pasta inteira como *assets*. O `.assetsignore` tira do ar o que não deve ser público (worker, configs, scripts).

---

## 3. Como a maquete foi construída

### 3.1 A base: uma foto de satélite vira sistema de coordenadas

Tudo parte de uma imagem de satélite do terreno (1448 × 1086 px). Cada prédio, rua e cerca foi marcado **em pixels dessa imagem**, e uma função converte pixel em metro no mundo 3D:

```js
const K = .25, PW = 1448, PH = 1086;          // 1 px da foto = 0,25 m
const wx = px => (px - PW / 2) * K;           // eixo X do mundo
const wz = py => (py - PH / 2) * K;           // eixo Z do mundo
```

**Por que isso é bom:** o cliente manda um print do Google Maps com rabiscos ("coloque a cerca aqui", "a rua vai até ali"), e basta ler as coordenadas do pixel no desenho. Nenhum CAD é necessário.

### 3.2 Os dados moram em listas simples

```js
// [x1, y1, x2, y2, altura, tipo de telhado, direção, nome]
const B = [
  [730,309,895,395, 8,'g','x','CIC Acabamento','fc'],
  [440,447,537,598, 8,'x','z','Almoxarifado'],
  ...
];
const PROD = [   // prédios que têm interior
  { n:'Almoxarifado', b:[440,447,537,598], t:'almox', i:'texto da visita...', s:['etiquetas'] },
  ...
];
```

As ruas são polilinhas (`ROADS`), as cercas são polilinhas (`PERIMS`) e o estacionamento é uma faixa (`LANE`). Mudar o layout é mexer em números, não em modelagem.

### 3.3 Estilos de prédio (funções reutilizáveis)

Em vez de modelar cada prédio, criamos **geradores de estilo** que recebem o retângulo e a altura:

| Função | Estilo |
|---|---|
| `sawB()` | Galpão com **telhado shed (dente de serra)**, faixas verdes, janelas e portões; tem variações "depósito" e "galpão". |
| `admB()` | Prédio administrativo: parede branca, faixa verde, janelas com caixilho, ar-condicionado e porta embutida. |
| `cosB()` | Estilo cosméticos: branco-gelo com letreiro e marquise. |
| `fcRoof()` | Telhado reto com platibanda. |
| blocos próprios | Caldeira (chaminés, tubulação de vapor e fogo), refeitório, anfiteatro, clube, portaria etc. |

As texturas são **desenhadas em canvas no próprio código** (`mkTex(w, h, desenho)`): tijolo, janela, faixa, paralelepípedo, asfalto, logos. Isso deixa tudo leve, sem arquivos de imagem, e fácil de trocar a cor.

### 3.4 Ruas, cercas, carros e pessoas

- **Ruas:** faixas geradas ao longo das polilinhas, com meio-fio, faixas pintadas, rotatória e textura de paralelepípedo.
- **Cercas:** postes e telas ao longo de `PERIMS`, com colisão (`nearLine`) para o boneco não atravessar.
- **Carros, motos, caminhões e pedestres (`movers`):** cada um percorre um caminho (`path`) com um parâmetro `t` de 0 a 1. Os veículos param quando há pedestre à frente, e os caminhões param nas docas carregando.
- **Árvores:** `InstancedMesh`, com milhares de copas num único desenho.

---

## 4. Interiores e animações

Os prédios de `PROD` são **montados só quando alguém entra** (`buildInterior(P)`, com cache em `prodCache`). Ao entrar:

1. As peças externas que ficam dentro do retângulo do prédio são escondidas.
2. O interior aparece: máquinas, esteiras com lápis andando, operadores, mezanino com escritórios.
3. A câmera voa até lá (`tw`, uma interpolação com *ease-out* cúbico).

Cada tipo de setor (`t: 'lac' | 'cic' | 'cos' | 'boiler' | 'lab' | ...`) tem seu próprio conjunto de máquinas. Por exemplo: o setor de lápis cru só faz lápis cru, e o acabamento só pinta e aponta.

### O padrão de animação (`PANIM`)

Toda animação de interior é uma função pequena registrada numa lista e chamada a cada quadro:

```js
PANIM.push(dt => {
  if (!g.visible) return;          // só anima o que está na tela
  t += dt;
  prensa.position.y = 2.1 - Math.max(0, Math.sin(t * 2)) * .3;   // prensa sobe e desce
  roda.rotation.z -= dt * 3;                                    // roda girando
});
```

Esteira = itens que avançam em X e voltam ao início. Operadores = braços com `sin(t)`. Vapor = esferas que sobem, crescem e ficam transparentes. **Tudo é matemática simples em cima de posição, rotação, escala e opacidade.** É isso que torna fácil levar para qualquer motor (ver seção 10).

---

## 5. Passeio, visita guiada, dia e noite

- **Câmera estilo Google Earth:** arrastar move o chão, Shift ou botão direito gira e inclina, Ctrl olha ao redor, a roda aproxima onde está o mouse. Tem bússola, "+/−" e limites de distância.
- **Andar com o boneco (`WALKUP`):** joystick no celular e WASD no computador. Câmera atrás e acima olhando para a frente, portas com marcador verde e botão "Entrar". Dentro do prédio, uma "caixa de sala" esconde o lado de fora, e existe colisão com paredes e cercas. A câmera desvia de mezanino e teto (`camHit`, um raycast do boneco até a câmera).
- **Visita guiada:** uma instrutora (NPC) e um grupo em formação (`OFF`) percorrem `TSTOPS`. Em cada parada eles entram, a instrutora fala (cartão de texto) e a câmera cinematográfica (`WK.tcam`) enquadra o grupo. A visita termina na catraca.
- **Dia e noite (`DNF`):** interpola céu, sol, luz ambiente e exposição. À noite acendem postes, janelas e luminárias (materiais emissivos e algumas luzes).

---

## 6. Modo gerente (a simulação)

`gerente.js` é **independente da maquete**. Ele só usa a ponte:

```js
window.NF = { PROD, cam, R, wrap, wx, wz, enterProd, inside(), fly(i), setNight(v) };
window.NFPAUSE = i => ...;        // a maquete pergunta se deve parar as máquinas daquele prédio
NF.onBuildingClick = i => ...;    // clicar num prédio abre o cartão de gestão
```

**Regras (herdadas do primeiro jogo):**

- **Turno e relógio:** das 08h às 18h, com 3,5 minutos de jogo por segundo e velocidade 1×/2×/4×. Almoço das 12h às 13h30.
- **Produtos e roteiros:** cada produto passa por prédios reais. Por exemplo, *lápis de cor = Minas Cor → LAC → CIC → Expedição*. O ritmo é o da **etapa mais lenta** (gargalo), e a capacidade de cada etapa é dividida entre os pedidos.
- **Matéria-prima:** madeira, grafite e tinta no Almoxarifado, com preços que mudam todo dia e capacidade ampliável.
- **Máquinas:** nível 1 a 3, desgaste, quebra (chance maior com desgaste alto e moral baixa), conserto e manutenção preventiva.
- **Caldeira:** queima madeira e gera vapor, que dá +25% no CIC e nos Cosméticos.
- **Equipe:** gerente, técnico, operadores e comprador, com salário por dia.
- **Pedidos:** ofertas com prazo e pagamento, entrega parcial e reputação.
- **Metas e acontecimentos:** metas com prêmio e acontecimentos com escolhas.
- **Gerente automático (`managerLoop`):** abre o turno, escolhe o pedido de maior lucro por hora que cabe no prazo, compra material, liga só as etapas necessárias, conserta e cuida da caldeira.
- **Offline (`catchUp`):** ao voltar, simula o tempo fora (até 12 h, rendendo metade) e mostra "Enquanto você estava fora".
- **Salvamento:** `localStorage` (`nf-gerente-v1`), com uma fábrica por navegador.

Para trocar o negócio (uma padaria, um centro logístico, uma montadora), basta editar os blocos `ST` (etapas = prédios), `PRODUCTS` (roteiros), `RES` (insumos), `STAFF` e `EVENTS`. O resto funciona igual.

---

## 7. Desempenho: como ficou leve no celular

O campus tinha cerca de **6.500 peças** e 5.200 chamadas de desenho por quadro. O que resolveu:

1. **Juntar peças paradas (`mergeStatic`):** depois de montar a cena, as malhas que não se mexem são agrupadas por material e por região num único `BufferGeometry`. Ficam separadas as que se movem (detectadas rodando a animação uma vez e comparando matrizes) e as que somem (telhados que abrem, marcadores). Resultado: cerca de 3,5× mais rápido.
2. **Árvores com menos faces:** a copa passou de icosaedro subdividido (80 triângulos) para dodecaedro (36).
3. **Número fixo de luzes:** adicionar ou remover luz obriga o three.js a recompilar todos os shaders, e a página trava. Os interiores usam um **conjunto fixo de 4 luzes** que é reaproveitado (`ilight`), e as luzes da noite só entram quando escurece.
4. **Resolução adaptativa:** se o FPS cai, o `pixelRatio` desce um pouco sozinho. No celular também: sombras menores, árvores sem sombra e interiores desmontados ao sair.
5. **Recuperação:** se a GPU do celular derruba o WebGL (`webglcontextlost`), a página recarrega em modo leve.
6. **Câmera à prova de NaN:** uma divisão por zero deixava a tela só com o fundo. Hoje existe uma verificação a cada quadro.

---

## 8. Passo a passo para replicar em outra empresa

1. **Reúna o material:** print de satélite (Google Earth/Maps) do terreno inteiro em resolução alta, fotos das fachadas, nomes dos prédios, o que acontece em cada um e, se possível, a planta.
2. **Defina a escala:** meça no mapa uma distância conhecida e ajuste `K` (metros por pixel) e `PW`/`PH`.
3. **Marque os prédios em `B`:** retângulo em pixels, altura e estilo. Comece com caixas e depois troque pelo gerador de estilo (`sawB`, `admB`...).
4. **Ruas e cercas:** polilinhas em pixels. Rotatórias e cruzamentos saem de pontos compartilhados.
5. **Interiores (`PROD`):** para cada prédio que merece interior, escolha um tipo existente ou crie um novo bloco em `buildInterior` com as máquinas daquele setor.
6. **Textos:** o campo `i` de cada prédio e as paradas da visita em `TSTOPS`.
7. **Marca:** troque logos e cores das texturas (`mkTex`, `drawBrand`). **Peça autorização de uso da marca.**
8. **Gestão (opcional):** edite `ST`/`PRODUCTS`/`RES` em `gerente.js`.
9. **Teste no celular** antes de mostrar e rode o `mergeStatic` (já é automático).
10. **Publique com acesso restrito** se a planta for sensível (Cloudflare Access, senha no Worker ou link privado).

**Como trabalhamos:** o cliente manda print com setas e círculos, o ajuste é feito nos números, o resultado é publicado e o cliente confere pelo link. Ciclos curtos de uma mudança por vez funcionaram muito bem.

---

## 9. Levando para outras tecnologias

A arquitetura se separa em 4 camadas, e cada uma tem equivalente em qualquer motor:

| Camada | Aqui (three.js) | Babylon.js | React Three Fiber | Unity (WebGL/app) | Unreal | Godot |
|---|---|---|---|---|---|---|
| **Dados do layout** (`B`, `PROD`, ruas) | arrays JS | JSON importado | JSON / props | ScriptableObject ou JSON | DataTable | Resource / JSON |
| **Geradores de prédio** (`sawB`...) | funções que criam `Mesh` | `MeshBuilder` | componentes `<Galpao/>` | script com `ProBuilder` ou prefabs | Blueprint procedural ou PCG | `@tool` script + `CSG` |
| **Loop de animação** (`PANIM`, `movers`) | `requestAnimationFrame` | `scene.onBeforeRenderObservable` | `useFrame` | `Update()` | `Tick` | `_process(delta)` |
| **Lógica de jogo** (`gerente.js`) | JS puro | igual (JS) | igual ou Zustand | C# | C++ / Blueprint | GDScript |

**Recomendações por objetivo**

- **Continuar na web, com mais produtividade:** use **React Three Fiber + drei**. O `gerente.js` entra praticamente sem mudança, e os prédios viram componentes.
- **Gráfico mais realista:** modele os prédios no **Blender** (usando as mesmas medidas em metros de `B`), exporte em **glTF/GLB** com texturas *baked* e compressão *Draco/Meshopt*, e carregue com `GLTFLoader`. A lógica continua igual.
- **App instalável, VR ou treinamento imersivo:** **Unity** (WebGL, Android/iOS e Quest) ou **Unreal** (qualidade máxima; na web via *Pixel Streaming*).
- **Código aberto e leve:** **Godot 4**, que exporta para web e celular.

**Portando os dados:** exporte `B`, `PROD`, `ROADS` e `PERIMS` como JSON. No outro motor, leia o JSON e aplique a mesma conversão `wx/wz`. É o que garante que a maquete continue batendo com o satélite.

---

## 10. Animações: técnicas e equivalentes

| Efeito | Como fizemos | Em outras ferramentas |
|---|---|---|
| Esteira com lápis andando | posição X += velocidade × dt, voltando ao início | *Timeline* (Unity), *Sequencer* (Unreal), `AnimationPlayer` (Godot) ou textura rolando (UV offset) |
| Máquinas (prensa, roda, braço) | `sin(t)` na posição ou rotação | animação no Blender exportada no glTF (`AnimationMixer`) |
| Pessoas andando | pernas e braços com `sin`, corpo percorrendo um caminho | personagens do **Mixamo** com *walk cycle* + `AnimationMixer` / Animator / AnimationTree |
| Vapor e fumaça | esferas que sobem, crescem e somem | sistemas de partículas (Shuriken/VFX Graph, Niagara, GPUParticles3D, `three-nebula`) |
| Fogo da caldeira | cilindros com escala pulsando + luz piscando | shader de fogo / flipbook |
| Carros e caminhões | parâmetro `t` ao longo da polilinha, parada por pedestre | *splines* (Unity Splines, Unreal Spline, `Path3D`) |
| Voo de câmera | interpolação com *ease-out* cúbico | **GSAP**, Cinemachine, Sequencer |
| Dia e noite | lerp de cores e intensidades + emissivo | *Sky Atmosphere* / HDRI com exposição animada |

**Vídeo institucional a partir da maquete:** grave a visita guiada com o gravador de tela ou use `CCapture.js` para exportar quadro a quadro em 60 fps. Para cinema, exporte a cena para o Blender e renderize com Cycles.

---

## 11. Lições aprendidas e armadilhas

- **Um arquivo HTML único** acelera muito o ciclo de pedir, ajustar, publicar e conferir. Quando crescer, separe em módulos (como o `gerente.js`).
- **Pixel da foto como coordenada** foi a melhor decisão: o cliente fala a língua do mapa.
- **Texturas em canvas** substituem dezenas de imagens e deixam trocar cor e marca em segundos.
- **Não crie ou remova luzes durante o uso** no three.js, porque isso recompila todos os shaders.
- **Teste no celular real:** o emulador não reproduz falta de memória nem perda de contexto WebGL.
- **Bloqueie o zoom da página** (Ctrl + roda e pinça) para ele não brigar com o zoom do mapa.
- **Painéis que atualizam sozinhos:** atualize só o que mudou, senão a rolagem pula.
- **Marca e sigilo:** maquete de fábrica é informação sensível. Tenha autorização e publique com acesso controlado.

---

Feito com three.js, JavaScript puro e Cloudflare Workers.
