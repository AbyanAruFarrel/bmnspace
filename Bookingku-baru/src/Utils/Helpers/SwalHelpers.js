import Swal from "sweetalert2";

export const confirmDialog = async (title, text) => {
  const res = await Swal.fire({
    title, text, icon: "question",
    showCancelButton: true, confirmButtonText: "Ya", cancelButtonText: "Batal",
  });
  return res.isConfirmed;
};

// null = dibatalkan, "" = dikonfirmasi tanpa catatan
export const promptNote = async (title) => {
  const res = await Swal.fire({
    title, input: "text", inputPlaceholder: "Catatan (opsional), mis. banyak sampah",
    showCancelButton: true, confirmButtonText: "Laporkan", cancelButtonText: "Batal",
  });
  return res.isConfirmed ? (res.value || "").trim() : null;
};
