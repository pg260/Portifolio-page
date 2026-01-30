# 🖼️ Guia Rápido: Adicionar Imagens aos Cards

## ✅ O que já está pronto:

1. ✅ Pasta `public/images/` criada
2. ✅ Placeholders SVG temporários criados para teste
3. ✅ Código atualizado para usar as imagens

## 📸 Como adicionar suas imagens reais:

### Opção 1: Substituir os SVGs (Recomendado)

1. Tire screenshots dos seus jogos/projetos
2. **Converta para WebP** (melhor performance) usando https://squoosh.app/
3. Salve as imagens na pasta `public/images/` com estes nomes:
   - `mundo-iel.webp` (ou .png/.jpg)
   - `nesher.webp` (ou .png/.jpg)
   - `fossil-vivo.webp` (ou .png/.jpg)
   - `indie-games.webp` (ou .png/.jpg)

4. Atualize o código em `src/App.jsx`:
   ```javascript
   image: "/images/mundo-iel.webp", // Mude .svg para .webp, .png ou .jpg
   ```

### Por que WebP?
- ✅ **70% menor** que PNG/JPG com mesma qualidade
- ✅ Suporta transparência (como PNG)
- ✅ Carregamento mais rápido
- ✅ Suportado por todos navegadores modernos

### Opção 2: Manter os SVGs temporários

- Os placeholders SVG que criei já funcionam!
- Você pode rodar o projeto agora e ver os cards com placeholders coloridos
- Substitua depois quando tiver as imagens reais

## 🎨 Dicas para boas imagens:

### Screenshots de Jogos Mobile:
- Capture da tela do gameplay mais interessante
- Use a orientação portrait (vertical) se for mobile
- Mostre a UI ou elementos únicos do jogo

### Apps/Configuradores:
- Screenshot da interface principal
- Mostre a funcionalidade mais impressionante
- Use uma captura limpa, sem elementos de debug

### Experiências VR/AR:
- Foto de alguém usando o headset OU
- Screenshot in-game da experiência OU
- Poster/banner oficial do projeto

### Jogos Indie:
- Collage com vários screenshots OU
- Screenshot do jogo mais polido OU
- Banner com logos dos jogos

## 🔧 Ferramentas Úteis:

- **Squoosh** (https://squoosh.app/) - ⭐ RECOMENDADO! Converte para WebP
  - Arraste sua imagem PNG/JPG
  - Escolha "WebP" no lado direito
  - Ajuste qualidade (70-80% é ótimo)
  - Download da imagem otimizada
- **Canva** - Criar collages e banners
- **Photopea** - Editor de imagens online (tipo Photoshop)
- **CloudConvert** - Converter lote de imagens para WebP

## 🚀 Teste agora:

```bash
npm run dev
```

Os cards já vão aparecer com os placeholders SVG! Você pode substituir as imagens depois.

## 📝 Exemplo de atualização no código:

Se você adicionar `mundo-iel.webp` na pasta `public/images/`, vá em `src/App.jsx` e mude:

```javascript
// De:
image: "/images/mundo-iel.svg",

// Para:
image: "/images/mundo-iel.webp",
```

**Funciona com qualquer formato:** .webp, .png, .jpg, .svg - todos funcionam!

É só isso! O Vite/React detecta automaticamente arquivos na pasta `public/`.
