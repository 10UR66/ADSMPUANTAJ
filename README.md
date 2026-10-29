# T.C. Sağlık Bakanlığı - Üsküdar Ağız ve Diş Sağlığı Merkezi
## Sürekli İşçi Puantaj Yönetim Sistemi (KKU.FR.03 Kalite Standartlı)

Bu yazılım, **Üsküdar Ağız ve Diş Sağlığı Merkezi (ADSM)** İnsan Kaynakları Birimi'nin 4857 sayılı İş Kanunu ve yürürlükteki İşletme Toplu İş Sözleşmesi (TİS) hükümlerine uygun olarak sürekli işçi puantaj cetvellerini dijital, kurumsal ve hatasız bir şekilde yönetebilmesi amacıyla geliştirilmiştir.

---

### 🌟 Son Güncellemeler ve Yapılan Düzeltmeler

1. **Tek Sayfa A4 Yatay (Landscape) Kesin Sığdırma Çözümü:**
   - Yazdırma sırasında sağdan sütun kesilme veya 2. sayfaya taşma sorunu tamamen giderildi.
   - Matematiksel olarak 31 günün tamamı (`%2.14` sütun genişliği), Ad Soyad (`%12.5`), Ünvan (`%9.5`) ve Özet Sütunlar toplam `%100.00` olacak şekilde A4 Yatay (287mm yazdırılabilir alan) sınırlarına kilitlendi.
   - Uzun mesai saatleri (örn: `07:30 - 17:30`, `20:00 - 08:00`), Excel'deki gibi hücre içinde 2 satır halinde (`07:30 / 17:30`) biçimlendirildi.

2. **Orijinal Excel Şablonu ve Sağlık Bakanlığı Logosu Birebir İkizlendi:**
   - Excel'deki resmi T.C. Sağlık Bakanlığı amblemi/logosu sol üst köşeye yerleştirildi.
   - 4 satırlı resmi kurum başlığı (T.C. / SAĞLIK BAKANLIĞI / ÜSKÜDAR AĞIZ VE DİŞ SAĞLIĞI MERKEZİ / ... SÜREKLİ İŞÇİ PUANTAJ CETVELİ) Excel'deki orijinal düzenine kavuşturuldu.
   - `DOK. KOD: KKU.FR.03 | YAY. TAR: 02.01.2020 | REV. TAR: 00 | REV. NO: 00 | SAYFA: 1 / 1` kalite şeridi birebir eklendi.
   - Tablo kafesi, 1px net siyah çizgilerle tam Excel görünümünde yapılandırıldı.
   - Kanuni Notlar, Kısaltma Lejantı ve 3'lü Onay/İmza blokları (Hazırlayan Onur GÖRGÜLÜ, Kontrol Eden Ali TURAN, Onaylayan Dt. Ayşenur CENGİZ) Excel'deki yer ve nizamına getirildi.

3. **Uygulama İçi "Excel Şablon Önizleme" Modu:**
   - Üst bardaki **"Excel Şablon Önizleme"** butonuna basarak, ekranda doğrudan A4 yatay kağıt üzerinde Excel çıktısının birebir halini görebilir, birim seçebilir ve tek tıkla yazdırabilirsiniz.

---

### 🚀 Başlatma

Klasördeki **`PUANTAJ_SISTEMINI_AC.bat`** dosyasına çift tıklayarak sistemi tarayıcınızda açabilirsiniz.
Dosya Yolu: `C:\Users\ONUR\.gemini\antigravity\scratch\uskudar-adsm-puantaj`
