/**
 * T.C. SAĞLIK BAKANLIĞI - ÜSKÜDAR AĞIZ VE DİŞ SAĞLIĞI MERKEZİ
 * Sürekli İşçi Puantaj Yönetim Sistemi (KKU.FR.03)
 * İnsan Kaynakları Yönetim ve Resmi Excel Baskı Motoru
 */

// Uygulama Durumu (State)
const AppState = {
  selectedYear: 2026,
  selectedMonth: 1, // 2026 Ocak'tan itibaren başlar
  selectedDept: "all",
  searchQuery: "",
  activeCell: null, // { personId, day }
  config: null,
  personnel: [],
  periods: {}
};

// 2024 - 2028 Türkiye Resmi ve Dini Tatiller Veri Tabanı
const TURKEY_HOLIDAYS = {
  fixed: {
    "01-01": "Yılbaşı",
    "04-23": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
    "05-01": "1 Mayıs Emek ve Dayanışma Günü",
    "05-19": "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı",
    "07-15": "15 Temmuz Demokrasi ve Milli Birlik Günü",
    "08-30": "30 Ağustos Zafer Bayramı",
    "10-28": "28 Ekim Cumhuriyet Bayramı Arefesi (Yarım Gün)",
    "10-29": "29 Ekim Cumhuriyet Bayramı"
  },
  variable: {
    2024: {
      "04-09": "Ramazan Bayramı Arefesi (Yarım Gün)",
      "04-10": "Ramazan Bayramı 1. Gün",
      "04-11": "Ramazan Bayramı 2. Gün",
      "04-12": "Ramazan Bayramı 3. Gün",
      "06-15": "Kurban Bayramı Arefesi (Yarım Gün)",
      "06-16": "Kurban Bayramı 1. Gün",
      "06-17": "Kurban Bayramı 2. Gün",
      "06-18": "Kurban Bayramı 3. Gün",
      "06-19": "Kurban Bayramı 4. Gün"
    },
    2025: {
      "03-29": "Ramazan Bayramı Arefesi (Yarım Gün)",
      "03-30": "Ramazan Bayramı 1. Gün",
      "03-31": "Ramazan Bayramı 2. Gün",
      "04-01": "Ramazan Bayramı 3. Gün",
      "06-05": "Kurban Bayramı Arefesi (Yarım Gün)",
      "06-06": "Kurban Bayramı 1. Gün",
      "06-07": "Kurban Bayramı 2. Gün",
      "06-08": "Kurban Bayramı 3. Gün",
      "06-09": "Kurban Bayramı 4. Gün"
    },
    2026: {
      "03-19": "Ramazan Bayramı Arefesi (Yarım Gün)",
      "03-20": "Ramazan Bayramı 1. Gün",
      "03-21": "Ramazan Bayramı 2. Gün",
      "03-22": "Ramazan Bayramı 3. Gün",
      "05-26": "Kurban Bayramı Arefesi (Yarım Gün)",
      "05-27": "Kurban Bayramı 1. Gün",
      "05-28": "Kurban Bayramı 2. Gün",
      "05-29": "Kurban Bayramı 3. Gün",
      "05-30": "Kurban Bayramı 4. Gün"
    },
    2027: {
      "03-09": "Ramazan Bayramı Arefesi (Yarım Gün)",
      "03-10": "Ramazan Bayramı 1. Gün",
      "03-11": "Ramazan Bayramı 2. Gün",
      "03-12": "Ramazan Bayramı 3. Gün",
      "05-16": "Kurban Bayramı Arefesi (Yarım Gün)",
      "05-17": "Kurban Bayramı 1. Gün",
      "05-18": "Kurban Bayramı 2. Gün",
      "05-19": "Kurban Bayramı 3. Gün",
      "05-20": "Kurban Bayramı 4. Gün"
    }
  }
};

const MONTH_NAMES = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"
];

const DAY_SHORT_NAMES = ["Pz.", "Pt.", "Sa.", "Ça.", "Pe.", "Cu.", "Ct."];

// ==========================================================================
// DEPOLAMA YÖNETİCİSİ (LOCAL STORAGE & BACKUP)
// ==========================================================================
const Storage = {
  KEY_CONFIG: "uskudar_adsm_puantaj_config_2026",
  KEY_PERSONNEL: "uskudar_adsm_puantaj_personnel_2026",
  KEY_PERIODS: "uskudar_adsm_puantaj_periods_2026",

  init() {
    const savedConfig = localStorage.getItem(this.KEY_CONFIG);
    const savedPersonnel = localStorage.getItem(this.KEY_PERSONNEL);
    const savedPeriods = localStorage.getItem(this.KEY_PERIODS);

    if (savedConfig && savedPersonnel && savedPeriods) {
      try {
        AppState.config = JSON.parse(savedConfig);
        AppState.personnel = JSON.parse(savedPersonnel);
        AppState.periods = JSON.parse(savedPeriods);
        if (AppState.selectedYear < 2026) {
          AppState.selectedYear = 2026;
          AppState.selectedMonth = 1;
        }
        return;
      } catch (e) {
        console.warn("Kayıtlı veri okunamadı, varsayılan yükleniyor:", e);
      }
    }

    this.resetToDefaults();
  },

  save() {
    localStorage.setItem(this.KEY_CONFIG, JSON.stringify(AppState.config));
    localStorage.setItem(this.KEY_PERSONNEL, JSON.stringify(AppState.personnel));
    localStorage.setItem(this.KEY_PERIODS, JSON.stringify(AppState.periods));
    const indicator = document.getElementById("saveStatusIndicator");
    if (indicator) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      indicator.innerHTML = `<i class="bi bi-check-circle-fill"></i> Kaydedildi (${timeStr})`;
    }
  },

  resetToDefaults() {
    AppState.config = JSON.parse(JSON.stringify(INITIAL_CONFIG));
    AppState.personnel = JSON.parse(JSON.stringify(INITIAL_PERSONNEL));
    AppState.periods = JSON.parse(JSON.stringify(INITIAL_PERIOD_DATA));
    AppState.selectedYear = 2026;
    AppState.selectedMonth = 1;
    this.save();
  },

  exportJSON() {
    const bundle = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      facility: AppState.config.institution.facility,
      config: AppState.config,
      personnel: AppState.personnel,
      periods: AppState.periods
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Uskudar_ADSM_Puantaj_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.config && data.personnel && data.periods) {
        AppState.config = data.config;
        AppState.personnel = data.personnel;
        AppState.periods = data.periods;
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
};

// ==========================================================================
// TAKVİM VE HESAPLAMA MOTORU
// ==========================================================================
const CalendarEngine = {
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },

  getDayOfWeek(year, month, day) {
    return new Date(year, month - 1, day).getDay();
  },

  getDayShortName(year, month, day) {
    return DAY_SHORT_NAMES[this.getDayOfWeek(year, month, day)];
  },

  isWeekend(year, month, day) {
    const d = this.getDayOfWeek(year, month, day);
    return d === 0 || d === 6; // Cumartesi veya Pazar
  },

  getHolidayInfo(year, month, day) {
    const mStr = String(month).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const key = `${mStr}-${dStr}`;

    if (TURKEY_HOLIDAYS.fixed[key]) {
      return { isHoliday: true, name: TURKEY_HOLIDAYS.fixed[key] };
    }

    if (TURKEY_HOLIDAYS.variable[year] && TURKEY_HOLIDAYS.variable[year][key]) {
      return { isHoliday: true, name: TURKEY_HOLIDAYS.variable[year][key] };
    }

    return null;
  },

  getPeriodKey(year, month) {
    return `${year}-${String(month).padStart(2, "0")}`;
  },

  ensurePeriod(year, month) {
    const key = this.getPeriodKey(year, month);
    if (!AppState.periods[key]) {
      AppState.periods[key] = {
        notes: [
          `1.- Kurumumuzda günlük çalışmalar 7,5 (yedi buçuk) saatten fazla olduğu için 1 (bir) saat ara dinlenme uygulanmaktadır. Haftalık çalışma saati 45 (kırk beş) saattir.`,
          `2.- 05.06.2023 tarihinde imzalanan İşletme Toplu İş Sözleşmesi (TİS) kapsamında çalışan personele yemek molası ve ara dinlenme uygulanmaktadır.`
        ],
        roster: {}
      };
    }
    return AppState.periods[key];
  }
};

// ==========================================================================
// PUANTAJ HESAPLAMA MOTORU
// ==========================================================================
const CalculationEngine = {
  calculatePersonnelTotals(personId, year, month) {
    const period = CalendarEngine.ensurePeriod(year, month);
    const personRoster = period.roster[personId] || {};
    const daysInMonth = CalendarEngine.getDaysInMonth(year, month);

    let workedDays = 0;
    let nightDays = 0;
    let leaveDays = 0;
    let holidayWorkedDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const code = (personRoster[day] || "").trim();
      if (!code) continue;

      const isOfficialHoliday = CalendarEngine.getHolidayInfo(year, month, day);

      if (code === "07:30 - 17:30" || code === "08:00 - 20:00" || code === "20:00 - 08:00" ||
          code === "10:00 - 15:00" || code === "07:00 - 17:00" || code === "07:30 - 16:30" ||
          code === "07:30 - 17:00" || code === "08:00 - 17:00" || code === "08:00 - 18:00" ||
          code === "GEÇİCİ GÖREV") {
        
        workedDays++;

        if (code === "20:00 - 08:00") {
          nightDays++;
        }

        if (isOfficialHoliday) {
          holidayWorkedDays++;
        }
      } else if (code === "Y.İ." || code === "RAP" || code === "Ü.İ." || code === "E.İ." ||
                 code === "S.İ." || code === "Ö.İ." || code === "M.İ.") {
        leaveDays++;
      }
    }

    return {
      workedDays,
      nightDays,
      leaveDays,
      holidayWorkedDays
    };
  },

  calculateOverallStats(year, month, filteredPersonnel) {
    let totalWorked = 0;
    let totalNight = 0;
    let totalLeave = 0;
    let totalHolidayWork = 0;

    filteredPersonnel.forEach(p => {
      const t = this.calculatePersonnelTotals(p.id, year, month);
      totalWorked += t.workedDays;
      totalNight += t.nightDays;
      totalLeave += t.leaveDays;
      totalHolidayWork += t.holidayWorkedDays;
    });

    return {
      totalPersonnel: filteredPersonnel.length,
      totalWorked,
      totalNight,
      totalLeave,
      totalHolidayWork
    };
  }
};

// ==========================================================================
// RESMİ EXCEL BASKI VE ŞABLON MOTORU (A4 YATAY KESİN UYUMLU)
// ==========================================================================
const ExcelPrintManager = {
  formatCellForPrint(code) {
    if (!code) return "&nbsp;";
    const trimmed = code.trim();

    // 07:30 - 17:30 -> iki satır 07:30 / 17:30
    if (trimmed.includes(" - ")) {
      const parts = trimmed.split(" - ");
      return `<span class="excel-cell-shift">${parts[0]}<br>${parts[1]}</span>`;
    }
    if (trimmed.includes("\n")) {
      const parts = trimmed.split("\n");
      return `<span class="excel-cell-shift">${parts[0]}<br>${parts[1]}</span>`;
    }
    if (trimmed === "GEÇİCİ GÖREV") {
      return `<span style="font-size: 5pt; font-weight: bold; line-height: 1;">GEÇİCİ<br>GÖREV</span>`;
    }
    return `<strong>${trimmed}</strong>`;
  },

  generateHTML(targetDeptId) {
    const year = AppState.selectedYear;
    const month = AppState.selectedMonth;
    const monthName = MONTH_NAMES[month - 1];
    const daysInMonth = CalendarEngine.getDaysInMonth(year, month);
    const period = CalendarEngine.ensurePeriod(year, month);

    // Personel Listesi
    let list = AppState.personnel.filter(p => p.active);
    const actualDept = targetDeptId === "current" ? AppState.selectedDept : targetDeptId;
    if (actualDept && actualDept !== "all") {
      list = list.filter(p => p.dept === actualDept);
    }
    const isSecurity = actualDept === "guvenlik";

    // Logo (Base64 gömülü - Tüm birimlerde anında ve eksiksiz görünür)
    const logoSrc = (typeof MINISTRY_LOGO_DATA_URL !== "undefined" && MINISTRY_LOGO_DATA_URL)
      ? MINISTRY_LOGO_DATA_URL
      : "saglik-bakanligi-logo.png";

    // Notlar (Sadece seçili aya ait notlar)
    let notes = period.notes || AppState.config.legalNotes;

    let html = `
      <div class="excel-sheet-wrapper">
        <!-- 1. ÜST ANTET & LOGO & BAŞLIK (EXCEL BİREBİR) -->
        <div class="excel-header-box">
          <div class="excel-logo-col">
            <img src="${logoSrc}" alt="T.C. Sağlık Bakanlığı">
          </div>
          <div class="excel-title-col">
            <div class="excel-title-ministry">${AppState.config.institution.ministry}</div>
            <div class="excel-title-adsm">${AppState.config.institution.facility}</div>
            <div class="excel-title-period">${year} YILI ${monthName} AYI ${AppState.config.institution.subTitle}</div>
          </div>
          <div class="excel-logo-spacer"></div>
        </div>

        <!-- 2. DOKÜMAN KODU ŞERİDİ (KKU.FR.03) -->
        <div class="excel-meta-bar">
          <span>DOK. KOD: ${AppState.config.institution.docCode}</span>
          <span>YAY. TAR: ${AppState.config.institution.publishDate}</span>
          <span>REV. TAR: ${AppState.config.institution.revDate}</span>
          <span>REV. NO: ${AppState.config.institution.revNo}</span>
          <span>SAYFA: ${AppState.config.institution.pageNo}</span>
        </div>

        <!-- 3. ANA TABLO KAFESİ -->
        <table class="excel-print-table">
          <thead>
            <tr>
              <th rowspan="2" class="excel-col-name">Ad Soyad</th>
              <th rowspan="2" class="excel-col-title">Ünvan</th>
    `;

    // 1. Başlık Satırı (1..31 Gün Numaraları)
    for (let d = 1; d <= daysInMonth; d++) {
      const isWeekend = CalendarEngine.isWeekend(year, month, d);
      html += `<th class="excel-col-day ${isWeekend ? 'excel-day-weekend' : ''}">${d}</th>`;
    }

    // Özet Sütun Başlıkları
    if (isSecurity) {
      html += `
        <th class="excel-col-sec-work">ÇALIŞTIĞI<br>GÜN</th>
        <th class="excel-col-sec-night">GECE<br>ÇALIŞ.</th>
        <th class="excel-col-sec-leave">İZİN<br>RAPOR</th>
        <th class="excel-col-sec-hol">RESMİ<br>TATİL</th>
      `;
    } else {
      html += `
        <th class="excel-col-sum-work">ÇALIŞTIĞI<br>GÜN SAYISI</th>
        <th class="excel-col-sum-leave">RAPOR / İZİN<br>GÜN SAYISI</th>
      `;
    }
    html += `</tr><tr>`;

    // 2. Başlık Satırı (Pt, Sa, Ça...)
    for (let d = 1; d <= daysInMonth; d++) {
      const isWeekend = CalendarEngine.isWeekend(year, month, d);
      const dayName = CalendarEngine.getDayShortName(year, month, d);
      html += `<th class="excel-col-day ${isWeekend ? 'excel-day-weekend' : ''}">${dayName}</th>`;
    }
    if (isSecurity) {
      html += `<th></th><th></th><th></th><th></th>`;
    } else {
      html += `<th></th><th></th>`;
    }
    html += `</tr></thead><tbody>`;

    // Personel Satırları
    list.forEach(person => {
      const personRoster = period.roster[person.id] || {};
      const totals = CalculationEngine.calculatePersonnelTotals(person.id, year, month);

      html += `
        <tr>
          <td class="excel-col-name">${person.name}</td>
          <td class="excel-col-title">${person.title}</td>
      `;

      for (let d = 1; d <= daysInMonth; d++) {
        const isWeekend = CalendarEngine.isWeekend(year, month, d);
        const code = personRoster[d] || "";
        const formatted = this.formatCellForPrint(code);
        html += `<td class="excel-col-day ${isWeekend ? 'excel-day-weekend' : ''}">${formatted}</td>`;
      }

      if (isSecurity) {
        html += `
          <td class="excel-col-sec-work">${totals.workedDays}</td>
          <td class="excel-col-sec-night">${totals.nightDays}</td>
          <td class="excel-col-sec-leave">${totals.leaveDays}</td>
          <td class="excel-col-sec-hol">${totals.holidayWorkedDays}</td>
        `;
      } else {
        html += `
          <td class="excel-col-sum-work">${totals.workedDays}</td>
          <td class="excel-col-sum-leave">${totals.leaveDays}</td>
        `;
      }

      html += `</tr>`;
    });

    html += `</tbody></table>`;

    // 4. TABLO ALTI NOTLAR VE LEJANT
    html += `
      <div class="excel-bottom-notes-section">
        <div class="excel-notes-col">
    `;

    notes.forEach(n => {
      html += `<div class="excel-notes-text">• ${n}</div>`;
    });

    html += `
        </div>
        <div class="excel-legend-col">
          <table style="width: 100%; border-collapse: collapse; font-size: 6.2pt;">
            <tr>
              <td><strong>Y.İ:</strong> Yıllık İzin</td>
              <td><strong>Ü.İ:</strong> Ücretsiz İzin</td>
            </tr>
            <tr>
              <td><strong>H.T:</strong> Hafta Tatili</td>
              <td><strong>S.İ:</strong> Sendika İzni</td>
            </tr>
            <tr>
              <td><strong>RAP:</strong> Rapor (İstirahat)</td>
              <td><strong>R.T:</strong> Resmi Tatil</td>
            </tr>
            <tr>
              <td><strong>E.İ:</strong> Evlilik / Eğitim İzni</td>
              <td><strong>İ.İ:</strong> İdari İzin</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- 5. İMZALAR (EXCEL BİREBİR) -->
      <div class="excel-signatures-strip">
        <div class="excel-sig-box">
          <div class="excel-sig-role">HAZIRLAYAN</div>
          <div class="excel-sig-name">${AppState.config.signatures.preparedBy.name}</div>
          <div class="excel-sig-sub">${AppState.config.signatures.preparedBy.role}</div>
          <div class="excel-sig-line"></div>
        </div>

        <div class="excel-sig-box">
          <div class="excel-sig-role">Kontrol Eden</div>
          <div class="excel-sig-name">${AppState.config.signatures.checkedBy.name}</div>
          <div class="excel-sig-sub">${AppState.config.signatures.checkedBy.role}</div>
          <div class="excel-sig-line"></div>
        </div>

        <div class="excel-sig-box">
          <div class="excel-sig-role">Onaylayan</div>
          <div class="excel-sig-name">${AppState.config.signatures.approvedBy.name}</div>
          <div class="excel-sig-sub">${AppState.config.signatures.approvedBy.role}</div>
          <div class="excel-sig-line"></div>
        </div>
      </div>
    </div>
    `;

    return html;
  },

  openPreview() {
    const modal = document.getElementById("excelPreviewModal");
    const select = document.getElementById("previewDeptSelect");
    select.value = "current";
    this.refreshPreview();
    modal.style.display = "flex";
  },

  closePreview() {
    document.getElementById("excelPreviewModal").style.display = "none";
  },

  refreshPreview() {
    const select = document.getElementById("previewDeptSelect");
    const container = document.getElementById("excelPaperSheetContainer");
    container.innerHTML = this.generateHTML(select.value);
  },

  print(targetDeptId) {
    const printContainer = document.getElementById("officialPrintContainer");
    const dept = targetDeptId || (AppState.selectedDept === "all" ? "current" : AppState.selectedDept);
    printContainer.innerHTML = this.generateHTML(dept);
    window.print();
  }
};

// ==========================================================================
// ARAYÜZ VE TABLO OLUŞTURUCU (UI RENDERER)
// ==========================================================================
const UIRenderer = {
  init() {
    const logoEl = document.querySelector(".ministry-logo-img");
    if (logoEl && typeof MINISTRY_LOGO_DATA_URL !== "undefined") {
      logoEl.src = MINISTRY_LOGO_DATA_URL;
    }
    this.renderYearOptions();
    this.renderDepartmentTabs();
    this.attachEventListeners();
    this.render();
  },

  renderYearOptions() {
    const yearSelect = document.getElementById("yearSelect");
    yearSelect.innerHTML = "";
    // Puantaj sistemi 2026 yılından itibaren başlar (geçmiş yıllar kaldırılmıştır)
    for (let y = 2026; y <= 2035; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === AppState.selectedYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }

    const monthSelect = document.getElementById("monthSelect");
    monthSelect.value = AppState.selectedMonth;
  },

  renderDepartmentTabs() {
    const container = document.getElementById("deptTabsContainer");
    container.innerHTML = "";

    AppState.config.departments.forEach(dept => {
      const count = dept.id === "all" 
        ? AppState.personnel.filter(p => p.active).length
        : AppState.personnel.filter(p => p.active && p.dept === dept.id).length;

      const btn = document.createElement("button");
      btn.className = `dept-tab ${AppState.selectedDept === dept.id ? "active" : ""}`;
      btn.innerHTML = `
        <i class="bi ${dept.icon || 'bi-folder'}"></i>
        <span>${dept.name}</span>
        <span class="dept-badge">${count}</span>
      `;
      btn.addEventListener("click", () => {
        AppState.selectedDept = dept.id;
        document.querySelectorAll(".dept-tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        this.render();
      });
      container.appendChild(btn);
    });
  },

  getFilteredPersonnel() {
    return AppState.personnel.filter(p => {
      if (!p.active) return false;
      if (AppState.selectedDept !== "all" && p.dept !== AppState.selectedDept) return false;
      if (AppState.searchQuery) {
        const q = AppState.searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesTitle = p.title.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle) return false;
      }
      return true;
    });
  },

  render() {
    const year = AppState.selectedYear;
    const month = AppState.selectedMonth;
    const daysInMonth = CalendarEngine.getDaysInMonth(year, month);
    const period = CalendarEngine.ensurePeriod(year, month);
    const filteredPersonnel = this.getFilteredPersonnel();

    // 1. Resmi Üst Başlık Bilgilerini Güncelle
    const monthName = MONTH_NAMES[month - 1];
    const fullTitle = `${AppState.config.institution.facility} ${year} YILI ${monthName} AYI SÜREKLİ İŞÇİ PUANTAJ CETVELİ`;
    document.getElementById("officialTitleDisplay").textContent = fullTitle;
    document.getElementById("currentViewTitle").textContent = `${year} Yılı ${monthName} Ayı Puantaj Cetveli (${filteredPersonnel.length} Personel)`;

    // 2. Dashboard İstatistiklerini Güncelle
    const stats = CalculationEngine.calculateOverallStats(year, month, filteredPersonnel);
    document.getElementById("statTotalPersonnel").textContent = stats.totalPersonnel;
    document.getElementById("statTotalWorked").textContent = stats.totalWorked;
    document.getElementById("statTotalNight").textContent = stats.totalNight;
    document.getElementById("statTotalLeave").textContent = stats.totalLeave;

    // 3. Tablo Başlıklarını Oluştur
    const headerRow1 = document.getElementById("tableHeaderRow1");
    const headerRow2 = document.getElementById("tableHeaderRow2");
    
    while (headerRow1.children.length > 3) headerRow1.removeChild(headerRow1.lastChild);
    headerRow2.innerHTML = "";

    for (let day = 1; day <= daysInMonth; day++) {
      const isWeekend = CalendarEngine.isWeekend(year, month, day);
      const holiday = CalendarEngine.getHolidayInfo(year, month, day);
      const dayName = CalendarEngine.getDayShortName(year, month, day);

      const th1 = document.createElement("th");
      th1.className = `col-day ${isWeekend ? "day-weekend" : ""} ${holiday ? "day-holiday" : ""}`;
      th1.innerHTML = `<span class="day-header-num">${day}</span>`;
      if (holiday) th1.title = holiday.name;
      headerRow1.appendChild(th1);

      const th2 = document.createElement("th");
      th2.className = `col-day ${isWeekend ? "day-weekend" : ""} ${holiday ? "day-holiday" : ""}`;
      th2.innerHTML = `<span class="day-header-name">${dayName}</span>`;
      if (holiday) th2.title = holiday.name;
      headerRow2.appendChild(th2);
    }

    const isSecurityView = AppState.selectedDept === "guvenlik";
    
    const summaryHeaders = isSecurityView ? [
      { id: "col-work", title: "ÇALIŞTIĞI<br>GÜN", class: "summary-work" },
      { id: "col-night", title: "GECE<br>ÇALIŞMASI", class: "summary-night" },
      { id: "col-leave", title: "İZİN /<br>RAPOR", class: "summary-leave" },
      { id: "col-hol", title: "RESMİ TATİL<br>ÇALIŞMASI", class: "summary-holiday" }
    ] : [
      { id: "col-work", title: "ÇALIŞTIĞI<br>GÜN SAYISI", class: "summary-work" },
      { id: "col-leave", title: "RAPOR / İZİN<br>GÜN SAYISI", class: "summary-leave" }
    ];

    summaryHeaders.forEach(col => {
      const th1 = document.createElement("th");
      th1.rowSpan = 2;
      th1.className = `col-summary ${col.class}`;
      th1.innerHTML = col.title;
      headerRow1.appendChild(th1);
    });

    // 4. Tablo Satırlarını Oluştur
    const tbody = document.getElementById("puantajTableBody");
    tbody.innerHTML = "";

    filteredPersonnel.forEach((person, index) => {
      const tr = document.createElement("tr");
      const personRoster = period.roster[person.id] || {};

      // Sıra No
      const tdIndex = document.createElement("td");
      tdIndex.className = "col-sticky-1";
      tdIndex.textContent = index + 1;
      tr.appendChild(tdIndex);

      // Ad Soyad
      const tdName = document.createElement("td");
      tdName.className = "col-sticky-2";
      tdName.innerHTML = `
        <div class="person-name" title="${person.name}">${person.name}</div>
        ${person.note ? `<div class="person-duty-pill" title="${person.note}">Görevlendirme Notu Var</div>` : ""}
      `;
      tr.appendChild(tdName);

      // Ünvan
      const tdTitle = document.createElement("td");
      tdTitle.className = "col-sticky-3";
      tdTitle.innerHTML = `<div class="person-title" title="${person.title}">${person.title}</div>`;
      tr.appendChild(tdTitle);

      // Günler
      for (let day = 1; day <= daysInMonth; day++) {
        const tdDay = document.createElement("td");
        const isWeekend = CalendarEngine.isWeekend(year, month, day);
        const holiday = CalendarEngine.getHolidayInfo(year, month, day);
        tdDay.className = `col-day ${isWeekend ? "day-weekend" : ""} ${holiday ? "day-holiday" : ""}`;

        const code = (personRoster[day] || "").trim();
        if (code) {
          const shift = AppState.config.shiftDefinitions.find(s => s.code === code) || {
            label: code,
            color: "#f1f5f9",
            textColor: "#1e293b",
            border: "#cbd5e1"
          };

          const badge = document.createElement("div");
          badge.className = "cell-badge";
          badge.style.backgroundColor = shift.color;
          badge.style.color = shift.textColor;
          badge.style.borderColor = shift.border;
          badge.textContent = shift.label;
          badge.title = `${person.name} - Gün: ${day} (${shift.fullTitle || shift.label})`;

          badge.addEventListener("click", (e) => {
            e.stopPropagation();
            QuickPicker.open(person.id, day, e.currentTarget);
          });

          tdDay.appendChild(badge);
        } else {
          const empty = document.createElement("div");
          empty.className = "cell-empty";
          empty.title = `${person.name} - Gün: ${day} (Boş)`;
          empty.addEventListener("click", (e) => {
            e.stopPropagation();
            QuickPicker.open(person.id, day, e.currentTarget);
          });
          tdDay.appendChild(empty);
        }

        tr.appendChild(tdDay);
      }

      // Toplam Sütunları
      const totals = CalculationEngine.calculatePersonnelTotals(person.id, year, month);
      
      const tdWorked = document.createElement("td");
      tdWorked.className = "col-summary summary-work";
      tdWorked.textContent = totals.workedDays;
      tr.appendChild(tdWorked);

      if (isSecurityView) {
        const tdNight = document.createElement("td");
        tdNight.className = "col-summary summary-night";
        tdNight.textContent = totals.nightDays;
        tr.appendChild(tdNight);
      }

      const tdLeave = document.createElement("td");
      tdLeave.className = "col-summary summary-leave";
      tdLeave.textContent = totals.leaveDays;
      tr.appendChild(tdLeave);

      if (isSecurityView) {
        const tdHol = document.createElement("td");
        tdHol.className = "col-summary summary-holiday";
        tdHol.textContent = totals.holidayWorkedDays;
        tr.appendChild(tdHol);
      }

      tbody.appendChild(tr);
    });

    // 5. Dipnotları ve İmzaları Güncelle
    this.renderNotesAndSignatures(period, filteredPersonnel);
  },

  renderNotesAndSignatures(period, filteredPersonnel) {
    const notesContainer = document.getElementById("institutionalNotesList");
    notesContainer.innerHTML = "";

    const activeNotes = period.notes || AppState.config.legalNotes;
    activeNotes.forEach(n => {
      const li = document.createElement("li");
      li.textContent = n;
      notesContainer.appendChild(li);
    });

    const sigs = AppState.config.signatures;
    document.getElementById("sigPrepName").textContent = sigs.preparedBy.name;
    document.getElementById("sigPrepRole").textContent = sigs.preparedBy.role;

    document.getElementById("sigCheckName").textContent = sigs.checkedBy.name;
    document.getElementById("sigCheckRole").textContent = sigs.checkedBy.role;

    document.getElementById("sigApprName").textContent = sigs.approvedBy.name;
    document.getElementById("sigApprRole").textContent = sigs.approvedBy.role;
  },

  attachEventListeners() {
    document.getElementById("yearSelect").addEventListener("change", (e) => {
      Storage.save(); // Eski dönemi kaydet
      AppState.selectedYear = parseInt(e.target.value, 10);
      this.render();
    });

    document.getElementById("monthSelect").addEventListener("change", (e) => {
      Storage.save(); // Eski dönemi kaydet
      AppState.selectedMonth = parseInt(e.target.value, 10);
      this.render();
    });

    document.getElementById("searchPersonnelInput").addEventListener("input", (e) => {
      AppState.searchQuery = e.target.value.trim();
      this.render();
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#quickPickerPopover")) {
        QuickPicker.close();
      }
    });

    // Butonlar
    document.getElementById("btnSaveRoster").addEventListener("click", () => {
      Storage.save();
      const year = AppState.selectedYear;
      const monthName = MONTH_NAMES[AppState.selectedMonth - 1];
      const indicator = document.getElementById("saveStatusIndicator");
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      if (indicator) {
        indicator.innerHTML = `<i class="bi bi-check-circle-fill"></i> Kaydedildi (${timeStr})`;
      }
      alert(`✓ ${year} Yılı ${monthName} Ayı Puantaj Cetveli, Nöbetleri ve Notları Kalıcı Olarak Kaydedildi!`);
    });

    document.getElementById("btnEditNotes").addEventListener("click", () => NotesManager.openModal());
    document.getElementById("btnBatchFill").addEventListener("click", () => BatchFiller.openModal());
    document.getElementById("btnPersonnelMgr").addEventListener("click", () => PersonnelManager.openModal());
    document.getElementById("btnSettings").addEventListener("click", () => SettingsManager.openModal());
    document.getElementById("btnExportExcel").addEventListener("click", () => {
      if (typeof XlsxEngine !== "undefined") {
        XlsxEngine.exportXlsx(AppState.selectedDept === "all" ? "current" : AppState.selectedDept);
      } else {
        ExportManager.exportExcel(AppState.selectedDept === "all" ? "current" : AppState.selectedDept);
      }
    });
    document.getElementById("btnBackup").addEventListener("click", () => Storage.exportJSON());

    // Excel Önizleme ve Yazdırma
    document.getElementById("btnOpenExcelPreview").addEventListener("click", () => ExcelPrintManager.openPreview());
    document.getElementById("previewDeptSelect").addEventListener("change", () => ExcelPrintManager.refreshPreview());
    
    // Modal içinden doğrudan Excel İndir butonu
    const btnDownloadFromModal = document.getElementById("btnDownloadExcelFromModal");
    if (btnDownloadFromModal) {
      btnDownloadFromModal.addEventListener("click", () => {
        const targetDept = document.getElementById("previewDeptSelect").value;
        if (typeof XlsxEngine !== "undefined") {
          XlsxEngine.exportXlsx(targetDept);
        } else {
          ExportManager.exportExcel(targetDept);
        }
      });
    }

    document.getElementById("btnDirectPrintFromModal").addEventListener("click", () => {
      const targetDept = document.getElementById("previewDeptSelect").value;
      ExcelPrintManager.print(targetDept);
    });
    document.getElementById("btnPrintReport").addEventListener("click", () => {
      // Doğrudan yazdırma: Seçili birim bazında tek A4 sayfaya tam sığacak şekilde
      ExcelPrintManager.print(AppState.selectedDept === "all" ? "current" : AppState.selectedDept);
    });

    const fileInput = document.getElementById("restoreFileInput");
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (Storage.importJSON(event.target.result)) {
          alert("Puantaj verileri ve ayarlar başarıyla geri yüklendi!");
          this.render();
        } else {
          alert("Hata: Geçersiz yedek dosyası!");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("btnRestore").addEventListener("click", () => {
      fileInput.click();
    });

    document.getElementById("btnResetDefaults").addEventListener("click", () => {
      if (confirm("Tüm değişiklikler sıfırlanıp orijinal Üsküdar ADSM Nisan ve Mart 2024 verilerine dönülecektir. Onaylıyor musunuz?")) {
        Storage.resetToDefaults();
        this.render();
        alert("Sistem orijinal Üsküdar ADSM verilerine sıfırlandı.");
      }
    });
  }
};

// ==========================================================================
// HIZLI SEÇİCİ POPOVER (QUICK PICKER)
// ==========================================================================
const QuickPicker = {
  activePersonId: null,
  activeDay: null,

  open(personId, day, targetElement) {
    this.activePersonId = personId;
    this.activeDay = day;

    const popover = document.getElementById("quickPickerPopover");
    const person = AppState.personnel.find(p => p.id === personId);
    if (!person) return;

    document.getElementById("pickerPersonDisplay").textContent = `${person.name} (${day}. Gün)`;

    const rect = targetElement.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    let left = rect.left + scrollLeft - 100;
    let top = rect.bottom + scrollTop + 6;

    if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
    if (left < 10) left = 10;

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.display = "block";
  },

  close() {
    const popover = document.getElementById("quickPickerPopover");
    popover.style.display = "none";
    this.activePersonId = null;
    this.activeDay = null;
  },

  applyCode(code) {
    if (!this.activePersonId || !this.activeDay) return;

    const period = CalendarEngine.ensurePeriod(AppState.selectedYear, AppState.selectedMonth);
    if (!period.roster[this.activePersonId]) {
      period.roster[this.activePersonId] = {};
    }

    if (code) {
      period.roster[this.activePersonId][this.activeDay] = code;
    } else {
      delete period.roster[this.activePersonId][this.activeDay];
    }

    Storage.save();
    UIRenderer.render();
    this.close();
  },

  fillWeekdaysWithCurrent(code) {
    if (!this.activePersonId) return;

    const year = AppState.selectedYear;
    const month = AppState.selectedMonth;
    const daysInMonth = CalendarEngine.getDaysInMonth(year, month);
    const period = CalendarEngine.ensurePeriod(year, month);

    if (!period.roster[this.activePersonId]) {
      period.roster[this.activePersonId] = {};
    }

    for (let d = 1; d <= daysInMonth; d++) {
      if (!CalendarEngine.isWeekend(year, month, d)) {
        const holiday = CalendarEngine.getHolidayInfo(year, month, d);
        if (!holiday) {
          period.roster[this.activePersonId][d] = code;
        }
      }
    }

    Storage.save();
    UIRenderer.render();
    this.close();
  },

  fillWeekendsHT() {
    if (!this.activePersonId) return;

    const year = AppState.selectedYear;
    const month = AppState.selectedMonth;
    const daysInMonth = CalendarEngine.getDaysInMonth(year, month);
    const period = CalendarEngine.ensurePeriod(year, month);

    if (!period.roster[this.activePersonId]) {
      period.roster[this.activePersonId] = {};
    }

    for (let d = 1; d <= daysInMonth; d++) {
      if (CalendarEngine.isWeekend(year, month, d)) {
        period.roster[this.activePersonId][d] = "H.T.";
      }
    }

    Storage.save();
    UIRenderer.render();
    this.close();
  }
};

// ==========================================================================
// TOPLU DOLDURMA SİHİRBAZI
// ==========================================================================
const BatchFiller = {
  openModal() {
    const modal = document.getElementById("batchFillModal");
    const deptSelect = document.getElementById("batchDeptSelect");
    deptSelect.innerHTML = "";

    AppState.config.departments.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      deptSelect.appendChild(opt);
    });

    modal.style.display = "flex";
  },

  closeModal() {
    document.getElementById("batchFillModal").style.display = "none";
  },

  execute() {
    const dept = document.getElementById("batchDeptSelect").value;
    const workShift = document.getElementById("batchShiftSelect").value;
    const fillWeekends = document.getElementById("batchWeekendsCheck").checked;
    const fillHolidays = document.getElementById("batchHolidaysCheck").checked;

    const year = AppState.selectedYear;
    const month = AppState.selectedMonth;
    const daysInMonth = CalendarEngine.getDaysInMonth(year, month);
    const period = CalendarEngine.ensurePeriod(year, month);

    const targets = AppState.personnel.filter(p => p.active && (dept === "all" || p.dept === dept));

    targets.forEach(person => {
      if (!period.roster[person.id]) {
        period.roster[person.id] = {};
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const isWeekend = CalendarEngine.isWeekend(year, month, day);
        const holiday = CalendarEngine.getHolidayInfo(year, month, day);

        if (fillHolidays && holiday) {
          period.roster[person.id][day] = "R.T.";
        } else if (fillWeekends && isWeekend) {
          period.roster[person.id][day] = "H.T.";
        } else if (!isWeekend && !holiday) {
          period.roster[person.id][day] = workShift;
        }
      }
    });

    Storage.save();
    UIRenderer.render();
    this.closeModal();
    alert(`${targets.length} personel için puantaj cetveli başarıyla dolduruldu!`);
  }
};

// ==========================================================================
// PERSONEL YÖNETİM MODÜLÜ
// ==========================================================================
const PersonnelManager = {
  openModal() {
    const modal = document.getElementById("personnelModal");
    this.renderList();
    modal.style.display = "flex";
  },

  closeModal() {
    document.getElementById("personnelModal").style.display = "none";
  },

  renderList() {
    const container = document.getElementById("personnelListContainer");
    container.innerHTML = "";

    AppState.personnel.forEach(p => {
      const item = document.createElement("div");
      item.className = "stat-card";
      item.style.justifyContent = "space-between";
      item.style.marginBottom = "6px";

      item.innerHTML = `
        <div>
          <div style="font-weight: 700; color: #0f172a;">${p.name}</div>
          <div style="font-size: 11px; color: #64748b;">${p.title} • ${p.dept}</div>
          ${p.note ? `<div style="font-size: 9.5px; color: #7c3aed; margin-top: 2px;"><em>${p.note}</em></div>` : ""}
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="btn btn-secondary btn-sm" onclick="PersonnelManager.edit('${p.id}')">Düzenle</button>
          <button class="btn btn-sm" style="background: #fee2e2; color: #b91c1c;" onclick="PersonnelManager.delete('${p.id}')">Sil</button>
        </div>
      `;
      container.appendChild(item);
    });
  },

  saveNew() {
    const name = document.getElementById("newPersonName").value.trim();
    const title = document.getElementById("newPersonTitle").value.trim();
    const dept = document.getElementById("newPersonDept").value;
    const note = document.getElementById("newPersonNote").value.trim();

    if (!name || !title) {
      alert("Lütfen Ad Soyad ve Ünvan alanlarını doldurun!");
      return;
    }

    const newPerson = {
      id: "p_" + Date.now(),
      name,
      title,
      dept,
      tc: "",
      active: true,
      note: note || undefined
    };

    AppState.personnel.push(newPerson);
    Storage.save();
    UIRenderer.renderDepartmentTabs();
    UIRenderer.render();
    this.renderList();

    document.getElementById("newPersonName").value = "";
    document.getElementById("newPersonTitle").value = "";
    document.getElementById("newPersonNote").value = "";
    alert("Personel başarıyla kaydedildi!");
  },

  delete(id) {
    if (confirm("Bu personeli silmek istediğinize emin misiniz?")) {
      AppState.personnel = AppState.personnel.filter(p => p.id !== id);
      Storage.save();
      UIRenderer.renderDepartmentTabs();
      UIRenderer.render();
      this.renderList();
    }
  },

  edit(id) {
    const person = AppState.personnel.find(p => p.id === id);
    if (!person) return;

    const newName = prompt("Personel Adı Soyadı:", person.name);
    if (!newName) return;
    const newTitle = prompt("Ünvan:", person.title);
    if (!newTitle) return;
    const newNote = prompt("Geçici Görevlendirme / Makam Oluru Notu (İsteğe bağlı):", person.note || "");

    person.name = newName;
    person.title = newTitle;
    person.note = newNote || undefined;

    Storage.save();
    UIRenderer.render();
    this.renderList();
  }
};

// ==========================================================================
// AYARLAR VE İMZA YÖNETİCİSİ
// ==========================================================================
const SettingsManager = {
  openModal() {
    const modal = document.getElementById("settingsModal");
    const inst = AppState.config.institution;
    const sigs = AppState.config.signatures;

    // Kurum ve Tesis Bilgileri
    document.getElementById("cfgMinistry").value = inst.ministry || "T.C. SAĞLIK BAKANLIĞI";
    document.getElementById("cfgDirectorate").value = inst.directorate || "İSTANBUL İL SAĞLIK MÜDÜRLÜĞÜ";
    document.getElementById("cfgFacility").value = inst.facility || "ÜSKÜDAR AĞIZ VE DİŞ SAĞLIĞI MERKEZİ";
    document.getElementById("cfgSubTitle").value = inst.subTitle || "SÜREKLİ İŞÇİ PUANTAJ CETVELİ";

    // Kalite Doküman Bilgileri
    document.getElementById("cfgDocCode").value = inst.docCode || "KKU.FR.03";
    document.getElementById("cfgPubDate").value = inst.publishDate || "02.01.2020";
    document.getElementById("cfgRevDate").value = inst.revDate || "00";
    document.getElementById("cfgRevNo").value = inst.revNo || "00";

    // İmza Yetkilileri
    document.getElementById("cfgPrepName").value = sigs.preparedBy.name;
    document.getElementById("cfgPrepRole").value = sigs.preparedBy.role;

    document.getElementById("cfgCheckName").value = sigs.checkedBy.name;
    document.getElementById("cfgCheckRole").value = sigs.checkedBy.role;

    document.getElementById("cfgApprName").value = sigs.approvedBy.name;
    document.getElementById("cfgApprRole").value = sigs.approvedBy.role;

    modal.style.display = "flex";
  },

  closeModal() {
    document.getElementById("settingsModal").style.display = "none";
  },

  save() {
    const inst = AppState.config.institution;
    const sigs = AppState.config.signatures;

    // Kurum ve Tesis Bilgileri
    inst.ministry = document.getElementById("cfgMinistry").value.trim() || "T.C. SAĞLIK BAKANLIĞI";
    inst.directorate = document.getElementById("cfgDirectorate").value.trim() || "";
    inst.facility = document.getElementById("cfgFacility").value.trim() || "SAĞLIK TESİSİ";
    inst.subTitle = document.getElementById("cfgSubTitle").value.trim() || "SÜREKLİ İŞÇİ PUANTAJ CETVELİ";

    // Kalite Doküman Bilgileri
    inst.docCode = document.getElementById("cfgDocCode").value.trim() || "KKU.FR.03";
    inst.publishDate = document.getElementById("cfgPubDate").value.trim() || "";
    inst.revDate = document.getElementById("cfgRevDate").value.trim() || "00";
    inst.revNo = document.getElementById("cfgRevNo").value.trim() || "00";

    // İmza Yetkilileri
    sigs.preparedBy.name = document.getElementById("cfgPrepName").value.trim();
    sigs.preparedBy.role = document.getElementById("cfgPrepRole").value.trim();

    sigs.checkedBy.name = document.getElementById("cfgCheckName").value.trim();
    sigs.checkedBy.role = document.getElementById("cfgCheckRole").value.trim();

    sigs.approvedBy.name = document.getElementById("cfgApprName").value.trim();
    sigs.approvedBy.role = document.getElementById("cfgApprRole").value.trim();

    Storage.save();
    UIRenderer.render();
    this.closeModal();
    alert(`Kurumsal ayarlar ve imza bilgileri başarıyla güncellendi!\nAktif Kurum: ${inst.facility}`);
  },

  resetForNewInstitution() {
    const facility = document.getElementById("cfgFacility").value.trim() || "Yeni Sağlık Tesisi";
    if (confirm(`"${facility}" için boş şablon oluşturulacak.\nMevcut personel ve nöbet kayıtları temizlenerek temiz bir çalışma alanı açılacaktır. Onaylıyor musunuz?`)) {
      this.save();
      AppState.personnel = [];
      AppState.periods = {};
      Storage.save();
      UIRenderer.renderDepartmentTabs();
      UIRenderer.render();
      alert(`Yeni kurum (${facility}) için sistem temizlendi. Artık "Personel Yönetimi"nden kendi personelinizi ekleyebilirsiniz.`);
    }
  }
};

// ==========================================================================
// BU AYIN NOTLARINI DÜZENLEME MODÜLÜ (NOTES MANAGER)
// ==========================================================================
const NotesManager = {
  openModal() {
    const modal = document.getElementById("notesModal");
    const year = AppState.selectedYear;
    const month = AppState.selectedMonth;
    const monthName = MONTH_NAMES[month - 1];
    document.getElementById("notesModalTitle").textContent = `${year} Yılı ${monthName} Ayı Kurumsal ve Kanuni Notlarını Düzenle`;
    this.renderEditor();
    modal.style.display = "flex";
  },

  closeModal() {
    document.getElementById("notesModal").style.display = "none";
  },

  renderEditor() {
    const period = CalendarEngine.ensurePeriod(AppState.selectedYear, AppState.selectedMonth);
    const notes = period.notes || (AppState.config.legalNotes ? [...AppState.config.legalNotes] : []);
    const container = document.getElementById("notesListEditor");
    container.innerHTML = "";

    notes.forEach((note, idx) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "6px";
      row.style.alignItems = "center";

      row.innerHTML = `
        <span style="font-weight: bold; width: 22px; text-align: right; color: var(--navy); font-size: 11px;">${idx + 1}.</span>
        <input type="text" class="form-control note-item-input" value="${note.replace(/"/g, '&quot;')}" style="flex: 1; font-size: 11.5px;">
        <button type="button" class="btn btn-sm" style="background: #fee2e2; color: #b91c1c; padding: 4px 8px;" onclick="NotesManager.deleteNote(${idx})" title="Bu notu sil">
          <i class="bi bi-trash"></i>
        </button>
      `;
      container.appendChild(row);
    });
  },

  addNote() {
    const input = document.getElementById("newNoteInput");
    const val = input.value.trim();
    if (!val) return;

    const period = CalendarEngine.ensurePeriod(AppState.selectedYear, AppState.selectedMonth);
    if (!period.notes) period.notes = [];
    period.notes.push(val);
    input.value = "";
    this.renderEditor();
  },

  deleteNote(idx) {
    const period = CalendarEngine.ensurePeriod(AppState.selectedYear, AppState.selectedMonth);
    if (period.notes) {
      period.notes.splice(idx, 1);
      this.renderEditor();
    }
  },

  saveNotes() {
    const period = CalendarEngine.ensurePeriod(AppState.selectedYear, AppState.selectedMonth);
    const inputs = document.querySelectorAll(".note-item-input");
    const newNotes = [];
    inputs.forEach(inp => {
      const v = inp.value.trim();
      if (v) newNotes.push(v);
    });

    period.notes = newNotes;
    Storage.save();
    UIRenderer.render();
    this.closeModal();
    alert(`✓ ${AppState.selectedYear} ${MONTH_NAMES[AppState.selectedMonth - 1]} ayı kurumsal notları başarıyla kaydedildi!`);
  },

  resetToLegalDefaults() {
    if (confirm("Bu ayın notları standart 4857 Sayılı Kanun ve TİS maddelerine sıfırlanacaktır. Onaylıyor musunuz?")) {
      const period = CalendarEngine.ensurePeriod(AppState.selectedYear, AppState.selectedMonth);
      period.notes = [
        "1.- Kurumumuzda günlük çalışmalar 7,5 (yedi buçuk) saatten fazla olduğu için 1 (bir) saat ara dinlenme uygulanmaktadır. Haftalık çalışma saati 45 (kırk beş) saattir.",
        "2.- 05.06.2023 tarihinde imzalanan İşletme Toplu İş Sözleşmesi (TİS) kapsamında çalışan personele yemek molası ve ara dinlenme uygulanmaktadır."
      ];
      this.renderEditor();
    }
  }
};

// ==========================================================================
// RESMİ VE BİÇİMLENDİRİLMİŞ EXCEL (.XLS) MOTORU (ÖNİZLEME İLE BİREBİR ŞABLON)
// ==========================================================================
const ExportManager = {
  exportExcel(targetDeptId) {
    const year = AppState.selectedYear;
    const month = AppState.selectedMonth;
    const monthName = MONTH_NAMES[month - 1];
    const daysInMonth = CalendarEngine.getDaysInMonth(year, month);
    const period = CalendarEngine.ensurePeriod(year, month);

    // Birim Belirleme
    let actualDept = targetDeptId || AppState.selectedDept;
    if (actualDept === "current") {
      actualDept = AppState.selectedDept === "all" ? "klinik" : AppState.selectedDept;
    }

    let list = AppState.personnel.filter(p => p.active);
    let deptTitle = "Genel";
    if (actualDept && actualDept !== "all") {
      list = list.filter(p => p.dept === actualDept);
      const deptObj = AppState.config.departments.find(d => d.id === actualDept);
      deptTitle = deptObj ? deptObj.name : actualDept;
    }
    const isSecurity = actualDept === "guvenlik";

    const totalCols = 2 + daysInMonth + (isSecurity ? 4 : 2);
    const inst = AppState.config.institution;
    const sigs = AppState.config.signatures;
    const notes = period.notes || AppState.config.legalNotes;

    // Logo Base64 ayıklama ve RFC 2045 standardında (76 karakterde bir satır sonu) parçalama
    const rawLogoBase64 = (typeof MINISTRY_LOGO_DATA_URL !== "undefined" && MINISTRY_LOGO_DATA_URL)
      ? MINISTRY_LOGO_DATA_URL.replace(/^data:image\/[a-z]+;base64,/, "")
      : "";
    // Excel MIME parser'ının 133KB tek satır veriyi bozmaması için 76 karaktere bölüyoruz
    const chunkedLogoBase64 = rawLogoBase64 ? rawLogoBase64.match(/.{1,76}/g).join("\r\n") : "";

    const boundary = "----=_NextPart_01DC_PUANTAJ_ADSM_OFFICIAL";

    // Colgroup tanımları: Excel'in sütunları daraltmasını (### hatasını) kesin olarak engeller
    let colGroupHTML = `
    <colgroup>
      <col width="140" style="mso-width-source:userset;mso-width-alt:5120;width:105pt">
      <col width="120" style="mso-width-source:userset;mso-width-alt:4388;width:90pt">
    `;
    for (let d = 1; d <= daysInMonth; d++) {
      colGroupHTML += `      <col width="68" style="mso-width-source:userset;mso-width-alt:2486;width:51pt">\n`;
    }
    if (isSecurity) {
      colGroupHTML += `
      <col width="65" style="mso-width-source:userset;mso-width-alt:2377;width:49pt">
      <col width="65" style="mso-width-source:userset;mso-width-alt:2377;width:49pt">
      <col width="65" style="mso-width-source:userset;mso-width-alt:2377;width:49pt">
      <col width="65" style="mso-width-source:userset;mso-width-alt:2377;width:49pt">
      `;
    } else {
      colGroupHTML += `
      <col width="85" style="mso-width-source:userset;mso-width-alt:3108;width:64pt">
      <col width="85" style="mso-width-source:userset;mso-width-alt:3108;width:64pt">
      `;
    }
    colGroupHTML += `    </colgroup>\n`;

    const centerTitleSpan = daysInMonth + (isSecurity ? 2 : 0);
    const rightSpacerSpan = isSecurity ? 2 : 2;

    let tableBodyHTML = `
  <table border="0" cellspacing="0" cellpadding="2" style="border-collapse: collapse; table-layout: fixed; font-family: Calibri, Arial, sans-serif; width: 100%;">
${colGroupHTML}

    <!-- 1. ÜST ANTET & LOGO & BAŞLIK (EXCEL ŞABLON ÖNİZLEME İLE BİREBİR) -->
    <tr style="height: 22pt;">
      <td rowspan="3" colspan="2" style="text-align: center; vertical-align: middle; border: none;">
        <!--[if gte vml 1]>
        <v:shape id="MinistryLogo" type="#_x0000_t75" style="width:48pt;height:48pt;position:relative;z-index:1;" filled="f" stroked="f">
          <v:imagedata src="ministry_logo.png" o:title="T.C. Sağlık Bakanlığı"/>
        </v:shape>
        <![endif]-->
        <![if !vml]>
        <img src="ministry_logo.png" width="55" height="55" alt="T.C. Sağlık Bakanlığı">
        <![endif]>
      </td>
      <td colspan="${centerTitleSpan}" style="font-size: 11pt; font-weight: bold; text-align: center; vertical-align: middle; border: none; font-family: Calibri, sans-serif;">
        ${inst.ministry}
      </td>
      <td rowspan="3" colspan="${rightSpacerSpan}" style="border: none;">&nbsp;</td>
    </tr>
    <tr style="height: 22pt;">
      <td colspan="${centerTitleSpan}" style="font-size: 12pt; font-weight: bold; text-align: center; vertical-align: middle; border: none; font-family: Calibri, sans-serif;">
        ${inst.facility}
      </td>
    </tr>
    <tr style="height: 20pt;">
      <td colspan="${centerTitleSpan}" style="font-size: 10.5pt; font-weight: bold; text-align: center; vertical-align: middle; border: none; font-family: Calibri, sans-serif;">
        ${year} YILI ${monthName} AYI ${inst.subTitle}
      </td>
    </tr>

    <!-- 2. DOKÜMAN KODU VE KALİTE ŞERİDİ (KKU.FR.03) -->
    <tr style="height: 18pt;">
      <td colspan="${totalCols}" style="font-size: 8pt; font-weight: bold; text-align: center; vertical-align: middle; background-color: #f8fafc; border-top: 1pt solid #000000; border-bottom: 1pt solid #000000; border-left: none; border-right: none;">
        DOK. KOD: ${inst.docCode}&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
        YAY. TAR: ${inst.publishDate}&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
        REV. TAR: ${inst.revDate}&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
        REV. NO: ${inst.revNo}&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
        SAYFA: ${inst.pageNo}
      </td>
    </tr>
    <tr style="height: 4pt;"><td colspan="${totalCols}" style="border: none;">&nbsp;</td></tr>

    <!-- 3. ANA TABLO BAŞLIKLARI (1. Satır: Günler, 2. Satır: Gün İsimleri) -->
    <tr style="height: 20pt;">
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8pt; width: 140px;">Ad Soyad</th>
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8pt; width: 120px;">Ünvan</th>
`;

    for (let d = 1; d <= daysInMonth; d++) {
      const isWeekend = CalendarEngine.isWeekend(year, month, d);
      tableBodyHTML += `      <th style="background-color: ${isWeekend ? '#cbd5e1' : '#f2f2f2'}; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8pt;">${d}</th>\n`;
    }

    if (isSecurity) {
      tableBodyHTML += `
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; width: 65px;">ÇALIŞTIĞI<br>GÜN</th>
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; width: 65px;">GECE<br>ÇALIŞ.</th>
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; width: 65px;">İZİN<br>RAPOR</th>
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; width: 65px;">RESMİ<br>TATİL</th>
      `;
    } else {
      tableBodyHTML += `
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; width: 85px;">ÇALIŞTIĞI<br>GÜN SAYISI</th>
      <th rowspan="2" style="background-color: #f2f2f2; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; width: 85px;">RAPOR / İZİN<br>GÜN SAYISI</th>
      `;
    }

    tableBodyHTML += `    </tr><tr style="height: 16pt;">\n`;

    for (let d = 1; d <= daysInMonth; d++) {
      const isWeekend = CalendarEngine.isWeekend(year, month, d);
      const dayName = CalendarEngine.getDayShortName(year, month, d);
      tableBodyHTML += `      <th style="background-color: ${isWeekend ? '#cbd5e1' : '#f2f2f2'}; font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt;">${dayName}</th>\n`;
    }
    tableBodyHTML += `    </tr>\n`;

    // 4. PERSONEL SATIRLARI
    list.forEach(person => {
      const personRoster = period.roster[person.id] || {};
      const totals = CalculationEngine.calculatePersonnelTotals(person.id, year, month);

      tableBodyHTML += `    <tr style="height: 28pt;">\n`;
      tableBodyHTML += `      <td x:str style="font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8pt; mso-number-format:'\\@';">${person.name}</td>\n`;
      tableBodyHTML += `      <td x:str style="text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; mso-number-format:'\\@';">${person.title}</td>\n`;

      for (let d = 1; d <= daysInMonth; d++) {
        const isWeekend = CalendarEngine.isWeekend(year, month, d);
        const code = (personRoster[d] || "").trim();
        let displayCode = code;
        if (code.includes(" - ")) {
          const parts = code.split(" - ");
          displayCode = parts[0] + '<br style="mso-data-placement:same-cell;"/>' + parts[1];
        }
        const isStatus = ["H.T.", "R.T.", "Y.İ.", "RAP", "İ.İ."].includes(code);
        const boldStyle = isStatus ? "font-weight: bold;" : "";
        const bgStyle = isWeekend ? "background-color: #cbd5e1;" : "";

        tableBodyHTML += `      <td x:str style="text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 7.5pt; mso-number-format:'\\@'; white-space: normal; ${bgStyle} ${boldStyle}">${displayCode || '&nbsp;'}</td>\n`;
      }

      tableBodyHTML += `      <td x:num style="font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8.5pt; background-color: #f8fafc; mso-number-format:'0';">${totals.workedDays}</td>\n`;
      if (isSecurity) {
        tableBodyHTML += `      <td x:num style="font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8.5pt; background-color: #f8fafc; mso-number-format:'0';">${totals.nightDays}</td>\n`;
      }
      tableBodyHTML += `      <td x:num style="font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8.5pt; background-color: #f8fafc; mso-number-format:'0';">${totals.leaveDays}</td>\n`;
      if (isSecurity) {
        tableBodyHTML += `      <td x:num style="font-weight: bold; text-align: center; vertical-align: middle; border: 0.5pt solid #000000; font-size: 8.5pt; background-color: #f8fafc; mso-number-format:'0';">${totals.holidayWorkedDays}</td>\n`;
      }

      tableBodyHTML += `    </tr>\n`;
    });

    tableBodyHTML += `    <tr style="height: 8pt;"><td colspan="${totalCols}" style="border: none;">&nbsp;</td></tr>\n`;

    // 5. TABLO ALTI NOTLAR VE LEJANT (ÖNİZLEME İLE BİREBİR)
    const leftCols = Math.floor(totalCols * 0.58);
    const rightCols = totalCols - leftCols;

    tableBodyHTML += `
    <tr>
      <td colspan="${leftCols}" style="border: 0.5pt solid #000000; vertical-align: top; padding: 6px; font-size: 7.5pt; text-align: left; background-color: #ffffff;">
        <strong>Kurumsal ve Kanuni Notlar:</strong><br>
    `;

    notes.forEach(n => {
      tableBodyHTML += `        • ${n}<br>\n`;
    });

    tableBodyHTML += `      </td>
      <td colspan="${rightCols}" style="border: 0.5pt solid #000000; vertical-align: top; padding: 6px; font-size: 7pt; text-align: left; background-color: #ffffff;">
        <strong>Puantaj Durum Kodları (Lejant):</strong><br>
        <table style="width: 100%; border-collapse: collapse; font-size: 7pt; border: none;">
          <tr>
            <td style="border: none; padding: 1px;"><strong>Y.İ:</strong> Yıllık İzin</td>
            <td style="border: none; padding: 1px;"><strong>Ü.İ.:</strong> Ücretsiz İzin</td>
          </tr>
          <tr>
            <td style="border: none; padding: 1px;"><strong>H.T:</strong> Hafta Tatili</td>
            <td style="border: none; padding: 1px;"><strong>S.İ.:</strong> Sendika İzni</td>
          </tr>
          <tr>
            <td style="border: none; padding: 1px;"><strong>RAP:</strong> Rapor (İstirahat)</td>
            <td style="border: none; padding: 1px;"><strong>R.T.:</strong> Resmi Tatil</td>
          </tr>
          <tr>
            <td style="border: none; padding: 1px;"><strong>E.İ.:</strong> Evlilik / Eğitim İzni</td>
            <td style="border: none; padding: 1px;"><strong>İ.İ.:</strong> İdari İzin</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr style="height: 14pt;"><td colspan="${totalCols}" style="border: none;">&nbsp;</td></tr>

    <!-- 6. İMZALAR (ÖNİZLEME İLE BİREBİR 3 KUTULU RESMİ İMZA) -->
    <tr style="height: 18pt;">
      <td colspan="${Math.floor(totalCols / 3)}" style="text-align: center; font-weight: bold; font-size: 9pt; border: none;">HAZIRLAYAN</td>
      <td colspan="${Math.floor(totalCols / 3)}" style="text-align: center; font-weight: bold; font-size: 9pt; border: none;">Kontrol Eden</td>
      <td colspan="${totalCols - 2 * Math.floor(totalCols / 3)}" style="text-align: center; font-weight: bold; font-size: 9pt; border: none;">Onaylayan</td>
    </tr>
    <tr style="height: 18pt;">
      <td colspan="${Math.floor(totalCols / 3)}" style="text-align: center; font-weight: bold; font-size: 9.5pt; border: none;">${sigs.preparedBy.name}</td>
      <td colspan="${Math.floor(totalCols / 3)}" style="text-align: center; font-weight: bold; font-size: 9.5pt; border: none;">${sigs.checkedBy.name}</td>
      <td colspan="${totalCols - 2 * Math.floor(totalCols / 3)}" style="text-align: center; font-weight: bold; font-size: 9.5pt; border: none;">${sigs.approvedBy.name}</td>
    </tr>
    <tr style="height: 16pt;">
      <td colspan="${Math.floor(totalCols / 3)}" style="text-align: center; font-size: 8pt; border: none;">${sigs.preparedBy.role}</td>
      <td colspan="${Math.floor(totalCols / 3)}" style="text-align: center; font-size: 8pt; border: none;">${sigs.checkedBy.role}</td>
      <td colspan="${totalCols - 2 * Math.floor(totalCols / 3)}" style="text-align: center; font-size: 8pt; border: none;">${sigs.approvedBy.role}</td>
    </tr>
    <tr style="height: 10pt;">
      <td colspan="${Math.floor(totalCols / 3)}" style="border-bottom: 1pt solid #666; border-top: none; border-left: none; border-right: none;">&nbsp;</td>
      <td colspan="${Math.floor(totalCols / 3)}" style="border-bottom: 1pt solid #666; border-top: none; border-left: none; border-right: none;">&nbsp;</td>
      <td colspan="${totalCols - 2 * Math.floor(totalCols / 3)}" style="border-bottom: 1pt solid #666; border-top: none; border-left: none; border-right: none;">&nbsp;</td>
    </tr>
  </table>
`;

    // MHTML Zarfı: Microsoft Excel'in logoyu ve stilleri eksiksiz görüntülemesini sağlar
    const mhtmlDoc = `MIME-Version: 1.0\r
X-Document-Type: Workbook\r
Content-Type: multipart/related; boundary="${boundary}"\r
\r
--${boundary}\r
Content-Location: file:///C:/puantaj.htm\r
Content-Transfer-Encoding: 8bit\r
Content-Type: text/html; charset="utf-8"\r
\r
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
    </o:OfficeDocumentSettings>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${deptTitle}_${year}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Orientation>Landscape</x:Orientation>
            <x:FitToPage/>
            <x:Print>
              <x:FitWidth>1</x:FitWidth>
              <x:FitHeight>1</x:FitHeight>
              <x:PaperSizeIndex>9</x:PaperSizeIndex>
              <x:ValidPrinterInfo/>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <!--[if gte vml 1]>
  <v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f">
   <v:stroke joinstyle="miter"/>
   <v:formulas>
    <v:f eqn="if lineDrawn pixelLineWidth 0"/>
    <v:f eqn="sum @0 1 0"/>
    <v:f eqn="sum 0 0 @1"/>
    <v:f eqn="prod @2 1 2"/>
    <v:f eqn="prod @3 21600 pixelWidth"/>
    <v:f eqn="prod @3 21600 pixelHeight"/>
    <v:f eqn="sum @0 0 1"/>
    <v:f eqn="prod @6 1 2"/>
    <v:f eqn="prod @7 21600 pixelWidth"/>
    <v:f eqn="sum @8 21600 0"/>
    <v:f eqn="prod @7 21600 pixelHeight"/>
    <v:f eqn="sum @10 21600 0"/>
   </v:formulas>
   <v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/>
   <o:lock v:ext="edit" aspectratio="t"/>
  </v:shapetype>
  <![endif]-->
  <style>
    v\\:* {behavior:url(#default#VML);}
    o\\:* {behavior:url(#default#VML);}
    x\\:* {behavior:url(#default#VML);}
    .shape {behavior:url(#default#VML);}
    body { font-family: Calibri, Arial, sans-serif; font-size: 8pt; margin: 0; padding: 0; }
  </style>
</head>
<body>
${tableBodyHTML}
</body>
</html>\r
\r
--${boundary}\r
Content-Location: ministry_logo.png\r
Content-ID: <ministry_logo.png>\r
Content-Transfer-Encoding: base64\r
Content-Type: image/png\r
\r
${chunkedLogoBase64}\r
\r
--${boundary}--\r
`;

    const blob = new Blob([mhtmlDoc], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeFacility = inst.facility.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]/g, "_");
    const safeDept = deptTitle.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]/g, "_");
    a.download = `${safeFacility}_${safeDept}_Puantaj_${year}_${monthName}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Başlat
document.addEventListener("DOMContentLoaded", () => {
  Storage.init();
  UIRenderer.init();
});
