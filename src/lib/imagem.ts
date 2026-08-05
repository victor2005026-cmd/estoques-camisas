/** Redimensiona e comprime uma imagem no navegador antes do upload (mais rápido, menos dados). */
export function comprimirImagem(arquivo: File, maxDim = 900, qualidade = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))),
          'image/jpeg',
          qualidade
        );
      };
      img.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
      img.src = evt.target?.result as string;
    };
    leitor.onerror = () => reject(new Error('Não foi possível ler esse arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}
