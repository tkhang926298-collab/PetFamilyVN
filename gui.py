import customtkinter as ctk
from tkinter import filedialog, messagebox
import threading
import pandas as pd
from core import (
    parse_pdf_to_english_csv,
    process_with_ollama,
    build_full_json,
    load_csv,
    save_csv
)

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class VetAdminGUI(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Veterinary Disease Admin Tool - Python Edition")
        self.geometry("1200x800")
        
        self.tabview = ctk.CTkTabview(self)
        self.tabview.pack(fill="both", expand=True, padx=20, pady=20)
        
        self.tab_pdf = self.tabview.add("1. Import PDF")
        self.tab_review_en = self.tabview.add("2. Review English")
        self.tab_ollama = self.tabview.add("3. Process Ollama")
        self.tab_review_vi = self.tabview.add("4. Review Vietnamese")
        self.tab_final = self.tabview.add("5. Final JSON")
        
        self.build_pdf_tab()
        self.build_review_en_tab()
        self.build_ollama_tab()
        self.build_review_vi_tab()
        self.build_final_tab()
        
        self.english_csv = "data/diseases_english.csv"
        self.vietnamese_csv = "data/diseases_vietnamese.csv"
    
    def build_pdf_tab(self):
        ctk.CTkLabel(self.tab_pdf, text="Chọn file PDF (Merck hoặc sách thú y)", font=ctk.CTkFont(size=16)).pack(pady=20)
        self.btn_pdf = ctk.CTkButton(self.tab_pdf, text="Chọn PDF & Parse", command=self.parse_pdf)
        self.btn_pdf.pack(pady=10)
        self.lbl_pdf_status = ctk.CTkLabel(self.tab_pdf, text="")
        self.lbl_pdf_status.pack(pady=10)
    
    def parse_pdf(self):
        file = filedialog.askopenfilename(filetypes=[("PDF files", "*.pdf")])
        if file:
            self.lbl_pdf_status.configure(text="Đang parse...")
            threading.Thread(target=self._parse_thread, args=(file,), daemon=True).start()
    
    def _parse_thread(self, file):
        try:
            df = parse_pdf_to_english_csv(file)
            df.to_csv(self.english_csv, index=False, encoding="utf-8")
            self.lbl_pdf_status.configure(text=f"✅ Parse xong! {len(df)} bệnh. Chuyển sang tab 2 để review.")
            messagebox.showinfo("Thành công", f"Đã tạo {self.english_csv} với {len(df)} bệnh")
        except Exception as e:
            messagebox.showerror("Lỗi", str(e))
    
    def build_review_en_tab(self):
        ctk.CTkButton(self.tab_review_en, text="Load & Edit English CSV", command=self.load_en_csv).pack(pady=10)
        # Table sẽ dùng Treeview đơn giản (có thể nâng cấp sau)
        self.tree_en = ctk.CTkScrollableFrame(self.tab_review_en)
        self.tree_en.pack(fill="both", expand=True)
    
    def load_en_csv(self):
        df = load_csv(self.english_csv)
        # Hiển thị đơn giản (bạn có thể thay bằng bảng đẹp hơn)
        for widget in self.tree_en.winfo_children():
            widget.destroy()
        for _, row in df.iterrows():
            ctk.CTkLabel(self.tree_en, text=str(row.to_dict())).pack(anchor="w", padx=10, pady=2)
    
    def build_ollama_tab(self):
        ctk.CTkLabel(self.tab_ollama, text="Xử lý bằng Ollama (Qwen2.5 7B trên RX 580)", font=ctk.CTkFont(size=16)).pack(pady=20)
        self.btn_ollama = ctk.CTkButton(self.tab_ollama, text="BẮT ĐẦU PROCESS OLLAMA", fg_color="green", command=self.start_ollama)
        self.btn_ollama.pack(pady=10)
        self.progress = ctk.CTkProgressBar(self.tab_ollama)
        self.progress.pack(fill="x", padx=50, pady=20)
        self.progress.set(0)
        self.lbl_progress = ctk.CTkLabel(self.tab_ollama, text="Chưa chạy")
        self.lbl_progress.pack()
    
    def start_ollama(self):
        if not Path(self.english_csv).exists():
            messagebox.showwarning("Chưa có CSV", "Vui lòng parse PDF trước!")
            return
        self.btn_ollama.configure(state="disabled")
        threading.Thread(target=self._ollama_thread, daemon=True).start()
    
    def _ollama_thread(self):
        def update_progress(p, msg):
            self.progress.set(p/100)
            self.lbl_progress.configure(text=msg)
        
        try:
            enriched, vi_path = process_with_ollama(self.english_csv, update_progress)
            self.vietnamese_csv = vi_path
            messagebox.showinfo("Hoàn tất", f"Đã xử lý {len(enriched)} bệnh!\nChuyển sang tab 4 để review.")
        except Exception as e:
            messagebox.showerror("Lỗi Ollama", str(e))
        finally:
            self.btn_ollama.configure(state="normal")
    
    def build_review_vi_tab(self):
        ctk.CTkButton(self.tab_review_vi, text="Load Vietnamese CSV & Edit", command=self.load_vi_csv).pack(pady=10)
        self.tree_vi = ctk.CTkScrollableFrame(self.tab_review_vi)
        self.tree_vi.pack(fill="both", expand=True)
    
    def load_vi_csv(self):
        df = load_csv(self.vietnamese_csv)
        for widget in self.tree_vi.winfo_children():
            widget.destroy()
        for _, row in df.iterrows():
            ctk.CTkLabel(self.tree_vi, text=str(row.to_dict())).pack(anchor="w", padx=10, pady=2)
    
    def build_final_tab(self):
        ctk.CTkButton(self.tab_final, text="BUILD FULL JSON + TẠO FOLDER ẢNH", fg_color="orange", command=self.build_json).pack(pady=30)
        self.lbl_final = ctk.CTkLabel(self.tab_final, text="")
        self.lbl_final.pack()
    
    def build_json(self):
        try:
            df = pd.read_csv(self.vietnamese_csv)
            enriched = df.to_dict("records")
            json_path = build_full_json(enriched)
            self.lbl_final.configure(text=f"✅ JSON đã tạo: {json_path}\nFolder ảnh đã tạo cho bệnh cần hình!")
            messagebox.showinfo("Thành công", "Hoàn tất! Mở data/responses_full.json để kiểm tra.")
        except Exception as e:
            messagebox.showerror("Lỗi", str(e))

if __name__ == "__main__":
    app = VetAdminGUI()
    app.mainloop()