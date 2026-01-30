# 📸 Como Adicionar Imagens dos Projetos

## Pasta de Imagens
Todas as imagens dos projetos devem ser colocadas nesta pasta: `public/images/`

## Imagens Necessárias

Adicione as seguintes imagens nesta pasta:

1. **mundo-iel.webp** (ou .png/.jpg) - Screenshot ou logo do jogo Mundo IEL
2. **nesher.webp** (ou .png/.jpg) - Screenshot ou logo do Configurador Nesher
3. **fossil-vivo.webp** (ou .png/.jpg) - Foto ou poster do projeto Fóssil Vivo
4. **indie-games.webp** (ou .png/.jpg) - Collage ou screenshot dos seus jogos indie

## Recomendações de Tamanho

- **Largura recomendada:** 800px - 1200px
- **Altura recomendada:** 450px - 675px
- **Proporção ideal:** 16:9 ou 4:3
- **Formato:** 
  - ✅ **WebP** (RECOMENDADO - melhor compressão, suporta transparência)
  - ✅ PNG (para logos com transparência)
  - ✅ JPG (para screenshots)
- **Tamanho do arquivo:** Máximo 500KB por imagem (WebP geralmente fica < 200KB)

## Como Usar

As imagens são referenciadas automaticamente no código como:
```javascript
image: "/images/nome-da-imagem.png"
```

## Ferramentas para Otimização e Conversão para WebP

- **Squoosh** (https://squoosh.app/) - ⭐ MELHOR! Converte para WebP e otimiza
- **CloudConvert** (https://cloudconvert.com/png-to-webp) - Converter PNG/JPG para WebP
- **TinyPNG** (https://tinypng.com/) - Compressão de PNG/JPG
- **ImageOptim** (Mac) ou **FileOptimizer** (Windows)
- **Photoshop/GIMP** - Exportar como WebP (plugin pode ser necessário)

## Dica Pro

Se você não tiver uma imagem específica ainda, o card mostrará automaticamente o ícone como fallback!

## Placeholder Online (Temporário)

Se quiser testar rapidamente, você pode usar placeholders online como:
- https://via.placeholder.com/800x450/1e293b/a78bfa?text=Mundo+IEL
- https://placehold.co/800x450/1e293b/10b981?text=Nesher

Exemplo de uso temporário:
```javascript
image: "https://via.placeholder.com/800x450/1e293b/a78bfa?text=Mundo+IEL"
```
