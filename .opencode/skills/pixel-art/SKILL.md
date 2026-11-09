---
name: Pixel Art
description: Desenhar pixel art de forma determinística e gerar um PNG. Use quando o usuário pedir sprites, ícones, personagens, tiles, itens ou animações em pixel art, ou quando um agente sem geração de imagem precisar desenhar. Produz sempre um arquivo .png real.
---

# Pixel Art

## Princípio

Não "desenhe uma imagem". **Escreva uma spec textual e rasterize com código.**
O agente decide a forma e as cores; o script garante pixels exatos e gera o PNG.

- Nunca peça a uma ferramenta de imagem para desenhar.
- Nunca descreva o sprite só em prosa no final: sempre gere o PNG.
- Sempre valide o resultado com o preview ASCII e as métricas antes de entregar.

## Quando usar

Sprites, ícones, personagens, tiles, itens, emotes, retratos e animações em
pixel art. Funciona com agentes que apenas escrevem texto e código.

## Workflow

1. **Defina o alvo.** Tamanho (`16x16`, `24x24`, `32x32`; no máximo `64x64`),
   vista (`front`, `3/4`, `top-down`), paleta (4–16 cores) e fundo transparente.
2. **Silhueta primeiro.** Desenhe só a máscara sólida com um caractere. Confira
   a forma no ASCII antes de colorir.
3. **Paleta nomeada.** Monte o `palette` com chaves de 1 caractere. Use `.` para
   transparente, `#` para contorno e maiúsculas para luz. Nunca hex solto no grid.
4. **Escreva a spec** conforme `references/spec.md` (leia antes de começar).
   Use `ops` para trabalho repetitivo: `mirror_x` para simetria, `outline` para
   contorno, `dither` para textura, `shift` para variações de animação.
5. **Renderize e valide** (use o caminho absoluto da skill como base):
   ```sh
   python .opencode/skills/pixel-art/scripts/render_pixel_art.py spec.json \
     -o out/nome.png --ascii
   ```
6. **Corrija com base no relatório.** O JSON traz `orphan_pixels`,
   `vertical_symmetry`, `occupancy`, `bbox`, `colors` e `pixel_counts`. Se
   `orphan_pixels > 0`, remova pixels soltos. Se o sprite não estiver centrado,
   ajuste o grid. Re-renderize até ficar limpo (normalmente 2–4 iterações).
7. **Entregue o PNG** e cite o caminho. Para animação, entregue o `_sheet.png`,
   os frames individuais e, se pedido, um GIF animado (`--gif`).

## Regras de qualidade

- **Contorno fechado** de 1px em volta da silhueta (gerado por `outline`, não à mão).
- **Rampas de 3 tons** por material: `base`, `shadow`, `highlight`.
- **Simetria** em personagens e objetos frontais: desenhe metade + `mirror_x`.
- **Sem anti-aliasing e sem blur.** O upscale é sempre nearest-neighbor.
- **Perspectiva única** por sprite. Não misture frente com isométrico.
- **Chão e pivô** definidos: pés na base, objeto centrado no `bbox`.
- **Legibilidade em 1x**: se não lê em 16x16, o sprite está complexo demais.
- **Poucas cores**: se usar mais de 16, consolide a paleta.

## Loop de correção sem visão

O script devolve texto, então o agente consegue "ver" sem multimodal:

- `--ascii` mostra o grid final com os caracteres da paleta.
- As métricas apontam defeitos objetivos:
  - `orphan_pixels > 0` → pixels soltos, corrija.
  - `vertical_symmetry < 1.0` em sprite simétrico → forma torta.
  - `occupancy` muito baixa → sprite vazio ou pequeno demais.
  - `bbox` encostando nas bordas → pode estar cortado.
  - `colors` alto demais para o tamanho → ruído visual.

Se o agente for multimodal, abra o PNG gerado e critique visualmente também.

## Animação

Um objeto `frames` com nomes por frame. Regras:

- Mesmo `size` e mesma `palette` em todos os frames.
- Mantenha o `bbox` estável (`shift` para o bounce, não redesenhe tudo).
- Gere o sheet automaticamente e confira que os frames não "pulam".
- 2–4 frames bastam para idle, walk ou bounce em pixel art pequena.
- Para preview animado, use `--gif out/anim.gif` (o `fps` vem do campo `fps`
  da spec, padrão 8).
- Para 60 fps de verdade, use `--webp out/anim.webp` ou `--apng out/anim.png`.
  O GIF tem atraso em centissegundos, então na prática fica limitado a ~50 fps.
- `--no-frames` gera só a animação (sem os PNGs por frame nem o sheet).

## Exemplo completo

`assets/slime.json` é um sprite 16x16 com 2 frames, `mirror_x`, `shift` e paleta
de 6 cores. Rode para conferir o fluxo:

```sh
python .opencode/skills/pixel-art/scripts/render_pixel_art.py \
  .opencode/skills/pixel-art/assets/slime.json -o out/slime.png --ascii
```

## Referência

Leia `references/spec.md` para o formato completo, todos os campos, cores
aceitas e a lista de operações. Se o script falhar, a mensagem indica a linha ou
o caractere inválido; corrija a spec em vez de alterar o script.
