// Foto diunggah dari komputer (file JPG), bukan lewat link http.
// Diperkecil + dikompres dulu supaya muat di localStorage.
export const MAX_PHOTOS = 5;

export const isJpg = (file) => file.type === "image/jpeg" && /\.jpe?g$/i.test(file.name);

export const fileToJpegDataUrl = (file, maxW = 800, quality = 0.6) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
