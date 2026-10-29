/**
 * T.C. SAĞLIK BAKANLIĞI - ÜSKÜDAR ADSM
 * Doğal OpenXML (.XLSX) Motoru ve Resim Gömücü
 * Gerçek Microsoft Excel Belgesi (.xlsx) Üretir (Logosu İçinde Gömülüdür, Çarpı [X] Olmaz)
 */

(function(global) {
  // 1. CRC32 Tablosu ve Hesaplayıcı
  const CRC_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c;
  }

  function crc32(uint8) {
    let c = 0 ^ (-1);
    for (let i = 0; i < uint8.length; i++) {
      c = (c >>> 8) ^ CRC_TABLE[(c ^ uint8[i]) & 0xFF];
    }
    return (c ^ (-1)) >>> 0;
  }

  const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  function base64ToUint8(base64Str) {
    const clean = base64Str.replace(/^data:image\/[a-z]+;base64,/, '').replace(/[^A-Za-z0-9+/=]/g, '');
    let bufferLength = Math.floor(clean.length * 0.75);
    if (clean[clean.length - 1] === '=') bufferLength--;
    if (clean[clean.length - 2] === '=') bufferLength--;

    const bytes = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < clean.length; i += 4) {
      const enc1 = B64_CHARS.indexOf(clean[i]);
      const enc2 = B64_CHARS.indexOf(clean[i + 1]);
      const enc3 = B64_CHARS.indexOf(clean[i + 2]);
      const enc4 = B64_CHARS.indexOf(clean[i + 3]);

      bytes[p++] = (enc1 << 2) | (enc2 >> 4);
      if (enc3 !== 64 && enc3 !== -1 && p < bufferLength) {
        bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
      }
      if (enc4 !== 64 && enc4 !== -1 && p < bufferLength) {
        bytes[p++] = ((enc3 & 3) << 6) | enc4;
      }
    }
    return bytes;
  }

  function strToUint8(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    const utf8 = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      }
    }
    return new Uint8Array(utf8);
  }

  // 2. Saf JavaScript İle ZIP Arşiv Oluşturucu (Store Method 0 - Sıkıştırmasız Standart Zip)
  class SimpleZip {
    constructor() {
      this.entries = [];
    }

    addFile(name, data) {
      const uint8 = (data instanceof Uint8Array) ? data : strToUint8(data);
      this.entries.push({
        name: name.replace(/\\/g, '/'),
        data: uint8,
        crc: crc32(uint8),
        size: uint8.length
      });
    }

    build() {
      const chunks = [];
      let centralOffset = 0;
      const centralChunks = [];

      for (const f of this.entries) {
        const nameBytes = strToUint8(f.name);

        // Local Header
        const lh = new Uint8Array(30);
        const lv = new DataView(lh.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true); // STORE
        lv.setUint16(10, 0, true);
        lv.setUint16(12, 0, true);
        lv.setUint32(14, f.crc, true);
        lv.setUint32(18, f.size, true);
        lv.setUint32(22, f.size, true);
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);

        chunks.push(lh, nameBytes, f.data);

        // Central Directory Header
        const ch = new Uint8Array(46);
        const cv = new DataView(ch.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0, true);
        cv.setUint32(16, f.crc, true);
        cv.setUint32(20, f.size, true);
        cv.setUint32(24, f.size, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, centralOffset, true);

        centralChunks.push(ch, nameBytes);

        centralOffset += lh.length + nameBytes.length + f.data.length;
      }

      const cdOffset = centralOffset;
      let cdSize = 0;
      centralChunks.forEach(c => cdSize += c.length);

      const eocd = new Uint8Array(22);
      const ev = new DataView(eocd.buffer);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(4, 0, true);
      ev.setUint16(6, 0, true);
      ev.setUint16(8, this.entries.length, true);
      ev.setUint16(10, this.entries.length, true);
      ev.setUint32(12, cdSize, true);
      ev.setUint32(16, cdOffset, true);
      ev.setUint16(20, 0, true);

      const all = [...chunks, ...centralChunks, eocd];
      let totalLen = 0;
      all.forEach(c => totalLen += c.length);
      const result = new Uint8Array(totalLen);
      let pos = 0;
      for (const c of all) {
        result.set(c, pos);
        pos += c.length;
      }
      return result;
    }
  }

  function colToLetter(col) {
    let temp, letter = '';
    while (col > 0) {
      temp = (col - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      col = (col - temp - 1) / 26;
    }
    return letter;
  }

  function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const MONTH_NAMES = [
    "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
    "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"
  ];

  // 3. Gerçek .XLSX Dosyası Üreticisi
  const XlsxEngine = {
    exportXlsx(targetDeptId) {
      const year = AppState.selectedYear;
      const month = AppState.selectedMonth;
      const monthName = MONTH_NAMES[month - 1];
      const daysInMonth = CalendarEngine.getDaysInMonth(year, month);
      const period = CalendarEngine.ensurePeriod(year, month);

      // Birim belirleme
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

      // Logo Byte'ları
      const rawLogo = (typeof MINISTRY_LOGO_DATA_URL !== "undefined" && MINISTRY_LOGO_DATA_URL) ? MINISTRY_LOGO_DATA_URL : "";
      const logoBytes = rawLogo ? base64ToUint8(rawLogo) : new Uint8Array(0);

      const zip = new SimpleZip();

      // [Content_Types].xml
      zip.addFile('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
</Types>`);

      // _rels/.rels
      zip.addFile('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

      // xl/_rels/workbook.xml.rels
      zip.addFile('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

      // xl/workbook.xml
      zip.addFile('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(deptTitle.substring(0, 31))}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

      // xl/styles.xml
      zip.addFile('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="9">
    <font><sz val="10"/><name val="Calibri"/></font> <!-- 0: default -->
    <font><b/><sz val="12"/><color rgb="FF000000"/><name val="Calibri"/></font> <!-- 1: Ministry -->
    <font><b/><sz val="13"/><color rgb="FF000000"/><name val="Calibri"/></font> <!-- 2: Facility -->
    <font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font> <!-- 3: Period -->
    <font><b/><sz val="8.5"/><name val="Calibri"/></font> <!-- 4: TH Header & Name Bold -->
    <font><sz val="7.5"/><name val="Calibri"/></font> <!-- 5: Cell Normal -->
    <font><b/><sz val="8"/><name val="Calibri"/></font> <!-- 6: Meta bar & Sum bold -->
    <font><b/><sz val="9"/><name val="Calibri"/></font> <!-- 7: Sig Role -->
    <font><b/><sz val="9.5"/><name val="Calibri"/></font> <!-- 8: Sig Name -->
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill> <!-- 0 -->
    <fill><patternFill patternType="gray125"/></fill> <!-- 1 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFCBD5E1"/></patternFill></fill> <!-- 2: Hafta Sonu Grisi -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/></patternFill></fill> <!-- 3: Başlık Açık Gri -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill> <!-- 4: Meta Bar & Özet -->
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/></border> <!-- 0: Yok -->
    <border> <!-- 1: 4 Taraf İnce Siyah -->
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
    </border>
    <border> <!-- 2: Üst ve Alt İnce Siyah -->
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
    </border>
    <border> <!-- 3: Alt İmza Çizgisi -->
      <bottom style="thin"><color rgb="FF666666"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="18">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/> <!-- 0 -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 1: Ministry -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 2: Facility -->
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 3: Period -->
    <xf numFmtId="0" fontId="6" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 4: Meta Bar -->
    <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 5: TH Col -->
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 6: TH Hafta Sonu -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 7: İsim -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 8: Ünvan -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf> <!-- 9: Gün Çalışma -->
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 10: Gün Hafta Sonu -->
    <xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 11: Toplam -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf> <!-- 12: Notlar -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf> <!-- 13: Lejant -->
    <xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 14: İmza Rol -->
    <xf numFmtId="0" fontId="8" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 15: İmza İsim -->
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 16: İmza Ünvan -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf> <!-- 17: İmza Çizgisi -->
  </cellXfs>
</styleSheet>`);

      // xl/worksheets/_rels/sheet1.xml.rels
      zip.addFile('xl/worksheets/_rels/sheet1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`);

      // xl/drawings/_rels/drawing1.xml.rels
      zip.addFile('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`);

      // xl/media/image1.png (Gerçek Bakanlık Amblemi)
      zip.addFile('xl/media/image1.png', logoBytes);

      // xl/drawings/drawing1.xml (A1:A3 İçine Mükemmel 1:1 Yuvarlak Oranlı Logo)
      zip.addFile('xl/drawings/drawing1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:twoCellAnchor editAs="oneCell">
    <xdr:from>
      <xdr:col>0</xdr:col>
      <xdr:colOff>180000</xdr:colOff>
      <xdr:row>0</xdr:row>
      <xdr:rowOff>40000</xdr:rowOff>
    </xdr:from>
    <xdr:to>
      <xdr:col>0</xdr:col>
      <xdr:colOff>1130000</xdr:colOff>
      <xdr:row>2</xdr:row>
      <xdr:rowOff>440000</xdr:rowOff>
    </xdr:to>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="2" name="BakanlikLogo"/>
        <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/>
        <a:stretch><a:fillRect/></a:stretch>
      </xdr:blipFill>
      <xdr:spPr>
        <a:xfrm><a:off x="180000" y="40000"/><a:ext cx="950000" cy="950000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`);

      // xl/worksheets/sheet1.xml
      const isW = (d) => CalendarEngine.isWeekend(year, month, d);
      const getDayName = (d) => CalendarEngine.getDayShortName(year, month, d);

      const merges = [];
      const centerEndCol = 2 + daysInMonth + (isSecurity ? 2 : 0);
      const lastColLetter = colToLetter(totalCols);

      merges.push(`C1:${colToLetter(centerEndCol)}1`);
      merges.push(`C2:${colToLetter(centerEndCol)}2`);
      merges.push(`C3:${colToLetter(centerEndCol)}3`);
      merges.push(`A4:${lastColLetter}4`); // Meta bar

      merges.push(`A6:A7`); // Ad Soyad
      merges.push(`B6:B7`); // Ünvan

      if (isSecurity) {
        merges.push(`${colToLetter(totalCols - 3)}6:${colToLetter(totalCols - 3)}7`);
        merges.push(`${colToLetter(totalCols - 2)}6:${colToLetter(totalCols - 2)}7`);
        merges.push(`${colToLetter(totalCols - 1)}6:${colToLetter(totalCols - 1)}7`);
        merges.push(`${colToLetter(totalCols)}6:${colToLetter(totalCols)}7`);
      } else {
        merges.push(`${colToLetter(totalCols - 1)}6:${colToLetter(totalCols - 1)}7`);
        merges.push(`${colToLetter(totalCols)}6:${colToLetter(totalCols)}7`);
      }

      let sheetData = '';

      // Row 1: Ministry Title
      sheetData += `<row r="1" ht="24" customHeight="1">
        <c r="C1" s="1" t="inlineStr"><is><t>${escapeXml(inst.ministry)}</t></is></c>
      </row>`;

      // Row 2: Facility Title
      sheetData += `<row r="2" ht="26" customHeight="1">
        <c r="C2" s="2" t="inlineStr"><is><t>${escapeXml(inst.facility)}</t></is></c>
      </row>`;

      // Row 3: Period Title
      sheetData += `<row r="3" ht="24" customHeight="1">
        <c r="C3" s="3" t="inlineStr"><is><t>${year} YILI ${monthName} AYI ${escapeXml(inst.subTitle)}</t></is></c>
      </row>`;

      // Row 4: Meta bar
      const metaText = `DOK. KOD: ${inst.docCode}   |   YAY. TAR: ${inst.publishDate}   |   REV. TAR: ${inst.revDate}   |   REV. NO: ${inst.revNo}   |   SAYFA: ${inst.pageNo}`;
      sheetData += `<row r="4" ht="18" customHeight="1">
        <c r="A4" s="4" t="inlineStr"><is><t>${escapeXml(metaText)}</t></is></c>
      </row>`;

      // Row 5: spacer
      sheetData += `<row r="5" ht="6" customHeight="1"/>`;

      // Row 6: Table Header 1 (Numbers)
      let r6 = `<row r="6" ht="20" customHeight="1">
        <c r="A6" s="5" t="inlineStr"><is><t>Ad Soyad</t></is></c>
        <c r="B6" s="5" t="inlineStr"><is><t>Ünvan</t></is></c>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const colL = colToLetter(2 + d);
        const sId = isW(d) ? 6 : 5;
        r6 += `<c r="${colL}6" s="${sId}"><v>${d}</v></c>`;
      }
      if (isSecurity) {
        r6 += `<c r="${colToLetter(totalCols - 3)}6" s="5" t="inlineStr"><is><t>ÇALIŞTIĞI GÜN</t></is></c>
        <c r="${colToLetter(totalCols - 2)}6" s="5" t="inlineStr"><is><t>GECE ÇALIŞ.</t></is></c>
        <c r="${colToLetter(totalCols - 1)}6" s="5" t="inlineStr"><is><t>İZİN RAPOR</t></is></c>
        <c r="${colToLetter(totalCols)}6" s="5" t="inlineStr"><is><t>RESMİ TATİL</t></is></c>`;
      } else {
        r6 += `<c r="${colToLetter(totalCols - 1)}6" s="5" t="inlineStr"><is><t>ÇALIŞTIĞI GÜN SAYISI</t></is></c>
        <c r="${colToLetter(totalCols)}6" s="5" t="inlineStr"><is><t>RAPOR / İZİN GÜN SAYISI</t></is></c>`;
      }
      r6 += `</row>`;
      sheetData += r6;

      // Row 7: Table Header 2 (Day Names)
      let r7 = `<row r="7" ht="16" customHeight="1">
        <c r="A7" s="5"/>
        <c r="B7" s="5"/>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const colL = colToLetter(2 + d);
        const sId = isW(d) ? 6 : 5;
        const dn = getDayName(d);
        r7 += `<c r="${colL}7" s="${sId}" t="inlineStr"><is><t>${dn}</t></is></c>`;
      }
      if (isSecurity) {
        r7 += `<c r="${colToLetter(totalCols - 3)}7" s="5"/>
        <c r="${colToLetter(totalCols - 2)}7" s="5"/>
        <c r="${colToLetter(totalCols - 1)}7" s="5"/>
        <c r="${colToLetter(totalCols)}7" s="5"/>`;
      } else {
        r7 += `<c r="${colToLetter(totalCols - 1)}7" s="5"/>
        <c r="${colToLetter(totalCols)}7" s="5"/>`;
      }
      r7 += `</row>`;
      sheetData += r7;

      // Personnel Rows
      let rowNum = 8;
      list.forEach(person => {
        const pRoster = (period.roster && period.roster[person.id]) || {};
        const totals = CalculationEngine.calculatePersonnelTotals(person.id, year, month);

        let pRow = `<row r="${rowNum}" ht="28" customHeight="1">
          <c r="A${rowNum}" s="7" t="inlineStr"><is><t>${escapeXml(person.name)}</t></is></c>
          <c r="B${rowNum}" s="8" t="inlineStr"><is><t>${escapeXml(person.title)}</t></is></c>`;

        for (let d = 1; d <= daysInMonth; d++) {
          const colL = colToLetter(2 + d);
          const isWeekend = isW(d);
          const code = (pRoster[d] || "").trim();
          let displayCode = code;
          if (code.includes(" - ")) {
            const parts = code.split(" - ");
            displayCode = parts[0] + "\n" + parts[1];
          }

          const sId = isWeekend ? 10 : 9;
          pRow += `<c r="${colL}${rowNum}" s="${sId}" t="inlineStr"><is><t>${escapeXml(displayCode)}</t></is></c>`;
        }

        pRow += `<c r="${colToLetter(totalCols - (isSecurity ? 3 : 1))}${rowNum}" s="11"><v>${totals.workedDays}</v></c>`;
        if (isSecurity) {
          pRow += `<c r="${colToLetter(totalCols - 2)}${rowNum}" s="11"><v>${totals.nightDays}</v></c>`;
        }
        pRow += `<c r="${colToLetter(totalCols - (isSecurity ? 1 : 0))}${rowNum}" s="11"><v>${totals.leaveDays}</v></c>`;
        if (isSecurity) {
          pRow += `<c r="${colToLetter(totalCols)}${rowNum}" s="11"><v>${totals.holidayWorkedDays}</v></c>`;
        }

        pRow += `</row>`;
        sheetData += pRow;
        rowNum++;
      });

      // Spacer
      sheetData += `<row r="${rowNum}" ht="8" customHeight="1"/>`;
      rowNum++;

      // Notes and Legend
      const leftColSpan = Math.floor(totalCols * 0.58);
      const notesStartCol = 'A';
      const notesEndCol = colToLetter(leftColSpan);
      const legendStartCol = colToLetter(leftColSpan + 1);
      const legendEndCol = lastColLetter;

      merges.push(`${notesStartCol}${rowNum}:${notesEndCol}${rowNum + 4}`);
      merges.push(`${legendStartCol}${rowNum}:${legendEndCol}${rowNum + 4}`);

      let notesArray = [];
      if (Array.isArray(notes)) {
        notesArray = notes;
      } else if (typeof notes === 'string') {
        notesArray = notes.split('\n').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(AppState.config.legalNotes)) {
        notesArray = AppState.config.legalNotes;
      }
      const notesText = "Kurumsal ve Kanuni Notlar:\n" + (notesArray.length > 0 ? notesArray.map(n => `• ${n}`).join('\n') : "Belirtilmedi");
      const legendText = "Puantaj Durum Kodları (Lejant):\nY.İ: Yıllık İzin   |   Ü.İ.: Ücretsiz İzin\nH.T: Hafta Tatili   |   S.İ.: Sendika İzni\nRAP: Rapor (İstirahat)   |   R.T.: Resmi Tatil\nE.İ.: Evlilik / Eğitim İzni   |   İ.İ.: İdari İzin";

      sheetData += `<row r="${rowNum}" ht="20" customHeight="1">
        <c r="${notesStartCol}${rowNum}" s="12" t="inlineStr"><is><t>${escapeXml(notesText)}</t></is></c>
        <c r="${legendStartCol}${rowNum}" s="13" t="inlineStr"><is><t>${escapeXml(legendText)}</t></is></c>
      </row>`;
      rowNum += 5;

      // Spacer
      sheetData += `<row r="${rowNum}" ht="12" customHeight="1"/>`;
      rowNum++;

      // Signatures
      const sig1Start = 'A';
      const sig1End = colToLetter(Math.floor(totalCols / 3));
      const sig2Start = colToLetter(Math.floor(totalCols / 3) + 1);
      const sig2End = colToLetter(2 * Math.floor(totalCols / 3));
      const sig3Start = colToLetter(2 * Math.floor(totalCols / 3) + 1);
      const sig3End = lastColLetter;

      merges.push(`${sig1Start}${rowNum}:${sig1End}${rowNum}`);
      merges.push(`${sig2Start}${rowNum}:${sig2End}${rowNum}`);
      merges.push(`${sig3Start}${rowNum}:${sig3End}${rowNum}`);

      sheetData += `<row r="${rowNum}" ht="18" customHeight="1">
        <c r="${sig1Start}${rowNum}" s="14" t="inlineStr"><is><t>HAZIRLAYAN</t></is></c>
        <c r="${sig2Start}${rowNum}" s="14" t="inlineStr"><is><t>Kontrol Eden</t></is></c>
        <c r="${sig3Start}${rowNum}" s="14" t="inlineStr"><is><t>Onaylayan</t></is></c>
      </row>`;
      rowNum++;

      merges.push(`${sig1Start}${rowNum}:${sig1End}${rowNum}`);
      merges.push(`${sig2Start}${rowNum}:${sig2End}${rowNum}`);
      merges.push(`${sig3Start}${rowNum}:${sig3End}${rowNum}`);

      sheetData += `<row r="${rowNum}" ht="18" customHeight="1">
        <c r="${sig1Start}${rowNum}" s="15" t="inlineStr"><is><t>${escapeXml(sigs.preparedBy.name)}</t></is></c>
        <c r="${sig2Start}${rowNum}" s="15" t="inlineStr"><is><t>${escapeXml(sigs.checkedBy.name)}</t></is></c>
        <c r="${sig3Start}${rowNum}" s="15" t="inlineStr"><is><t>${escapeXml(sigs.approvedBy.name)}</t></is></c>
      </row>`;
      rowNum++;

      merges.push(`${sig1Start}${rowNum}:${sig1End}${rowNum}`);
      merges.push(`${sig2Start}${rowNum}:${sig2End}${rowNum}`);
      merges.push(`${sig3Start}${rowNum}:${sig3End}${rowNum}`);

      sheetData += `<row r="${rowNum}" ht="16" customHeight="1">
        <c r="${sig1Start}${rowNum}" s="16" t="inlineStr"><is><t>${escapeXml(sigs.preparedBy.role)}</t></is></c>
        <c r="${sig2Start}${rowNum}" s="16" t="inlineStr"><is><t>${escapeXml(sigs.checkedBy.role)}</t></is></c>
        <c r="${sig3Start}${rowNum}" s="16" t="inlineStr"><is><t>${escapeXml(sigs.approvedBy.role)}</t></is></c>
      </row>`;
      rowNum++;

      merges.push(`${sig1Start}${rowNum}:${sig1End}${rowNum}`);
      merges.push(`${sig2Start}${rowNum}:${sig2End}${rowNum}`);
      merges.push(`${sig3Start}${rowNum}:${sig3End}${rowNum}`);

      sheetData += `<row r="${rowNum}" ht="10" customHeight="1">
        <c r="${sig1Start}${rowNum}" s="17"/>
        <c r="${sig2Start}${rowNum}" s="17"/>
        <c r="${sig3Start}${rowNum}" s="17"/>
      </row>`;

      // Sütun Genişlikleri
      const colsXml = `<cols>
        <col min="1" max="1" width="22" customWidth="1"/>
        <col min="2" max="2" width="18" customWidth="1"/>
        <col min="3" max="${2 + daysInMonth}" width="8" customWidth="1"/>
        <col min="${2 + daysInMonth + 1}" max="${totalCols}" width="12" customWidth="1"/>
      </cols>`;

      const mergesXml = `<mergeCells count="${merges.length}">` + merges.map(m => `<mergeCell ref="${m}"/>`).join('') + `</mergeCells>`;

      const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  ${colsXml}
  <sheetData>
    ${sheetData}
  </sheetData>
  ${mergesXml}
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>
  <drawing r:id="rId1"/>
</worksheet>`;

      zip.addFile('xl/worksheets/sheet1.xml', sheet1Xml);

      // ZIP Binary Oluştur ve İndir
      const zipBytes = zip.build();
      const blob = new Blob([zipBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeFacility = inst.facility.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]/g, "_");
      const safeDept = deptTitle.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]/g, "_");
      a.download = `${safeFacility}_${safeDept}_Puantaj_${year}_${monthName}.xlsx`;
      a.click();
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    }
  };

  if (typeof window !== 'undefined') window.XlsxEngine = XlsxEngine;
  if (typeof globalThis !== 'undefined') globalThis.XlsxEngine = XlsxEngine;
  global.XlsxEngine = XlsxEngine;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
