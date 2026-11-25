/* CLINED · Meja Jaga IGD — Data Kasus (56 kasus SKDI dokter umum), Karakter Loket, Malam (5 menit/berkas),
   serta Panduan Klinis Terverifikasi (85 obat, Nilai Lab, Cairan, Pediatri, Rumus, Tatalaksana IGD, Identitas).
   Dimuat lazy sebelum js/meja-jaga-igd-gen.js & js/meja-jaga-igd.js via js/lazy-loader.js (bundle "igd"). */
(() => {
  'use strict';

  const TYPES = {
    resep:     { title:'RESEP', prefix:'RSP', cls:'t-resep', signLabel:'Paraf dokter' },
    soap:      { title:'CATATAN KOAS · SOAP', prefix:'SOAP', cls:'t-soap', signLabel:'Koas jaga' },
    instruksi: { title:'LEMBAR INSTRUKSI OBAT', prefix:'INS', cls:'t-ins', signLabel:'DPJP' }
  };

  const GAME = { y:2026, m:11, d:25 };
  const GAME_DATE = '25/11/2026';
  const WIL = {
    '3273':'KOTA BANDUNG', '3204':'KABUPATEN BANDUNG', '3277':'KOTA CIMAHI',
    '3275':'KOTA BEKASI', '3201':'KABUPATEN BOGOR', '3205':'KABUPATEN GARUT'
  };
  const FASKES = {
    '3273':'PUSKESMAS SUKAJADI', '3204':'PUSKESMAS BALEENDAH', '3277':'PUSKESMAS CIMAHI TENGAH',
    '3275':'PUSKESMAS BEKASI JAYA', '3201':'PUSKESMAS CIBINONG', '3205':'PUSKESMAS TAROGONG'
  };

  /* ================= 56 KASUS KLINIS & IDENTITAS =================
     pt     = data rekam medis (kartu pasien, selalu benar)
     ktp    = isi dokumen yang dibawa pasien (KTP dewasa / KIA anak < 17 th)
     idx    = penimpaan isi KTP/KIA untuk kasus identitas salah / KTP lama
     berkas = penimpaan identitas di berkas (nama, lahir, jk)
     gelang = penimpaan isi gelang identitas
     lab    = hasil laboratorium (+ ident bila tertukar)
     jkn    = penimpaan kartu JKN (bukan alasan menolak gawat darurat)
     kind   = 'id' | 'gelang' | 'lab' | (kosong = klinis)
     needs  = 'lab' | 'jkn' (syarat minimal malam untuk berkas aman) */
  const DOCS = [
    /* ---------- 1–11: Kasus klinis & aman inti (Malam 1+) ---------- */
    { type:'resep', sign:'dr. Anindya', flaw:'l2', topic:'kontra',
      pt:{nama:'Tn. Budi Santoso', lahir:'1992-03-12', jk:'L', rm:'02-41-17', bb:'68 kg', dx:'Asma persisten sedang, keluhan berdebar', alergi:'Tidak ada', cat:'Asma sejak SMA, sering kambuh malam hari'},
      ktp:{wil:'3273', kec:'05', sn:'0002', tl:'BANDUNG', alamat:'JL. CIHAMPELAS NO. 41', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      sections:[{lines:[
        {id:'l1', t:'R/ Salbutamol inhaler 100 mcg', s:'S prn 2 puff bila sesak'},
        {id:'l2', t:'R/ Propranolol tab 40 mg', s:'S 2 dd tab I (untuk berdebar)'},
        {id:'l3', t:'R/ Budesonid inhaler 200 mcg', s:'S 2 dd 1 puff, kumur setelah pakai'}]}],
      why:'Propranolol adalah beta-blocker non-selektif (memblok reseptor β2 bronkus). Pada pasien asma obat ini dapat memicu bronkospasme berat. Perlu evaluasi penyebab berdebar atau pilih alternatif yang aman bagi jalan napas.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l1', topic:'dosis',
      pt:{nama:'An. Raka Pratama', lahir:'2021-07-19', jk:'L', rm:'03-18-52', bb:'15 kg', dx:'Demam 2 hari, ISPA', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3204', kec:'12', sn:'0001', tl:'BANDUNG', alamat:'KP. CILEUNYI RT 03/07', agama:'ISLAM', kk:'3204120908150004', kepala:'HENDRA PRATAMA'},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 4 dd tab I'},
        {id:'l2', t:'R/ Ambroksol sirup 15 mg/5 mL', s:'S 3 dd 1/2 sdt'},
        {id:'l3', t:'R/ NaCl 0,9% tetes hidung', s:'S 3 dd 2 tetes tiap lubang'}]}],
      why:'Dosis paracetamol anak adalah 10–15 mg/kgBB per kali (±150–225 mg untuk BB 15 kg, maks 60–75 mg/kgBB/hari). Tablet 500 mg 4×/hari setara ±33 mg/kgBB/kali (133 mg/kgBB/hari) dan berisiko tinggi hepatotoksisitas.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l2', topic:'dosis',
      pt:{nama:'Ny. Rukmini', lahir:'1959-04-02', jk:'P', rm:'00-87-33', bb:'60 kg', dx:'Gagal jantung dekompensasi, edema paru', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3277', kec:'02', sn:'0004', tl:'CIMAHI', alamat:'JL. AMIR MAHMUD GG. MELATI 3', agama:'ISLAM', kawin:'CERAI MATI', kerja:'MENGURUS RUMAH TANGGA', goldar:'A'},
      sections:[{lines:[
        {id:'l1', cols:['O₂ nasal kanul','3 L/menit','Inhalasi','Kontinu']},
        {id:'l2', cols:['Furosemid','40 gram','IV','Bolus, sekali']},
        {id:'l3', cols:['Monitor urin','> 0,5 mL/kgBB/jam','—','Tiap 1 jam']}]}],
      why:'Kesalahan satuan fatal. 40 gram sama dengan 40.000 mg (1.000 kali dosis normal). Dosis awal furosemid IV pada edema paru adalah 40 mg IV bolus.' },

    { type:'soap', sign:'c. Dimas', flaw:null, topic:'aman',
      pt:{nama:'Ny. Sari Wulandari', lahir:'1968-01-23', jk:'P', rm:'01-56-09', bb:'62 kg', dx:'Nyeri dada akut', alergi:'Tidak ada', cat:'Hipertensi, tidak rutin minum obat'},
      ktp:{wil:'3273', kec:'14', sn:'0007', tl:'GARUT', alamat:'JL. SOEKARNO-HATTA NO. 220', agama:'ISLAM', kawin:'KAWIN', kerja:'PEDAGANG', goldar:'B'},
      sections:[
        {h:'S · Subjective', lines:[
          {id:'s1', t:'Nyeri dada kiri menjalar ke lengan kiri selama 40 menit, keringat dingin.'},
          {id:'s2', t:'Riwayat hipertensi 5 tahun, tidak rutin berobat. Tidak ada alergi obat.'}]},
        {h:'O · Objective', lines:[
          {id:'o1', t:'TD 150/90, N 96, RR 20, SpO₂ 97% udara ruang.'},
          {id:'o2', t:'EKG: elevasi segmen ST di V1–V4.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'STEMI anterior.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Aspirin 320 mg kunyah dan clopidogrel 300 mg loading.'},
          {id:'p2', t:'O₂ tidak diperlukan (SpO₂ 97%). Pasang IV line, konsul Sp.JP untuk reperfusi.'}]}],
      why:'Aman. Identitas cocok. Antiplatelet ganda dosis loading (aspirin 160–325 mg kunyah + clopidogrel 300 mg) dan rencana reperfusi sesuai pedoman PERKI/ESC STEMI. Oksigen memang tidak perlu bila SpO₂ ≥ 90%.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', topic:'alergi',
      pt:{nama:'Tn. Dimas Aditya', lahir:'1999-09-30', jk:'L', rm:'04-02-71', bb:'72 kg', dx:'Tonsilofaringitis bakterial', alergi:'PENISILIN (anafilaksis, 2019)', cat:''},
      ktp:{wil:'3275', kec:'03', sn:'0003', tl:'JAKARTA', alamat:'PERUM GRIYA ASRI BLOK C2/14', agama:'KRISTEN', kawin:'BELUM KAWIN', kerja:'KARYAWAN SWASTA', goldar:'AB'},
      sections:[{lines:[
        {id:'l1', t:'R/ Amoksisilin tab 500 mg', s:'S 3 dd tab I'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'},
        {id:'l3', t:'R/ Klorheksidin 0,2% obat kumur', s:'S 2 dd kumur'}]}],
      why:'Amoksisilin termasuk golongan penisilin. Pasien punya riwayat anafilaksis penisilin sehingga obat ini kontraindikasi absolut. Pilih alternatif non-beta-laktam seperti makrolida (azitromisin) atau klindamisin.' },

    { type:'soap', sign:'c. Nadia', flaw:'p1', topic:'kontra',
      pt:{nama:'Ny. Dewi Lestari', lahir:'1997-02-11', jk:'P', rm:'03-77-40', bb:'66 kg', dx:'Hipertensi gestasional, G2P1A0 hamil 20 minggu', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3204', kec:'07', sn:'0005', tl:'SUMEDANG', alamat:'KP. CIBODAS RT 02/05', agama:'ISLAM', kawin:'KAWIN', kerja:'GURU', goldar:'O'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Sakit kepala ringan 3 hari. Hamil 20 minggu, ANC teratur, tidak ada pandangan kabur.'}]},
        {h:'O · Objective', lines:[
          {id:'o1', t:'TD 148/94, ulang 15 menit: 150/96. Proteinuria negatif.'},
          {id:'o2', t:'DJJ 148 x/menit, TFU sesuai usia kehamilan.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Hipertensi dalam kehamilan tanpa proteinuria (non-berat).'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Kaptopril 12,5 mg, 3 dd tab I.'},
          {id:'p2', t:'Edukasi tanda bahaya, kontrol ANC 1 minggu lagi.'}]}],
      why:'ACE inhibitor (kaptopril) dan ARB kontraindikasi absolut pada kehamilan karena fetotoksik (gagal ginjal janin, oligohidramnion, hipoplasia paru). Pilihan aman pada kehamilan adalah metildopa, nifedipin, atau labetalol.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l3', topic:'kontra',
      pt:{nama:'Tn. Hartono', lahir:'1971-06-08', jk:'L', rm:'00-34-95', bb:'70 kg', dx:'DM tipe 2 dengan AKI', alergi:'Tidak ada', cat:'Kreatinin 4,2 mg/dL, eGFR ±15'},
      ktp:{wil:'3273', kec:'21', sn:'0001', tl:'SURAKARTA', alamat:'JL. PASIRKALIKI NO. 88', agama:'KATOLIK', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'-'},
      lab:{rows:[['GDS','286','mg/dL','< 200','H'],['Ureum','124','mg/dL','10–50','H'],['Kreatinin','4,2','mg/dL','0,7–1,3','H'],['Kalium','4,8','mmol/L','3,5–5,0','']]},
      sections:[{lines:[
        {id:'l1', cols:['NaCl 0,9%','500 mL','IV','Habis dalam 4 jam']},
        {id:'l2', cols:['Insulin reguler','4 unit','SC','Bila GDS > 250']},
        {id:'l3', cols:['Metformin','500 mg','PO','3 × sehari']}]}],
      why:'Metformin kontraindikasi bila eGFR < 30 mL/menit/1,73 m² atau pada gagal ginjal akut (AKI) karena risiko asidosis laktat yang mengancam jiwa. Pasien ini eGFR-nya sekitar 15.' },

    { type:'soap', sign:'c. Bayu', flaw:null, topic:'aman',
      pt:{nama:'An. Nadia Putri', lahir:'2024-05-15', jk:'P', rm:'05-10-28', bb:'12 kg', dx:'Diare akut', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3277', kec:'01', sn:'0002', tl:'CIMAHI', alamat:'JL. KOLONEL MASTURI NO. 12', agama:'ISLAM', kk:'3277011203190006', kepala:'RUDI HERMAWAN'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Diare cair 6 kali sejak kemarin, muntah 1 kali, masih mau minum.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'Suhu 37,8, mata sedikit cekung, turgor kembali lambat, CRT 2 detik.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Diare akut dehidrasi ringan–sedang, tanpa tanda disentri.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Oralit 75 mL/kgBB dalam 3 jam (±900 mL).'},
          {id:'p2', t:'Zinc 20 mg 1 kali sehari selama 10 hari.'},
          {id:'p3', t:'Antibiotik tidak diindikasikan. Edukasi tanda bahaya.'}]}],
      why:'Aman. KIA anak di bawah 5 tahun memang tanpa foto. Terapi B WHO/IDAI sudah tepat: oralit 75 × 12 kg = 900 mL dalam 3 jam, zinc 20 mg/hari selama 10 hari (usia ≥ 6 bulan), dan antibiotik tidak perlu pada diare cair akut non-disentri.' },

    { type:'resep', sign:'dr. Rahmat', flaw:null, topic:'aman',
      pt:{nama:'Tn. Agus Wibowo', lahir:'1985-10-03', jk:'L', rm:'02-90-63', bb:'75 kg', dx:'Dispepsia', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3201', kec:'10', sn:'0006', tl:'BOGOR', alamat:'JL. RAYA PUNCAK KM 7', agama:'ISLAM', kawin:'KAWIN', kerja:'PEGAWAI NEGERI SIPIL', goldar:'A'},
      idx:{berlaku:'03-10-2017', terbit:'03-10-2012'},
      sections:[{lines:[
        {id:'l1', t:'R/ Omeprazol cap 20 mg', s:'S 1 dd cap I sebelum makan pagi'},
        {id:'l2', t:'R/ Antasida DOEN tab', s:'S 3 dd tab I kunyah, 1 jam sesudah makan'},
        {id:'l3', t:'R/ Domperidon tab 10 mg', s:'S 3 dd tab I sebelum makan (maks 7 hari)'}]}],
      why:'Aman. Foto KTP lama tanpa kacamata tapi orangnya sama, dan KTP-el cetakan lama (tertulis berlaku 2017) tetap sah seumur hidup. Obat dan dosis dispepsia dewasa sesuai pedoman (domperidon maks 30 mg/hari, durasi singkat).' },

    { type:'resep', sign:'dr. Anindya', flaw:'l2', topic:'kontra',
      pt:{nama:'Tn. Slamet Riyadi', lahir:'1964-02-27', jk:'L', rm:'01-11-84', bb:'65 kg', dx:'Hematemesis melena e.c. tukak lambung', alergi:'Tidak ada', cat:'Hb 8,1 g/dL, sering minum obat nyeri sendiri'},
      ktp:{wil:'3205', kec:'04', sn:'0003', tl:'GARUT', alamat:'DS. SUKAMULYA RT 01/03', agama:'ISLAM', kawin:'KAWIN', kerja:'PETANI/PEKEBUN', goldar:'O'},
      lab:{rows:[['Hemoglobin','8,1','g/dL','13–17','L'],['Trombosit','250.000','/µL','150.000–400.000',''],['Ureum','58','mg/dL','10–50','H']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Pantoprazol inj 40 mg', s:'S 2 dd 1 vial IV'},
        {id:'l2', t:'R/ Natrium diklofenak tab 50 mg', s:'S 3 dd tab I (nyeri lutut)'},
        {id:'l3', t:'R/ Sukralfat sirup 500 mg/5 mL', s:'S 3 dd C I sebelum makan'}]}],
      why:'Natrium diklofenak adalah NSAID yang menghambat prostaglandin pelindung mukosa lambung dan memperburuk perdarahan saluran cerna. Kontraindikasi absolut pada ulkus/perdarahan GI aktif.' },

    { type:'instruksi', sign:'dr. Wulan, Sp.OT', flaw:null, topic:'aman',
      pt:{nama:'Ny. Lina Marlina', lahir:'1981-08-19', jk:'P', rm:'03-05-92', bb:'55 kg', dx:'Fraktur radius distal, nyeri sedang–berat', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3273', kec:'09', sn:'0004', tl:'BANDUNG', alamat:'JL. DAGO ATAS NO. 5', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'B'},
      sections:[{lines:[
        {id:'l1', cols:['Paracetamol infus','1 gram','IV drip 15 menit','Tiap 6 jam, maks 4 g/hari']},
        {id:'l2', cols:['Ondansetron','4 mg','IV','Bila mual, maks 3×/hari']},
        {id:'l3', cols:['Imobilisasi bidai','Posisi netral','—','Sampai konsul Sp.OT']}]}],
      why:'Aman. Identitas cocok. Paracetamol 1 gram IV aman untuk BB ≥ 50 kg dengan batas harian maks 4 g/hari, ondansetron 4 mg IV dosis lazim, dan tidak ada alergi maupun kontraindikasi.' },

    /* ---------- 12–30: Kasus klinis & aman BARU (Malam 1+) ---------- */
    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l2', topic:'kontra',
      pt:{nama:'Tn. Hendra Wijaya', lahir:'1970-06-15', jk:'L', rm:'04-12-90', bb:'74 kg', dx:'Angina pektoris stabil / nyeri dada', alergi:'Tidak ada', cat:'Minum sildenafil 50 mg 3 jam yang lalu'},
      ktp:{wil:'3273', kec:'10', sn:'0003', tl:'BANDUNG', alamat:'JL. SETIABUDI NO. 118', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'A'},
      sections:[{lines:[
        {id:'l1', cols:['Aspirin','160 mg','PO kunyah','Sekali sekarang']},
        {id:'l2', cols:['ISDN (isosorbid dinitrat)','5 mg','Sublingual','Ulang 5 menit bila nyeri']},
        {id:'l3', cols:['EKG 12 sadapan & monitor TD','—','—','Segera']}]}],
      why:'Interaksi obat mematikan! Nitrat (ISDN/nitrogliserin) kontraindikasi dalam 24 jam setelah konsumsi sildenafil (atau 48 jam setelah tadalafil) karena sinergi cGMP memicu vasodilatasi hebat dan hipotensi berat yang fatal.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', topic:'kontra',
      pt:{nama:'Tn. Dedi Kurniawan', lahir:'1965-11-04', jk:'L', rm:'01-74-22', bb:'70 kg', dx:'Artritis gout akut (podagra ibu jari kaki kanan)', alergi:'Tidak ada', cat:'Jempol kaki kanan bengkak merah sangat nyeri sejak semalam, baru pertama kali kambuh, belum pernah minum alopurinol'},
      ktp:{wil:'3275', kec:'04', sn:'0007', tl:'BEKASI', alamat:'JL. CUT MEUTIA NO. 88', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      sections:[{lines:[
        {id:'l1', t:'R/ Alopurinol tab 300 mg', s:'S 1 dd tab I (mulai hari ini untuk turunkan asam urat)'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri'},
        {id:'l3', t:'R/ Edukasi: kompres dingin, istirahatkan kaki, hindari jeroan & alkohol', s:''}]}],
      why:'Alopurinol (penurun asam urat) TIDAK boleh dimulai saat serangan gout akut (SKDI 4A) karena perubahan cepat kadar asam urat justru memperberat radang dan nyeri! Atasi dulu serangan akut dengan NSAID (bila ginjal/lambung aman), kolkisin, atau kortikosteroid jangka pendek.' },

    { type:'instruksi', sign:'dr. Rahmat', flaw:'l1', topic:'dosis',
      pt:{nama:'An. Farhan Maulana', lahir:'2023-08-10', jk:'L', rm:'05-88-11', bb:'14 kg', dx:'Syok anafilaksis e.c. sengatan lebah', alergi:'Bisa lebah', cat:'Urtikaria luas, mengi, bibir bengkak, TD 72/44'},
      ktp:{wil:'3204', kec:'08', sn:'0002', tl:'BANDUNG', alamat:'PERUM PERMATA BIRU BLOK B/9', agama:'ISLAM', kk:'3204081405200003', kepala:'ILHAM MAULANA'},
      sections:[{lines:[
        {id:'l1', cols:['Epinefrin (1:1.000)','1 mg','IV bolus cepat','Sekarang']},
        {id:'l2', cols:['O₂ sungkup','6 L/menit','Inhalasi','Kontinu, elevasi tungkai']},
        {id:'l3', cols:['NaCl 0,9%','280 mL (20 mL/kg)','IV bolus','Dalam 15 menit, nilai ulang']}]}],
      why:'Salah rute dan overdosis berat! Lini pertama anafilaksis anak adalah epinefrin 1:1.000 secara IM di paha anterolateral dengan dosis 0,01 mg/kgBB (= 0,14 mg IM untuk 14 kg, maks 0,3 mg). Bolus IV 1 mg larutan 1:1.000 adalah dosis henti jantung dewasa dan dapat memicu aritmia fatal.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l1', topic:'kontra',
      pt:{nama:'An. Aisyah Zahra', lahir:'2020-04-12', jk:'P', rm:'04-77-15', bb:'20 kg', dx:'Varisela (cacar air) hari ke-3, demam 38,9 °C', alergi:'Tidak ada', cat:'Vesikel gatal di wajah dan badan'},
      ktp:{wil:'3277', kec:'03', sn:'0005', tl:'CIMAHI', alamat:'JL. CIBABAT NO. 29', agama:'ISLAM', kk:'3277032209170001', kepala:'RIZKY PRATAMA'},
      sections:[{lines:[
        {id:'l1', t:'R/ Aspirin tab 500 mg', s:'S 3 dd 1/2 tab bila demam'},
        {id:'l2', t:'R/ Losion kalamin', s:'S ue oles tipis pada lenting gatal'},
        {id:'l3', t:'R/ Edukasi: minum cukup, jangan garuk vesikel', s:''}]}],
      why:'Aspirin kontraindikasi pada anak/remaja dengan infeksi virus (seperti varisela atau influenza) karena risiko sindrom Reye (ensefalopati akut dan gagal hati berat). Gunakan paracetamol 10–15 mg/kgBB/kali untuk demam.' },

    { type:'instruksi', sign:'dr. Rahmat', flaw:'l1', topic:'dosis',
      pt:{nama:'An. Gilang Ramadhan', lahir:'2025-02-18', jk:'L', rm:'05-91-40', bb:'9 kg', dx:'Kejang demam sederhana (sedang kejang di IGD)', alergi:'Tidak ada', cat:'Suhu 39,4 °C, kejang kelojotan seluruh tubuh 4 menit'},
      ktp:{wil:'3201', kec:'05', sn:'0001', tl:'BOGOR', alamat:'JL. PAJAJARAN INDAH BLOK C/4', agama:'ISLAM', kk:'3201051011220007', kepala:'DANI RAMADHAN'},
      sections:[{lines:[
        {id:'l1', cols:['Diazepam','10 mg','IV bolus cepat','Sekarang']},
        {id:'l2', cols:['O₂ nasal kanul','2 L/menit','Inhalasi','Miringkan posisi, jaga jalan napas']},
        {id:'l3', cols:['Paracetamol supositoria','125 mg','Rektal','Setelah kejang berhenti']}]}],
      why:'Overdosis berat! Dosis diazepam IV anak adalah 0,2–0,5 mg/kgBB pelan (= 1,8–4,5 mg untuk BB 9 kg; atau rektal 5 mg untuk BB < 12 kg sesuai IDAI). Pemberian 10 mg IV bolus cepat (> 1 mg/kgBB) berisiko tinggi menyebabkan depresi napas hingga henti napas.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', topic:'kontra',
      pt:{nama:'Ny. Kartika Sari', lahir:'2000-05-20', jk:'P', rm:'05-33-19', bb:'58 kg', dx:'ISK tanpa komplikasi, G1P0A0 hamil 12 minggu', alergi:'Tidak ada', cat:'Anyang-anyangan 2 hari, tidak demam, tidak nyeri pinggang'},
      ktp:{wil:'3273', kec:'04', sn:'0006', tl:'BANDUNG', alamat:'JL. BUAH BATU NO. 142', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'B'},
      sections:[{lines:[
        {id:'l1', t:'R/ Siprofloksasin tab 250 mg', s:'S 2 dd tab I, 3 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri'},
        {id:'l3', t:'R/ Edukasi: banyak minum air putih, jangan tahan BAK', s:''}]}],
      why:'Fluorokuinolon (siprofloksasin) kontraindikasi pada kehamilan karena potensi toksisitas kartilago/sendi janin. Untuk ISK ibu hamil, pilih antibiotik yang aman seperti sefiksim/sefaleksin atau amoksisilin-klavulanat sesuai kultur.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', topic:'kontra',
      pt:{nama:'Ny. Rahmawati Dewi', lahir:'1996-06-14', jk:'P', rm:'04-51-80', bb:'67 kg', dx:'Nyeri punggung bawah, G1P0A0 hamil 33 minggu', alergi:'Tidak ada', cat:'Gerak janin aktif, tidak ada kontraksi'},
      ktp:{wil:'3275', kec:'07', sn:'0004', tl:'BEKASI', alamat:'PERUM GALAXY BLOK E/11', agama:'ISLAM', kawin:'KAWIN', kerja:'GURU', goldar:'O'},
      sections:[{lines:[
        {id:'l1', t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I sesudah makan'},
        {id:'l2', t:'R/ Edukasi: kompres hangat punggung, tidur miring kiri', s:''}]}],
      why:'NSAID (ibuprofen) kontraindikasi pada kehamilan trimester 3 (dan hindari sejak ≥ 20 minggu) karena risiko penutupan prematur duktus arteriosus janin, hipertensi pulmonal janin, serta oligohidramnion. Gunakan paracetamol.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l1', topic:'alergi',
      pt:{nama:'Tn. Suryadi', lahir:'1978-07-03', jk:'L', rm:'02-66-09', bb:'71 kg', dx:'Abses kulit ringan lengan kanan (pasca insisi)', alergi:'SULFONAMID / KOTRIMOKSAZOL (Sindrom Stevens-Johnson, 2021)', cat:''},
      ktp:{wil:'3205', kec:'02', sn:'0005', tl:'GARUT', alamat:'JL. CIMANUK NO. 54', agama:'ISLAM', kawin:'KAWIN', kerja:'PEDAGANG', goldar:'A'},
      sections:[{lines:[
        {id:'l1', t:'R/ Kotrimoksazol forte tab 960 mg', s:'S 2 dd tab I, 5 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri/demam'},
        {id:'l3', t:'R/ Rawat luka harian, kontrol 2 hari lagi', s:''}]}],
      why:'Kotrimoksazol (trimetoprim-sulfametoksazol) mengandung golongan sulfonamid. Pada pasien dengan riwayat Sindrom Stevens-Johnson (SJS) akibat sulfa, pemberian ulang kontraindikasi absolut karena mengancam jiwa. Pilih klindamisin atau doksisiklin.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', topic:'alergi',
      pt:{nama:'Ny. Melati Kusumaningrum', lahir:'1987-01-16', jk:'P', rm:'03-49-71', bb:'59 kg', dx:'Rinosinusitis bakterial akut', alergi:'PENISILIN (anafilaksis, 2020)', cat:'Nyeri pipi, ingus kental hijau 10 hari, demam 38,3 °C'},
      ktp:{wil:'3273', kec:'12', sn:'0008', tl:'BANDUNG', alamat:'JL. SUPRATMAN NO. 33', agama:'ISLAM', kawin:'KAWIN', kerja:'PEGAWAI NEGERI SIPIL', goldar:'B'},
      sections:[{lines:[
        {id:'l1', t:'R/ Amoksisilin–klavulanat (Co-amoxiclav) tab 625 mg', s:'S 3 dd tab I, 7 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri/demam'},
        {id:'l3', t:'R/ Cuci hidung NaCl 0,9%', s:'S 2 dd semprot tiap lubang hidung'}]}],
      why:'Co-amoxiclav (amoksisilin–klavulanat) adalah antibiotik golongan penisilin! Pasien memiliki riwayat anafilaksis penisilin sehingga kontraindikasi absolut (SKDI 4A). Pilih doksisiklin atau makrolida.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l1', topic:'kontra',
      pt:{nama:'An. Danu Pratama', lahir:'2020-05-11', jk:'L', rm:'04-82-64', bb:'20 kg', dx:'Infeksi kulit (pioderma / impetigo luas)', alergi:'Tidak ada', cat:'Koreng bernanah di kedua tungkai, tidak demam tinggi'},
      ktp:{wil:'3204', kec:'06', sn:'0003', tl:'BANDUNG', alamat:'KP. BOJONGSOANG RT 04/02', agama:'ISLAM', kk:'3204061502180004', kepala:'AGUS SALIM'},
      sections:[{lines:[
        {id:'l1', t:'R/ Doksisiklin cap 100 mg', s:'S 2 dd cap I, 7 hari'},
        {id:'l2', t:'R/ Kompres NaCl 0,9% hangat pada krusta', s:'S 2 dd kompres 10 menit'},
        {id:'l3', t:'R/ Edukasi: jaga kebersihan kulit & potong kuku pendek', s:''}]}],
      why:'Doksisiklin (golongan tetrasiklin) kontraindikasi rutin pada anak usia < 8 tahun (pasien 6 th) karena merusak pertumbuhan tulang dan menyebabkan pewarnaan gigi permanen (SKDI 4A), ditambah 100 mg 2×/hari adalah dosis dewasa! Pilih antibiotik aman anak (mis. sefaleksin/amoksisilin-klavulanat/klindamisin).' },

    { type:'instruksi', sign:'dr. Wulan, Sp.OT', flaw:'l1', topic:'dosis',
      pt:{nama:'Ny. Kartini', lahir:'1952-03-08', jk:'P', rm:'00-64-18', bb:'44 kg', dx:'Nyeri akut kolik ureter kanan', alergi:'Tidak ada', cat:'Fungsi ginjal normal, nyeri skala 7/10'},
      ktp:{wil:'3277', kec:'01', sn:'0009', tl:'SUMEDANG', alamat:'JL. BAROS NO. 21', agama:'ISLAM', kawin:'CERAI MATI', kerja:'PENSIUNAN', goldar:'A'},
      sections:[{lines:[
        {id:'l1', cols:['Ketorolak','30 mg','IV','Tiap 6 jam (120 mg/hari)']},
        {id:'l2', cols:['Ondansetron','4 mg','IV','Bila mual, maks 3×/hari']},
        {id:'l3', cols:['NaCl 0,9%','500 mL','IV','Tiap 8 jam']}]}],
      why:'Pasien lansia (74 th ≥ 65 th) dengan BB < 50 kg (44 kg). Batas maksimum ketorolak pada kelompok ini adalah 60 mg/hari (10–15 mg tiap 6–8 jam). Pemberian 120 mg/hari (2× batas aman) berisiko tinggi memicu perdarahan lambung dan gagal ginjal akut.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', topic:'kontra',
      pt:{nama:'Ny. Ratih Permata', lahir:'1998-03-14', jk:'P', rm:'04-93-50', bb:'62 kg', dx:'Demam tifoid tanpa komplikasi, G1P0A0 hamil 28 minggu', alergi:'Tidak ada', cat:'Demam 6 hari terutama sore–malam, lidah kotor, masih mau makan-minum'},
      ktp:{wil:'3273', kec:'18', sn:'0001', tl:'BANDUNG', alamat:'JL. ANTAPANI TENGAH NO. 44', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'B'},
      sections:[{lines:[
        {id:'l1', t:'R/ Kloramfenikol cap 500 mg', s:'S 4 dd cap I, 10 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'},
        {id:'l3', t:'R/ Edukasi: tirah baring, diet lunak, banyak minum', s:''}]}],
      why:'Kloramfenikol kontraindikasi pada kehamilan (terutama trimester 3 — risiko gray baby syndrome dan supresi sumsum tulang janin!). Untuk demam tifoid ibu hamil (SKDI 4A), pilihan aman adalah amoksisilin, sefiksim, atau seftriakson.' },

    { type:'soap', sign:'c. Nadia', flaw:'p1', topic:'kontra',
      pt:{nama:'Ny. Yuliana', lahir:'1992-08-04', jk:'P', rm:'04-39-12', bb:'69 kg', dx:'Hipertensi kronik dalam kehamilan, G2P1A0 hamil 14 minggu', alergi:'Tidak ada', cat:'Sebelum hamil rutin minum candesartan 16 mg'},
      ktp:{wil:'3201', kec:'09', sn:'0004', tl:'BOGOR', alamat:'JL. SHOLIS ISKANDAR NO. 60', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'O'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Kontrol kehamilan 14 minggu, keluhan pusing ringan. Punya riwayat hipertensi sejak 2 tahun lalu.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'TD 150/94 mmHg, N 84, RR 18, proteinuria negatif, DJJ terdengar baik.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Hipertensi kronik dalam kehamilan (G2P1A0 hamil 14 minggu).'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Lanjutkan Candesartan 16 mg PO 1 kali sehari (obat rutin sebelumnya).'},
          {id:'p2', t:'Edukasi tanda bahaya kehamilan, kontrol ANC dan rujuk evaluasi Sp.OG.'}]}],
      why:'ARB (candesartan/valsartan/losartan) kontraindikasi absolut pada kehamilan sama seperti ACE inhibitor karena fetotoksik (gagal ginjal janin, oligohidramnion, anomali tengkorak). Harus segera diganti ke metildopa, nifedipin, atau labetalol (SKDI 3A).' },

    { type:'resep', sign:'dr. Wulan, Sp.OT', flaw:'l1', topic:'kontra',
      pt:{nama:'An. Bagas Pratama', lahir:'2018-06-27', jk:'L', rm:'04-95-21', bb:'25 kg', dx:'Vulnus laceratum tungkai kanan (pascajahit)', alergi:'Tidak ada', cat:'Nyeri luka jahitan, sudah dijahit 4 jahitan'},
      ktp:{wil:'3275', kec:'01', sn:'0002', tl:'BEKASI', alamat:'PERUM HARAPAN BARU BLOK A/12', agama:'ISLAM', kk:'3275010402150008', kepala:'EKO PRATAMA'},
      sections:[{lines:[
        {id:'l1', t:'R/ Tramadol cap 50 mg', s:'S 3 dd cap I bila nyeri'},
        {id:'l2', t:'R/ Rawat luka steril, jaga tetap kering', s:''},
        {id:'l3', t:'R/ Kontrol buka jahitan hari ke-7', s:''}]}],
      why:'Tramadol kontraindikasi pada anak di bawah 12 tahun (peringatan BPOM/FDA) karena metabolisme CYP2D6 ultra-cepat dapat menyebabkan depresi napas fatal. Gunakan paracetamol (10–15 mg/kg/kali) atau ibuprofen (5–10 mg/kg/kali) (SKDI 4A).' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:null, topic:'aman',
      pt:{nama:'Tn. Ridwan Hakim', lahir:'1997-04-09', jk:'L', rm:'05-14-77', bb:'68 kg', dx:'Syok anafilaksis e.c. alergi udang', alergi:'UDANG / MAKANAN LAUT', cat:'Biduran seluruh tubuh, suara serak, mengi, TD 84/52 mmHg'},
      ktp:{wil:'3273', kec:'03', sn:'0005', tl:'BANDUNG', alamat:'JL. DIPATIUKUR NO. 72', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'PELAJAR/MAHASISWA', goldar:'A'},
      sections:[{lines:[
        {id:'l1', cols:['Epinefrin (1:1.000)','0,5 mg','IM paha lateral','Ulang tiap 5–15 mnt bila perlu']},
        {id:'l2', cols:['O₂ sungkup + NaCl 0,9%','10 L/mnt + 1.000 mL','Inh / IV cepat','Elevasi tungkai']},
        {id:'l3', cols:['Deksametason + Difenhidramin','8 mg + 25 mg','IV (adjuvan)','Setelah epinefrin diberikan']}]}],
      why:'Aman! Tatalaksana anafilaksis (SKDI 4A) sudah tepat: epinefrin 1:1.000 dosis 0,3–0,5 mg IM di paha anterolateral sebagai lini pertama, oksigen aliran tinggi + cairan kristaloid cepat, lalu kortikosteroid/antihistamin sebagai adjuvan.' },

    { type:'soap', sign:'c. Nadia', flaw:null, topic:'aman',
      pt:{nama:'Ny. Lestari Handayani', lahir:'1998-07-15', jk:'P', rm:'05-29-04', bb:'64 kg', dx:'Preeklamsia berat, G1P0A0 hamil 34 minggu', alergi:'Tidak ada', cat:'Proteinuria +3, refleks patela +/+, RR 18, urin 50 mL/jam'},
      ktp:{wil:'3204', kec:'09', sn:'0006', tl:'BANDUNG', alamat:'JL. RAYA SOREANG NO. 19', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Sakit kepala hebat dan pandangan agak kabur sejak 4 jam lalu. Hamil 34 minggu.'}]},
        {h:'O · Objective', lines:[
          {id:'o1', t:'TD 168/110 mmHg, N 92, RR 18, SpO₂ 98%, refleks patela +/+, urin 50 mL/jam.'},
          {id:'o2', t:'DJJ 144 x/menit, proteinuria dipstick +3.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Preeklamsia berat pada G1P0A0 hamil 34 minggu.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Dosis awal MgSO₄ 4 g IV pelan 15–20 menit (syarat terpenuhi: patela +, RR ≥ 16, urin ≥ 30 mL/jam; siapkan Ca glukonas 10%).'},
          {id:'p2', t:'Nifedipin lepas cepat 10 mg PO (bukan sublingual), lalu segera rujuk ke Sp.OG / RS rujukan.'}]}],
      why:'Aman! Tatalaksana awal preeklamsia berat (SKDI 3B / PNPK POGI) sudah benar: dosis loading MgSO₄ 4 g IV pelan setelah syarat terpenuhi, nifedipin lepas cepat 10 mg PO, siaga antidot kalsium glukonas, lalu segera rujuk Sp.OG.' },

    { type:'resep', sign:'dr. Rahmat', flaw:null, topic:'aman',
      pt:{nama:'An. Zahra Salsabila', lahir:'2023-09-01', jk:'P', rm:'05-72-33', bb:'14 kg', dx:'Croup (laringotrakeobronkitis) ringan–sedang', alergi:'Tidak ada', cat:'Batuk menggonggong, stridor ringan saat menangis, SpO₂ 97%'},
      ktp:{wil:'3277', kec:'02', sn:'0003', tl:'CIMAHI', alamat:'JL. PESANTREN NO. 18', agama:'ISLAM', kk:'3277021504210002', kepala:'FAISAL HAKIM'},
      sections:[{lines:[
        {id:'l1', t:'R/ Deksametason 8 mg PO (≈ 0,57 mg/kgBB)', s:'S dosis tunggal sekarang di IGD'},
        {id:'l2', t:'R/ Paracetamol sirup 120 mg/5 mL', s:'S 3 dd 1½ cth (7,5 mL = 180 mg) k/p demam'},
        {id:'l3', t:'R/ Edukasi: segera kembali bila stridor saat diam / sesak', s:''}]}],
      why:'Aman. KIA anak < 5 tahun memang tanpa foto. Deksametason 0,6 mg/kgBB dosis tunggal (14 × 0,6 = 8,4 mg → 8 mg) adalah lini pertama croup, dan paracetamol 180 mg (±12,9 mg/kgBB/kali) tepat dalam rentang 10–15 mg/kgBB.' },

    { type:'resep', sign:'dr. Anindya', flaw:null, topic:'aman',
      pt:{nama:'Tn. Fajar Nugroho', lahir:'1991-02-19', jk:'L', rm:'03-84-51', bb:'70 kg', dx:'Tonsilofaringitis bakterial', alergi:'PENISILIN (urtikaria luas, 2022)', cat:''},
      ktp:{wil:'3273', kec:'15', sn:'0002', tl:'SEMARANG', alamat:'JL. KIARACONDONG NO. 105', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'B'},
      sections:[{lines:[
        {id:'l1', t:'R/ Azitromisin tab 500 mg', s:'S 1 dd tab I, selama 3 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam/nyeri'},
        {id:'l3', t:'R/ Edukasi: minum hangat, istirahat cukup', s:''}]}],
      why:'Aman! Pasien memang alergi penisilin, tetapi dokter sudah memilih azitromisin (makrolida, non-beta-laktam) dengan dosis lazim 500 mg 1×/hari selama 3 hari. Jangan menolak berkas hanya karena ada label alergi bila obat yang diresepkan aman!' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:null, topic:'aman',
      pt:{nama:'Ny. Nurhayati', lahir:'1966-10-05', jk:'P', rm:'01-43-90', bb:'62 kg', dx:'Asma eksaserbasi sedang', alergi:'Tidak ada', cat:'Mengi ekspirasi bilateral, SpO₂ 92%, bisa bicara penggal kalimat'},
      ktp:{wil:'3205', kec:'01', sn:'0007', tl:'GARUT', alamat:'JL. MERDEKA NO. 82', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'O'},
      sections:[{lines:[
        {id:'l1', cols:['O₂ nasal kanul','3 L/menit','Inhalasi','Target SpO₂ 93–95%']},
        {id:'l2', cols:['Nebulisasi Salbutamol + Ipratropium','2,5 mg + 0,5 mg','Inhalasi','Tiap 20 menit (3×)']},
        {id:'l3', cols:['Metilprednisolon','62,5 mg','IV bolus','Evaluasi ulang 1 jam']}]}],
      why:'Aman! Sesuai pedoman GINA/PDPI untuk asma eksaserbasi sedang: oksigen terukur target SpO₂ 93–95%, nebulisasi SABA + ipratropium tiap 20 menit (3 dosis awal), serta kortikosteroid sistemik (metilprednisolon ~1 mg/kgBB IV).' },

    /* ---------- 31–38: Kasus identitas KTP/KIA/Berkas (Malam 2+) ---------- */
    { type:'resep', sign:'dr. Rahmat', flaw:'id', kind:'id', topic:'identitas',
      pt:{nama:'Ny. Maya Kusuma', lahir:'1995-04-06', jk:'P', rm:'04-28-60', bb:'58 kg', dx:'ISK tanpa komplikasi, tidak hamil', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3275', kec:'08', sn:'0005', tl:'BEKASI', alamat:'JL. KALIMALANG NO. 17', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'KARYAWAN SWASTA', goldar:'A'},
      berkas:{lahir:'2013-04-06'},
      sections:[{lines:[
        {id:'l1', t:'R/ Siprofloksasin tab 250 mg', s:'S 2 dd tab I, 3 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri'},
        {id:'l3', t:'R/ Edukasi: banyak minum air putih', s:''}]}],
      why:'Tanggal lahir di berkas 06-04-2013 (13 th), padahal KTP dan kartu pasien menunjukkan 06-04-1995 (31 th). Berkas harus ditolak dan diverifikasi ulang karena berisiko salah pasien atau salah dosis.' },

    { type:'resep', sign:'dr. Anindya', flaw:['ktp-ttl','ktp-foto'], kind:'id', topic:'identitas',
      pt:{nama:'Tn. Joko Susilo', lahir:'1988-08-14', jk:'L', rm:'04-63-21', bb:'70 kg', dx:'Myalgia pascaolahraga', alergi:'Tidak ada', cat:'Datang diantar istri'},
      ktp:{wil:'3204', kec:'15', sn:'0002', tl:'BANDUNG', alamat:'JL. RAYA BANJARAN NO. 102', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      idx:{lahir:'1958-08-14', sn:'0001', kerja:'PENSIUNAN'},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri'},
        {id:'l2', t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I sesudah makan, 3 hari'},
        {id:'l3', t:'R/ Edukasi: istirahat, kompres hangat', s:''}]}],
      why:'KTP yang dibawa bukan milik pasien. Namanya sama, tetapi tanggal lahirnya 14-08-1958 (68 th), sedangkan kartu pasien 14-08-1988 (38 th). Fotonya juga jelas orang lebih tua (kemungkinan KTP ayahnya yang serumah).' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'id', kind:'id', topic:'identitas',
      pt:{nama:'Ny. Siti Rahmawati', lahir:'1982-10-30', jk:'P', rm:'01-23-45', bb:'54 kg', dx:'Perdarahan uterus abnormal, anemia', alergi:'Tidak ada', cat:'Hb 6,8 g/dL. Di IGD ada pasien lain bernama sama.'},
      ktp:{wil:'3273', kec:'11', sn:'0008', tl:'CIANJUR', alamat:'JL. ANTAPANI LAMA NO. 9', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'B'},
      berkas:{lahir:'1979-02-14'},
      sections:[{lines:[
        {id:'l1', cols:['Transfusi PRC','2 kolf','IV','Sesuai hasil crossmatch']},
        {id:'l2', cols:['Asam traneksamat','500 mg','IV pelan','Tiap 8 jam']},
        {id:'l3', cols:['Monitor tanda vital','—','—','Tiap 15 menit saat transfusi']}]}],
      why:'Tanggal lahir di berkas (14-02-1979, 47 th) berbeda dengan kartu pasien dan KTP (30-10-1982, 44 th). Berkas kemungkinan milik pasien lain bernama sama. Salah pasien pada transfusi darah berakibat fatal!' },

    { type:'resep', sign:'dr. Rahmat', flaw:['ktp-nama','ktp-ttl','ktp-foto'], kind:'id', topic:'identitas',
      pt:{nama:'An. Bima Saputra', lahir:'2019-03-04', jk:'L', rm:'05-44-16', bb:'22 kg', dx:'Otitis media akut', alergi:'Tidak ada', cat:'Diantar ibu'},
      ktp:{wil:'3275', kec:'05', sn:'0003', tl:'BEKASI', alamat:'JL. HARAPAN INDAH BLOK F/8', agama:'ISLAM', kk:'3275051107140002', kepala:'AHMAD SAPUTRA'},
      idx:{nama:'BIMO SAPUTRA', lahir:'2016-01-21', sn:'0001'},
      sections:[{lines:[
        {id:'l1', t:'R/ Amoksisilin sirup 250 mg/5 mL', s:'S 2 dd 3½ cth (17,5 mL), 7 hari'},
        {id:'l2', t:'R/ Paracetamol sirup 120 mg/5 mL', s:'S 3 dd 2 cth k/p demam'},
        {id:'l3', t:'R/ Edukasi: kontrol bila 3 hari tidak membaik', s:''}]}],
      why:'KIA yang dibawa milik kakaknya: nama BIMO (bukan Bima), lahir 21-01-2016 (10 th), dan fotonya bukan anak yang dibawa. Verifikasi identitas dulu karena dosis anak dihitung dari berat badan pasien yang benar.' },

    { type:'resep', sign:'dr. Anindya', flaw:['ktp-alamat','ktp-foto'], kind:'id', topic:'identitas',
      pt:{nama:'Ny. Ratna Kurniasih', lahir:'1985-05-07', jk:'P', rm:'02-15-58', bb:'60 kg', dx:'Gastroenteritis akut, dehidrasi ringan', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3273', kec:'06', sn:'0003', tl:'TASIKMALAYA', alamat:'JL. GATOT SUBROTO NO. 63', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'AB'},
      idx:{alamat:'KP. SUKAHAJI RT 04/02', wil:'3205', kec:'09', sn:'0001', tl:'GARUT', kerja:'PETANI/PEKEBUN', goldar:'-'},
      sections:[{lines:[
        {id:'l1', t:'R/ Oralit', s:'S 200 mL tiap BAB cair'},
        {id:'l2', t:'R/ Ondansetron tab 4 mg', s:'S 3 dd tab I k/p mual'},
        {id:'l3', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'}]}],
      why:'Nama dan tanggal lahir di KTP sama, tetapi alamatnya (Kp. Sukahaji, Kab. Garut) beda dengan rekam medis (Jl. Gatot Subroto, Kota Bandung) dan foto wajahnya berbeda. Alamat menjadi pembeda penting saat nama dan tanggal lahir kebetulan sama.' },

    { type:'soap', sign:'c. Bayu', flaw:'id', kind:'id', topic:'identitas',
      pt:{nama:'Tn. Arif Budiman', lahir:'1994-03-28', jk:'L', rm:'04-19-88', bb:'73 kg', dx:'Rinitis alergi akut, urtikaria ringan', alergi:'Debu rumah', cat:''},
      ktp:{wil:'3273', kec:'07', sn:'0004', tl:'BANDUNG', alamat:'JL. ASIA AFRIKA NO. 104', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'KARYAWAN SWASTA', goldar:'A'},
      berkas:{nama:'Tn. Arif Rahman'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Bersin-bersin dan bentol gatal di lengan sejak 3 jam lalu setelah bersih-bersih gudang.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'TD 120/78, N 82, RR 18, SpO₂ 99%, tidak ada mengi, urtika ringan di lengan.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Urtikaria akut ringan tanpa tanda anafilaksis.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Cetirizin 10 mg PO 1 kali sehari.'},
          {id:'p2', t:'Edukasi hindari pencetus dan segera ke IGD bila sesak atau bengkak bibir.'}]}],
      why:'Nama di berkas tertulis "Tn. Arif Rahman", sedangkan kartu pasien dan KTP adalah "Tn. Arif Budiman". Meski tanggal lahir kebetulan sama, nama belakang yang berbeda menandakan kesalahan input atau tertukar pasien.' },

    { type:'resep', sign:'dr. Rahmat', flaw:['ktp-alamat','ktp-foto'], kind:'id', topic:'identitas',
      pt:{nama:'An. Keisha Amanda', lahir:'2018-09-14', jk:'P', rm:'05-52-03', bb:'24 kg', dx:'ISK bawah anak (sistitis akut)', alergi:'Tidak ada', cat:'Diantar ibu, demam ringan 37,9 °C'},
      ktp:{wil:'3273', kec:'13', sn:'0002', tl:'BANDUNG', alamat:'JL. SARIJADI BLOK 10 NO. 6', agama:'ISLAM', kk:'3273131806160005', kepala:'BUDI SANTOSO'},
      idx:{alamat:'JL. CIBABAT RAYA NO. 44', wil:'3277', kec:'01', sn:'0006', tl:'CIMAHI'},
      sections:[{lines:[
        {id:'l1', t:'R/ Sefiksim sirup 100 mg/5 mL', s:'S 2 dd 1 cth (100 mg/kali = 8,3 mg/kg/hari), 5 hari'},
        {id:'l2', t:'R/ Paracetamol sirup 120 mg/5 mL', s:'S 3 dd 2 cth (240 mg) k/p demam'},
        {id:'l3', t:'R/ Edukasi: banyak minum, jangan menahan BAK', s:''}]}],
      why:'Alamat pada KIA (Jl. Cibabat Raya, Kota Cimahi) berbeda dengan rekam medis (Jl. Sarijadi, Kota Bandung) dan foto wajahnya bukan anak yang datang. Verifikasi ulang identitas pasien di pendaftaran.' },

    { type:'resep', sign:'dr. Anindya', flaw:['ktp-nama','ktp-ttl','ktp-foto'], kind:'id', topic:'identitas',
      pt:{nama:'Tn. Wahyu Pratama', lahir:'1982-04-17', jk:'L', rm:'03-22-41', bb:'76 kg', dx:'Urtikaria akut tanpa anafilaksis', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3201', kec:'04', sn:'0003', tl:'BOGOR', alamat:'PERUM BUKIT CIMANGGU BLOK J/7', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'O'},
      idx:{nama:'WAHYUDI PRATAMA', lahir:'1980-04-17', sn:'0001'},
      sections:[{lines:[
        {id:'l1', t:'R/ Cetirizin tab 10 mg', s:'S 1 dd tab I malam hari'},
        {id:'l2', t:'R/ Metilprednisolon tab 4 mg', s:'S 2 dd tab I sesudah makan, 3 hari'},
        {id:'l3', t:'R/ Edukasi: segera ke IGD bila sesak napas atau bibir bengkak', s:''}]}],
      why:'KTP yang dibawa milik orang lain/kakaknya: nama WAHYUDI PRATAMA (bukan Wahyu Pratama), lahir 17-04-1980 (bukan 17-04-1982), dan foto wajahnya berbeda. Tolak untuk verifikasi identitas.' },

    /* ---------- 39–42: Kasus gelang & wajah (Malam 3+) ---------- */
    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'gelang-lahir', kind:'gelang', topic:'identitas',
      pt:{nama:'Tn. Andi Firmansyah', lahir:'1981-09-12', jk:'L', rm:'05-61-07', bb:'78 kg', dx:'Selulitis tungkai kanan', alergi:'Tidak ada', cat:'Di triase ada dua pasien bernama Andi.'},
      ktp:{wil:'3273', kec:'17', sn:'0004', tl:'BANDUNG', alamat:'JL. MOH. TOHA NO. 77', agama:'ISLAM', kawin:'KAWIN', kerja:'SOPIR', goldar:'B'},
      gelang:{lahir:'1972-09-12'},
      sections:[{lines:[
        {id:'l1', cols:['Seftriakson','2 gram','IV','Tiap 24 jam']},
        {id:'l2', cols:['Paracetamol','1 gram','PO','Tiap 8 jam bila demam']},
        {id:'l3', cols:['Elevasi tungkai','—','—','Saat berbaring']}]}],
      why:'Tanggal lahir di gelang (12-09-1972) beda dengan kartu pasien (12-09-1981). Gelangnya tertukar dengan pasien Andi lain di triase. Pasang ulang gelang yang benar sebelum pemberian obat.' },

    { type:'soap', sign:'c. Dimas', flaw:'gelang-nama', kind:'gelang', topic:'identitas',
      pt:{nama:'Ny. Wati Susanti', lahir:'1974-03-18', jk:'P', rm:'02-77-31', bb:'64 kg', dx:'Hipertensi urgensi', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3277', kec:'03', sn:'0006', tl:'CIMAHI', alamat:'JL. SANGKURIANG NO. 15', agama:'ISLAM', kawin:'KAWIN', kerja:'PEDAGANG', goldar:'O'},
      gelang:{nama:'Ny. Wati Suryani'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Pusing dan tengkuk berat sejak sore. Obat darah tinggi habis 1 minggu.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'TD 190/110, ulang 30 menit 186/108. Tidak ada defisit neurologis, tidak nyeri dada.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Hipertensi urgensi tanpa kerusakan organ target.'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Amlodipin 10 mg PO 1 kali sehari, mulai sekarang.'},
          {id:'p2', t:'Observasi TD tiap 30 menit selama 2 jam, edukasi minum obat rutin.'}]}],
      why:'Nama di gelang "Wati Suryani", padahal pasien adalah Wati Susanti. Tanggal lahirnya kebetulan sama, tetapi nama berbeda menandakan gelang milik pasien lain. Ganti gelang terlebih dahulu.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'gelang-lahir', kind:'gelang', topic:'identitas',
      pt:{nama:'Ny. Sri Mulyani', lahir:'1974-06-30', jk:'P', rm:'02-38-14', bb:'63 kg', dx:'Kolik bilier', alergi:'Tidak ada', cat:'Di IGD ada pasien lain dengan nama sama'},
      ktp:{wil:'3204', kec:'03', sn:'0005', tl:'BANDUNG', alamat:'JL. RAYA DAYEUHKOLOT NO. 51', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'A'},
      gelang:{lahir:'1967-06-30'},
      sections:[{lines:[
        {id:'l1', cols:['Paracetamol infus','1 gram','IV drip 15 menit','Tiap 6 jam bila nyeri']},
        {id:'l2', cols:['Ondansetron','4 mg','IV','Bila mual, maks 3×/hari']},
        {id:'l3', cols:['USG abdomen','—','—','Jadwalkan setelah nyeri terkontrol']}]}],
      why:'Tanggal lahir di gelang identitas (30-06-1967) tidak cocok dengan kartu pasien dan KTP (30-06-1974). Gelang tertukar dengan pasien lain bernama Sri Mulyani. Wajib ganti gelang sebelum tindakan.' },

    { type:'resep', sign:'dr. Anindya', flaw:'ktp-foto', kind:'gelang', topic:'identitas',
      pt:{nama:'Tn. Eko Prasetyo', lahir:'1998-01-12', jk:'L', rm:'05-47-62', bb:'69 kg', dx:'Faringitis akut ringan', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3275', kec:'02', sn:'0008', tl:'BEKASI', alamat:'JL. PERJUANGAN NO. 30', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam/nyeri'},
        {id:'l2', t:'R/ Klorheksidin 0,2% obat kumur', s:'S 2 dd kumur'},
        {id:'l3', t:'R/ Edukasi: istirahat dan minum air hangat', s:''}]}],
      why:'Nama, tanggal lahir, dan alamat di semua kertas memang cocok, tetapi wajah orang di loket sama sekali berbeda dengan foto di KTP! Verifikasi langsung kepada orang yang datang untuk mencegah pemalsuan/tertukar identitas.' },

    /* ---------- 43–53: Kasus Hasil Lab (Malam 4+) ---------- */
    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l2', kind:'lab', topic:'lab',
      pt:{nama:'Tn. Darmawan', lahir:'1960-12-02', jk:'L', rm:'00-45-82', bb:'60 kg', dx:'CKD stadium 5, lemas', alergi:'Tidak ada', cat:'Jadwal cuci darah terlewat 1 minggu'},
      ktp:{wil:'3204', kec:'20', sn:'0002', tl:'MAJALENGKA', alamat:'KP. CIPARAY RT 05/01', agama:'ISLAM', kawin:'KAWIN', kerja:'PENSIUNAN', goldar:'A'},
      lab:{rows:[['Kalium','6,9','mmol/L','3,5–5,0','H'],['Natrium','136','mmol/L','135–145',''],['Ureum','168','mg/dL','10–50','H'],['Kreatinin','9,4','mg/dL','0,7–1,3','H'],['Hemoglobin','8,9','g/dL','13–17','L']]},
      sections:[{lines:[
        {id:'l1', cols:['Monitor EKG','—','—','Kontinu']},
        {id:'l2', cols:['KCl dalam NaCl 0,9% 500 mL','25 mEq','IV drip','Habis 4 jam']},
        {id:'l3', cols:['Konsul Sp.PD-KGH','—','—','Hemodialisis cito']}]}],
      why:'Kalium sudah 6,9 mmol/L (hiperkalemia berat!). Menambah KCl dapat memicu fibrilasi ventrikel/henti jantung. Yang dibutuhkan justru kalsium glukonas, insulin + dekstrosa, salbutamol, dan hemodialisis.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'l1', kind:'lab', topic:'lab',
      pt:{nama:'Ny. Ningsih', lahir:'1955-07-21', jk:'P', rm:'01-98-04', bb:'52 kg', dx:'Penurunan kesadaran, DM tipe 2', alergi:'Tidak ada', cat:'Minum glibenklamid, makan sedikit sejak kemarin'},
      ktp:{wil:'3273', kec:'02', sn:'0009', tl:'CIREBON', alamat:'JL. PAJAJARAN NO. 140', agama:'ISLAM', kawin:'CERAI MATI', kerja:'MENGURUS RUMAH TANGGA', goldar:'O'},
      lab:{rows:[['GDS','42','mg/dL','< 200','L'],['Kalium','3,9','mmol/L','3,5–5,0',''],['Natrium','138','mmol/L','135–145',''],['Kreatinin','1,1','mg/dL','0,6–1,1','']]},
      sections:[{lines:[
        {id:'l1', cols:['Insulin reguler','6 unit','SC','Sekarang']},
        {id:'l2', cols:['NaCl 0,9%','500 mL','IV','Habis 8 jam']},
        {id:'l3', cols:['Cek GDS ulang','—','—','Tiap 1 jam']}]}],
      why:'GDS 42 mg/dL adalah hipoglikemia berat (penyebab penurunan kesadarannya akibat glibenklamid). Memberi insulin akan menjatuhkan glukosa lebih dalam dan bisa fatal! Yang benar: Dekstrosa 40% 25–50 mL IV bolus pelan lalu cek GDS tiap 15 menit.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l2', kind:'lab', topic:'lab',
      pt:{nama:'Nn. Putri Anggraini', lahir:'2007-06-09', jk:'P', rm:'05-23-66', bb:'50 kg', dx:'Demam dengue hari ke-4', alergi:'Tidak ada', cat:'Nyeri otot dan sendi'},
      ktp:{wil:'3273', kec:'08', sn:'0001', tl:'BANDUNG', alamat:'JL. SUKAJADI NO. 210', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'PELAJAR/MAHASISWA', goldar:'A'},
      lab:{rows:[['Trombosit','38.000','/µL','150.000–400.000','L'],['Hematokrit','46','%','36–46',''],['Leukosit','3.100','/µL','4.000–11.000','L'],['Hemoglobin','15,1','g/dL','12–15','H']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'},
        {id:'l2', t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I k/p nyeri sendi'},
        {id:'l3', t:'R/ Edukasi: minum 2–3 L/hari, cek trombosit & Ht besok', s:''}]}],
      why:'Trombosit tinggal 38.000/µL pada demam dengue. NSAID (ibuprofen/diklofenak/aspirin) menghambat agregasi trombosit dan meningkatkan risiko perdarahan berat/saluran cerna. Untuk demam dan nyeri pada dengue cukup paracetamol.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'lab-id', kind:'lab', topic:'identitas',
      pt:{nama:'Tn. Yusuf Hidayat', lahir:'1976-04-25', jk:'L', rm:'03-41-19', bb:'67 kg', dx:'Melena, lemas', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3275', kec:'02', sn:'0005', tl:'BEKASI', alamat:'JL. AHMAD YANI NO. 31', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'B'},
      lab:{ident:{nama:'Tn. Yusuf Hidayat', lahir:'1958-11-02'}, rows:[['Hemoglobin','6,4','g/dL','13–17','L'],['Hematokrit','20','%','40–50','L'],['Trombosit','210.000','/µL','150.000–400.000',''],['Ureum','64','mg/dL','10–50','H']]},
      sections:[{lines:[
        {id:'l1', cols:['Transfusi PRC','2 kolf','IV','Sesuai Hb 6,4, crossmatch']},
        {id:'l2', cols:['Pantoprazol','80 mg','IV bolus','Lalu 40 mg tiap 12 jam']},
        {id:'l3', cols:['Puasa sementara','—','—','Sampai endoskopi']}]}],
      why:'Hasil lab ini milik Yusuf Hidayat yang lain: tanggal lahir di lab 02-11-1958, sedangkan pasien lahir 25-04-1976. Keputusan transfusi diambil dari lab orang lain. Periksa ulang Hb pasien yang benar sebelum transfusi.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l1', kind:'lab', topic:'lab',
      pt:{nama:'Tn. Bahrudin', lahir:'1988-05-03', jk:'L', rm:'03-67-92', bb:'65 kg', dx:'Demam tifoid hari ke-6', alergi:'Tidak ada', cat:'Demam naik sore–malam, lidah kotor, lemas'},
      ktp:{wil:'3204', kec:'14', sn:'0006', tl:'BANDUNG', alamat:'KP. MAJALAYA RT 02/06', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'O'},
      lab:{rows:[['Leukosit','2.100','/µL','4.000–11.000','L'],['Trombosit','88.000','/µL','150.000–400.000','L'],['Hemoglobin','9,4','g/dL','13–17','L'],['Tubex TF','+4','','≤ 2','H']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Kloramfenikol cap 500 mg', s:'S 4 dd cap I, 10 hari'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam'},
        {id:'l3', t:'R/ Edukasi: tirah baring, diet lunak, banyak minum', s:''}]}],
      why:'Lab menunjukkan supresi sumsum tulang / pansitopenia (leukosit 2.100/µL, trombosit 88.000/µL, Hb 9,4). Kloramfenikol kontraindikasi pada leukopenia berat/depresi sumsum tulang karena risiko pansitopenia & anemia aplastik berat! Pilih sefiksim atau azitromisin (SKDI 4A).' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', kind:'lab', topic:'lab',
      pt:{nama:'Ny. Hasanah', lahir:'1972-08-21', jk:'P', rm:'00-71-39', bb:'58 kg', dx:'Hepatitis A akut (ikterik, mual)', alergi:'Tidak ada', cat:'Sklera kuning 3 hari, urin warna teh, rutin minum obat kolesterol'},
      ktp:{wil:'3273', kec:'01', sn:'0007', tl:'BANDUNG', alamat:'JL. MERDEKA GG. MELATI 9', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'B'},
      lab:{rows:[['SGOT (AST)','680','U/L','< 40','H'],['SGPT (ALT)','790','U/L','< 40','H'],['Bilirubin total','4,8','mg/dL','0,2–1,2','H'],['IgM Anti-HAV','Positif','','Negatif','H']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Simvastatin tab 20 mg (lanjut rutin)', s:'S 1 dd tab I malam hari'},
        {id:'l2', t:'R/ Ondansetron tab 4 mg', s:'S 2 dd tab I k/p mual (maks 8 mg/hari)'},
        {id:'l3', t:'R/ Edukasi: istirahat cukup, diet lunak, hindari alkohol & obat hepatotoksik', s:''}]}],
      why:'Pada penyakit hati aktif (hepatitis A akut dengan SGOT/SGPT > 15× batas atas normal!), statin (simvastatin/atorvastatin) kontraindikasi absolut karena memperburuk cedera hati (SKDI 4A). Tunda sementara sampai enzim hati kembali normal.' },

    { type:'resep', sign:'dr. Rahmat', flaw:'l1', kind:'lab', topic:'lab',
      pt:{nama:'Tn. Gunawan', lahir:'1967-02-09', jk:'L', rm:'01-52-88', bb:'68 kg', dx:'Osteoartritis genu kanan (nyeri lutut)', alergi:'Tidak ada', cat:'Riwayat hipertensi lama, sering bengkak kaki'},
      ktp:{wil:'3201', kec:'08', sn:'0004', tl:'BOGOR', alamat:'JL. DRAMAGA RAYA NO. 75', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'A'},
      lab:{rows:[['Kreatinin','3,8','mg/dL','0,7–1,3','H'],['Ureum','112','mg/dL','10–50','H'],['eGFR','17','mL/mnt','≥ 90','L'],['Kalium','4,9','mmol/L','3,5–5,0','']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I sesudah makan'},
        {id:'l2', t:'R/ Kompres hangat & kurangi beban sendi lutut', s:''},
        {id:'l3', t:'R/ Rujuk evaluasi fungsi ginjal ke poli Penyakit Dalam', s:''}]}],
      why:'Lab menunjukkan gagal ginjal berat (Kreatinin 3,8 mg/dL, eGFR 17 mL/menit). NSAID (ibuprofen/diklofenak) kontraindikasi pada eGFR < 30 karena memperburuk perfusi ginjal dan memicu gagal ginjal akut berat (SKDI 4A/3A). Pilih paracetamol atau analgesik topikal.' },

    { type:'resep', sign:'dr. Anindya', flaw:'l1', kind:'lab', topic:'lab',
      pt:{nama:'Ny. Mawar Indah', lahir:'1957-07-11', jk:'P', rm:'01-33-70', bb:'54 kg', dx:'DM tipe 2 kontrol rutin', alergi:'Tidak ada', cat:'Sering gemetar dan keringat dingin bila telat makan'},
      ktp:{wil:'3277', kec:'01', sn:'0005', tl:'CIMAHI', alamat:'JL. GATOT SUBROTO NO. 112', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'O'},
      lab:{rows:[['GDS','194','mg/dL','< 200',''],['Kreatinin','2,1','mg/dL','0,6–1,1','H'],['eGFR','26','mL/mnt','≥ 90','L'],['Ureum','76','mg/dL','10–50','H']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Glibenklamid tab 5 mg', s:'S 2 dd tab I sebelum makan'},
        {id:'l2', t:'R/ Edukasi: makan teratur & kenali tanda hipoglikemia', s:''},
        {id:'l3', t:'R/ Rujuk evaluasi fungsi ginjal ke Sp.PD', s:''}]}],
      why:'Glibenklamid adalah sulfonilurea kerja panjang yang metabolit aktifnya dibuang lewat ginjal. Pada lansia (69 th) dan gangguan ginjal (eGFR 26 < 60), glibenklamid kontraindikasi karena risiko tinggi hipoglikemia berat berkepanjangan (SKDI 4A DM tipe 2).' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:'lab-id', kind:'lab', topic:'identitas',
      pt:{nama:'Tn. Ruslan Effendi', lahir:'1975-03-19', jk:'L', rm:'02-88-47', bb:'72 kg', dx:'Nyeri perut kanan atas, dispepsia', alergi:'Tidak ada', cat:'Tidak kuning, nyeri epigastrium ringan'},
      ktp:{wil:'3205', kec:'03', sn:'0004', tl:'GARUT', alamat:'JL. OTISTA NO. 90', agama:'ISLAM', kawin:'KAWIN', kerja:'WIRASWASTA', goldar:'A'},
      lab:{ident:{nama:'Tn. Ruslan Effendi', lahir:'1965-03-19'}, rows:[['SGOT (AST)','840','U/L','< 40','H'],['SGPT (ALT)','920','U/L','< 40','H'],['Bilirubin total','6,2','mg/dL','0,2–1,2','H'],['Albumin','3,1','g/dL','3,5–5,0','L']]},
      sections:[{lines:[
        {id:'l1', cols:['Rawat inap hepatitis akut','—','—','Berdasarkan SGOT/SGPT > 800']},
        {id:'l2', cols:['Infus D5%','500 mL','IV','Tiap 8 jam']},
        {id:'l3', cols:['Konsul Sp.PD-KGEH','—','—','Evaluasi gagal hati akut']}]}],
      why:'Hasil laboratorium milik pasien lain bernama Ruslan Effendi yang lahir 19-03-1965 (pasien ini lahir 19-03-1975). Rencana rawat inap hepatitis akut diambil dari hasil lab orang lain. Verifikasi dan periksa lab pasien yang benar.' },

    { type:'instruksi', sign:'dr. Hendra, Sp.PD', flaw:null, needs:'lab', topic:'aman',
      pt:{nama:'Tn. Rudi Hartanto', lahir:'1990-02-17', jk:'L', rm:'04-90-12', bb:'65 kg', dx:'Hipokalemia e.c. diare akut', alergi:'Tidak ada', cat:'Lemas, kram otot'},
      ktp:{wil:'3201', kec:'14', sn:'0007', tl:'BOGOR', alamat:'PERUM CITRA INDAH BLOK D/3', agama:'ISLAM', kawin:'KAWIN', kerja:'KARYAWAN SWASTA', goldar:'O'},
      lab:{rows:[['Kalium','2,9','mmol/L','3,5–5,0','L'],['Natrium','134','mmol/L','135–145','L'],['Kreatinin','0,9','mg/dL','0,7–1,3',''],['GDS','104','mg/dL','< 200','']]},
      sections:[{lines:[
        {id:'l1', cols:['KCl dalam NaCl 0,9% 500 mL','20 mEq','IV drip','Habis 4 jam']},
        {id:'l2', cols:['Oralit','200 mL','PO','Tiap BAB cair']},
        {id:'l3', cols:['Cek ulang kalium','—','—','6 jam lagi']}]}],
      why:'Aman. Kalium 2,9 mmol/L (hipokalemia) memang perlu dikoreksi. KCl 20 mEq dalam 500 mL (konsentrasi 40 mEq/L, batas maks perifer) habis 4 jam (= 5 mEq/jam, batas aman ≤ 10 mEq/jam), dan fungsi ginjal normal.' },

    { type:'resep', sign:'dr. Rahmat', flaw:null, needs:'lab', topic:'aman',
      pt:{nama:'Tn. Ridho Saputra', lahir:'2000-09-07', jk:'L', rm:'01-65-43', bb:'66 kg', dx:'Demam dengue hari ke-3 (tanpa tanda bahaya)', alergi:'Tidak ada', cat:'Demam 3 hari, nyeri belakang mata, mau minum, tidak ada perdarahan/nyeri perut'},
      ktp:{wil:'3273', kec:'16', sn:'0002', tl:'BANDUNG', alamat:'JL. TERUSAN JAKARTA NO. 55', agama:'ISLAM', kawin:'BELUM KAWIN', kerja:'KARYAWAN SWASTA', goldar:'B'},
      lab:{rows:[['Trombosit','92.000','/µL','150.000–400.000','L'],['Hematokrit','42','%','40–50',''],['Leukosit','3.400','/µL','4.000–11.000','L'],['Hemoglobin','14,5','g/dL','13–17','']]},
      sections:[{lines:[
        {id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam/nyeri'},
        {id:'l2', t:'R/ Oralit / cairan oral 2–2,5 L per hari', s:'S minum bertahap sepanjang hari'},
        {id:'l3', t:'R/ Edukasi tanda bahaya (mimisan, nyeri perut hebat, muntah terus) & cek lab tiap 24 jam', s:''}]}],
      why:'Aman! Penanganan demam dengue tanpa tanda bahaya (SKDI 4A) sudah benar: antipiretik hanya paracetamol (tanpa NSAID/aspirin), rehidrasi oral cukup, edukasi tanda bahaya, dan pemantauan trombosit-hematokrit serial.' },

    /* ---------- 54–56: Kasus Aman dengan Jebakan JKN (Malam 5+) ---------- */
    { type:'resep', sign:'dr. Anindya', flaw:null, needs:'jkn', topic:'aman',
      pt:{nama:'Ny. Endang Sulastri', lahir:'1966-08-30', jk:'P', rm:'02-56-48', bb:'61 kg', dx:'Hipertensi, nyeri kepala', alergi:'Tidak ada', cat:''},
      ktp:{wil:'3204', kec:'11', sn:'0004', tl:'GARUT', alamat:'KP. SUKAMAJU RT 01/04', agama:'ISLAM', kawin:'KAWIN', kerja:'PEDAGANG', goldar:'A'},
      jkn:{nama:'ENDAH SULASTRI', lahir:'1969-01-14'},
      sections:[{lines:[
        {id:'l1', t:'R/ Amlodipin tab 5 mg', s:'S 1 dd tab I pagi'},
        {id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri kepala'},
        {id:'l3', t:'R/ Edukasi: kontrol tekanan darah ke puskesmas', s:''}]}],
      why:'Aman. Kartu JKN-nya memang milik adiknya, tetapi kartu pasien, KTP, dan gelang semuanya cocok. Kartu JKN hanya untuk penjaminan. Urusan administrasi diselesaikan terpisah dan tidak boleh menunda pelayanan.' },

    { type:'instruksi', sign:'dr. Wulan, Sp.OT', flaw:null, needs:'jkn', topic:'aman',
      pt:{nama:'Tn. Bambang Sutrisno', lahir:'1979-05-05', jk:'L', rm:'04-17-83', bb:'80 kg', dx:'Vulnus laceratum lengan bawah kiri', alergi:'Tidak ada', cat:'Luka terkena seng, perdarahan sudah terkontrol'},
      ktp:{wil:'3275', kec:'06', sn:'0002', tl:'KARAWANG', alamat:'JL. BOULEVARD HIJAU NO. 4', agama:'KRISTEN', kawin:'KAWIN', kerja:'BURUH HARIAN LEPAS', goldar:'O'},
      jkn:{status:'TIDAK AKTIF'},
      sections:[{lines:[
        {id:'l1', cols:['Jahit luka (hecting)','6 jahitan','—','Dengan anestesi lokal']},
        {id:'l2', cols:['Paracetamol','500 mg','PO','Tiap 8 jam bila nyeri']},
        {id:'l3', cols:['Profilaksis tetanus','—','IM','Sesuai status imunisasi']}]}],
      why:'Aman. Status JKN tidak aktif adalah urusan administrasi. Dalam keadaan gawat darurat, rumah sakit dilarang menolak pasien atau mendahulukan urusan administrasi (UU 17/2023 Pasal 174). Tindakannya sendiri sudah sesuai.' },

    { type:'soap', sign:'c. Dimas', flaw:null, needs:'jkn', topic:'aman',
      pt:{nama:'Ny. Sumarni', lahir:'1962-04-26', jk:'P', rm:'01-19-55', bb:'57 kg', dx:'Hipoglikemia berat e.c. glibenklamid, DM tipe 2', alergi:'Tidak ada', cat:'Keringat dingin, bicara melantur, minum glibenklamid pagi tadi tanpa sarapan'},
      ktp:{wil:'3201', kec:'02', sn:'0005', tl:'BOGOR', alamat:'JL. RAYA PARUNG NO. 28', agama:'ISLAM', kawin:'KAWIN', kerja:'MENGURUS RUMAH TANGGA', goldar:'O'},
      lab:{rows:[['GDS','46','mg/dL','< 200','L'],['Kalium','4,1','mmol/L','3,5–5,0',''],['Kreatinin','1,0','mg/dL','0,6–1,1','']]},
      jkn:{status:'TIDAK AKTIF'},
      sections:[
        {h:'S · Subjective', lines:[{id:'s1', t:'Keluarga melapor pasien keringat dingin, gemetar, dan mulai bicara melantur sejak 30 menit lalu.'}]},
        {h:'O · Objective', lines:[{id:'o1', t:'GCS 13 (E3V4M6), TD 136/84, N 104, GDS stik & lab 46 mg/dL.'}]},
        {h:'A · Assessment', lines:[{id:'a1', t:'Hipoglikemia berat e.c. sulfonilurea (glibenklamid).'}]},
        {h:'P · Plan', lines:[
          {id:'p1', t:'Dekstrosa 40% 50 mL (20 g) IV bolus pelan segera.'},
          {id:'p2', t:'Cek GDS ulang 15 menit (target > 100 mg/dL), stop glibenklamid, observasi 24 jam.'}]}],
      why:'Aman! Tatalaksana hipoglikemia berat akibat glibenklamid (bolus D40% 50 mL IV, cek ulang 15 mnt, dan observasi 24 jam karena kerja glibenklamid panjang) sudah tepat. JKN tidak aktif tidak boleh menunda penanganan kegawatdaruratan (UU 17/2023 Pasal 174).' }
  ];

  /* ================= PENAMPILAN PASIEN (56 karakter unik) ================= */
  const APPEAR = {
    'Tn. Budi Santoso':        {look:{sk:1, hair:'short', shirt:'#3b6ea8'}, say:'Dok, dada saya berdebar-debar dari sore. Sesak juga.'},
    'An. Raka Pratama':        {look:{kid:1, sk:1, hair:'kid', shirt:'#e0a82e', blush:1}, comp:{sk:1, hair:'short', must:1, shirt:'#556b2f'}, say:'Anak saya panas dua hari, Dok. Batuk pilek juga.'},
    'Ny. Rukmini':             {look:{sk:2, hijab:'#7a4b8c', old:1, glasses:1, shirt:'#7a4b8c'}, say:'Sesak, Dok... nggak bisa tidur telentang.'},
    'Ny. Sari Wulandari':      {look:{sk:1, hijab:'#2f6f6a', old:1, shirt:'#2f6f6a'}, say:'Dada kiri saya sakit sekali, Dok, sampai ke lengan.'},
    'Tn. Dimas Aditya':        {look:{sk:2, hair:'spiky', shirt:'#b33a3a'}, say:'Tenggorokan sakit banget buat nelan, Dok.'},
    'Ny. Dewi Lestari':        {look:{sk:1, hijab:'#d98aa6', shirt:'#d98aa6'}, say:'Kepala saya pusing terus, Dok. Saya lagi hamil.'},
    'Tn. Hartono':             {look:{sk:0, hair:'side', hc:'#5d5853', glasses:1, shirt:'#cfc7b2'}, say:'Gula saya tinggi lagi, Dok. Kencing juga sedikit.'},
    'An. Nadia Putri':         {look:{kid:1, small:1, sk:1, hair:'pig', shirt:'#e86f8a', blush:1}, comp:{sk:1, hijab:'#3f5fa8', shirt:'#3f5fa8'}, say:'Mencret terus dari kemarin, Dok. Ini KIA-nya.'},
    'Tn. Agus Wibowo':         {look:{sk:2, hair:'short', must:1, glasses:1, shirt:'#6b7b8c'}, fotoStyle:{glasses:0}, say:'Ulu hati perih, Dok. Ini KTP saya, memang KTP lama.'},
    'Tn. Slamet Riyadi':       {look:{sk:3, hair:'bald', hc:'#a29f99', old:1, must:1, shirt:'#8a6a3a'}, say:'Saya muntah darah tadi pagi, Dok. BAB-nya hitam.'},
    'Ny. Lina Marlina':        {look:{sk:0, hair:'long', hc:'#2a1d16', shirt:'#4f8a5a'}, say:'Jatuh di tangga, tangan saya nggak bisa digerakkan.'},
    'Tn. Hendra Wijaya':       {look:{sk:1, hair:'side', hc:'#3c322b', must:1, shirt:'#3a5d7c'}, say:'Dada saya terasa tertekan, Dok. Tadi sore sempat minum obat kuat.'},
    'Tn. Dedi Kurniawan':      {look:{sk:2, hair:'short', hc:'#7d7a74', old:1, shirt:'#6b4b3e'}, say:'Jempol kaki kanan saya bengkak merah nyeri banget dari semalam, Dok.'},
    'An. Farhan Maulana':      {look:{kid:1, small:1, sk:1, hair:'kid', shirt:'#3da5d9', blush:1}, comp:{sk:1, hair:'short', shirt:'#4f6d7a'}, say:'Anak saya disengat lebah langsung bengkak dan sesak, Dok!'},
    'An. Aisyah Zahra':        {look:{kid:1, sk:0, hair:'pig', shirt:'#f28482', blush:1}, comp:{sk:0, hijab:'#84a59d', shirt:'#84a59d'}, say:'Badannya penuh lenting cacar air dan panas tinggi, Dok.'},
    'An. Gilang Ramadhan':     {look:{kid:1, small:1, sk:1, hair:'kid', shirt:'#f6bd60', blush:1}, comp:{sk:1, hijab:'#6d597a', shirt:'#6d597a'}, say:'Tolong, Dok! Anak saya barusan kejang pas demam tinggi!'},
    'Ny. Kartika Sari':        {look:{sk:0, hijab:'#e07a5f', shirt:'#e07a5f'}, say:'Perih kalau buang air kecil, Dok. Saya hamil tiga bulan.'},
    'Ny. Rahmawati Dewi':      {look:{sk:1, hijab:'#5c80bc', shirt:'#5c80bc'}, say:'Punggung bawah saya pegal banget, Dok. Hamil sudah delapan bulan.'},
    'Tn. Suryadi':             {look:{sk:2, hair:'short', must:1, shirt:'#6b705c'}, say:'Bisul di lengan saya barusan dibersihkan, Dok. Saya alergi berat obat sulfa.'},
    'Ny. Melati Kusumaningrum':{look:{sk:1, hair:'bob', hc:'#2f221c', glasses:1, shirt:'#9d8189'}, say:'Pipi saya nyeri dan pilek kental hijau sepuluh hari, Dok. Saya alergi penisilin.'},
    'An. Danu Pratama':        {look:{kid:1, sk:2, hair:'kid', shirt:'#4a5759', blush:1}, comp:{sk:2, hijab:'#b5838d', shirt:'#b5838d'}, say:'Koreng bernanah di kaki anak saya makin melebar, Dok.'},
    'Ny. Kartini':             {look:{sk:2, hijab:'#8e9aaf', old:1, glasses:1, shirt:'#8e9aaf'}, say:'Pinggang kanan saya nyeri melilit sampai tembus ke depan, Dok.'},
    'Ny. Ratih Permata':       {look:{sk:1, hijab:'#577590', shirt:'#577590'}, say:'Demam saya naik tiap sore sudah enam hari, Dok. Saya lagi hamil tujuh bulan.'},
    'Ny. Yuliana':             {look:{sk:1, hijab:'#b56576', shirt:'#b56576'}, say:'Saya kontrol hamil tiga bulan, Dok. Obat darah tinggi saya masih boleh dilanjut?'},
    'An. Bagas Pratama':       {look:{kid:1, sk:2, hair:'spiky', shirt:'#43aa8b', blush:1}, comp:{sk:2, hair:'short', must:1, shirt:'#277da1'}, say:'Kaki anak saya baru selesai dijahit, sekarang mengeluh nyeri, Dok.'},
    'Tn. Ridwan Hakim':        {look:{sk:1, hair:'spiky', shirt:'#f3722c'}, say:'Habis makan udang badan saya langsung bentol dan tenggorokan seret, Dok!'},
    'Ny. Lestari Handayani':   {look:{sk:0, hijab:'#6a994e', shirt:'#6a994e'}, say:'Kepala saya sakit hebat sama mata berkunang, Dok. Tensi tinggi sekali.'},
    'An. Zahra Salsabila':     {look:{kid:1, small:1, sk:0, hair:'pig', shirt:'#ffafcc', blush:1}, comp:{sk:0, hair:'short', shirt:'#52796f'}, say:'Batuknya bunyi keras menggonggong dari semalam, Dok.'},
    'Tn. Fajar Nugroho':       {look:{sk:2, hair:'short', glasses:1, shirt:'#3d5a80'}, say:'Amandel bengkak sakit buat nelan, Dok. Saya alergi penisilin ya.'},
    'Ny. Nurhayati':           {look:{sk:2, hijab:'#bc6c25', old:1, shirt:'#bc6c25'}, say:'Asma saya kambuh, Dok, napasnya bunyi mengi.'},
    'Ny. Maya Kusuma':         {look:{sk:0, hair:'bob', hc:'#3a2418', shirt:'#c47a3a'}, say:'Perih kalau pipis, Dok. Anyang-anyangan.'},
    'Tn. Joko Susilo':         {look:{sk:2, hair:'short', shirt:'#2f4f6f'}, foto:{sk:2, hair:'bald', hc:'#c4c1bb', old:1, must:1, glasses:1, shirt:'#5a4a3a'}, say:'Pegal semua habis futsal, Dok. Ini KTP-nya.'},
    'Ny. Siti Rahmawati':      {look:{sk:1, hijab:'#a33b3b', shirt:'#a33b3b'}, say:'Perdarahan saya belum berhenti, Dok. Lemas sekali.'},
    'An. Bima Saputra':        {look:{kid:1, sk:2, hair:'kid', shirt:'#3a8ac4', blush:1}, foto:{kid:1, sk:2, hair:'spiky', glasses:1, shirt:'#f2f2f2'}, comp:{sk:2, hijab:'#4a7a3a', shirt:'#4a7a3a'}, say:'Telinganya sakit, Dok, rewel terus. Ini kartu anaknya.'},
    'Ny. Ratna Kurniasih':     {look:{sk:1, hijab:'#c9a23a', shirt:'#c9a23a'}, foto:{sk:3, hijab:'#2a2a4a', glasses:1, shirt:'#2a2a4a'}, say:'Diare sama mual dari semalam, Dok.'},
    'Tn. Arif Budiman':        {look:{sk:1, hair:'side', shirt:'#2a9d8f'}, say:'Badan gatal bentol-bentol habis bersih-bersih gudang, Dok.'},
    'An. Keisha Amanda':       {look:{kid:1, sk:0, hair:'long', hc:'#2b1e16', shirt:'#e76f51', blush:1}, foto:{kid:1, sk:3, hair:'pig', glasses:1, shirt:'#264653'}, comp:{sk:0, hijab:'#457b9d', shirt:'#457b9d'}, say:'Anak saya mengeluh perih setiap pipis, Dok. Ini KIA-nya.'},
    'Tn. Wahyu Pratama':       {look:{sk:2, hair:'short', must:1, shirt:'#5e60ce'}, foto:{sk:0, hair:'bald', glasses:1, old:1, shirt:'#6c757d'}, say:'Tiba-tiba biduran di badan, Dok. Ini KTP yang saya bawa.'},
    'Tn. Andi Firmansyah':     {look:{sk:2, hair:'short', must:1, shirt:'#e07b39'}, say:'Kaki kanan saya bengkak merah, Dok, panas sekali.'},
    'Ny. Wati Susanti':        {look:{sk:1, hijab:'#5aa9e6', shirt:'#5aa9e6'}, say:'Kepala saya berat, Dok. Obat tensi saya habis.'},
    'Ny. Sri Mulyani':         {look:{sk:1, hijab:'#2b9348', shirt:'#2b9348'}, say:'Perut kanan atas nyeri hebat habis makan gorengan, Dok.'},
    'Tn. Eko Prasetyo':        {look:{sk:3, hair:'short', shirt:'#0077b6'}, foto:{sk:0, hair:'bald', hc:'#d0ccc4', old:1, must:1, glasses:1, shirt:'#7f4f24'}, say:'Tenggorokan agak serak, Dok. Ini KTP saya.'},
    'Tn. Darmawan':            {look:{sk:3, hair:'bald', hc:'#c9c6c0', old:1, shirt:'#7d8b99'}, say:'Lemas sekali, Dok... jadwal cuci darah saya terlewat.'},
    'Ny. Ningsih':             {look:{sk:1, hijab:'#9b6bd6', old:1, glasses:1, shirt:'#9b6bd6'}, comp:{sk:1, hair:'long', hc:'#2a1d16', shirt:'#4fb0a5'}, say:'Ibu saya susah dibangunkan dari tadi, Dok!'},
    'Nn. Putri Anggraini':     {look:{sk:0, hair:'long', hc:'#2a1d16', shirt:'#ff8fb1'}, say:'Demam empat hari, Dok. Badan pegal semua.'},
    'Tn. Yusuf Hidayat':       {look:{sk:2, hair:'side', hc:'#3b2a22', must:1, shirt:'#3a6ea5'}, say:'BAB saya hitam, Dok. Lemas, mau pingsan.'},
    'Tn. Bahrudin':            {look:{sk:2, hair:'short', shirt:'#c8553d'}, say:'Demam saya naik terus tiap malam sudah enam hari, Dok, badan lemas.'},
    'Ny. Hasanah':             {look:{sk:1, hijab:'#7209b7', glasses:1, shirt:'#7209b7'}, say:'Mata saya kuning dan mual terus dari tiga hari lalu, Dok.'},
    'Tn. Gunawan':             {look:{sk:2, hair:'side', hc:'#8d8a85', old:1, shirt:'#457b9d'}, say:'Lutut kanan saya ngilu buat jalan, Dok. Tadi sudah cek lab ginjal.'},
    'Ny. Mawar Indah':         {look:{sk:0, hijab:'#e5989b', old:1, shirt:'#e5989b'}, say:'Saya kontrol gula, Dok, tapi belakangan sering gemetar kalau telat makan.'},
    'Tn. Ruslan Effendi':      {look:{sk:2, hair:'short', must:1, shirt:'#386641'}, say:'Ulu hati agak perih saja, Dok, tapi kok dibilang harus dirawat hepatitis?'},
    'Tn. Rudi Hartanto':       {look:{sk:1, hair:'spiky', shirt:'#4caf50'}, say:'Kaki kram terus, Dok, habis diare dua hari.'},
    'Tn. Ridho Saputra':       {look:{sk:2, hair:'short', shirt:'#3d405b'}, say:'Demam tiga hari dan pegal di belakang mata, Dok. Ini hasil lab darah saya.'},
    'Ny. Endang Sulastri':     {look:{sk:2, hijab:'#e5734f', shirt:'#e5734f'}, say:'Kepala nyut-nyutan, Dok. Kartu JKN saya ketinggalan, ini punya adik saya.'},
    'Tn. Bambang Sutrisno':    {look:{sk:3, hair:'short', shirt:'#f2b632'}, say:'Tangan saya kena seng, Dok. Kata petugas JKN saya nunggak...'},
    'Ny. Sumarni':             {look:{sk:1, hijab:'#4ea8de', old:1, shirt:'#4ea8de'}, comp:{sk:1, hair:'short', shirt:'#5390d9'}, say:'Ibu saya keringat dingin dan ngelantur, Dok. Maaf JKN-nya lagi tidak aktif...'}
  };

  /* ================= TOPIK & 5 MALAM + MODE SULIT (5 MENIT / KASUS, SKDI DOKTER UMUM) ================= */
  const TOPICS = {
    dosis:    {label:'Dosis & satuan', tip:'Hitung dosis anak dengan mg/kgBB × BB, cek batas lansia/maks harian, rute IM vs IV, dan satuan (1 g = 1.000 mg). Gunakan Kalkulator (K).'},
    alergi:   {label:'Alergi obat', tip:'Cocokkan kotak alergi di kartu pasien dengan GOLONGAN obat (mis. penisilin → amoksisilin / co-amoxiclav; sulfa → kotrimoksazol).'},
    kontra:   {label:'Kontraindikasi & interaksi', tip:'Periksa kondisi khusus SKDI dokter umum (asma, hamil, ginjal, GI bleed, gout akut, anak < 8 / < 12 th) dan interaksi (nitrat + sildenafil). Cek tab Obat (B).'},
    identitas:{label:'Identitas pasien', tip:'Pakai lup (P) untuk mencocokkan nama, tanggal lahir, alamat, dan wajah di setiap dokumen, termasuk gelang dan lembar lab.'},
    lab:      {label:'Interpretasi lab', tip:'Perhatikan nilai bertanda H/L (K, GDS, trombosit, leukosit, SGOT/SGPT, kreatinin/eGFR), lalu cek apakah obat di berkas memperburuk kondisi itu.'},
    aman:     {label:'Berkas aman', tip:'Jangan asal tolak. KTP lama, foto lama, obat alternatif non-alergi, atau status JKN tidak aktif bukan alasan menolak berkas gawat darurat.'}
  };
  const TOPIC_ORDER = ['dosis','alergi','kontra','identitas','lab','aman'];

  const NIGHTS = [null,
    {title:'Resep & klinis', limit:300, mix:[['clin',4],['safe',2]], feats:[],
      memo:['Cocokkan isi berkas (kasus SKDI dokter umum) dengan <b>kartu pasien</b>: alergi obat, berat badan anak/lansia, interaksi obat, dan kondisi seperti hamil, asma, gout akut, ginjal, atau perdarahan.',
        'Cek <b>satuan & rute</b> (1 gram = 1.000 mg, epinefrin anafilaksis IM bukan IV bolus).',
        'Ada yang salah? Sorot barisnya dengan <b>stabilo</b>, lalu cap <b>TOLAK</b>. Aman? Cap <b>ACC</b>. Menolak berkas yang benar juga merugikan pasien.',
        'Waktu tiap berkas <b>5 menit</b>. Ragu dosis/kontraindikasi? Buka <b>Kalkulator</b> (K) atau <b>Panduan</b> (B).']},
    {title:'Kartu identitas', limit:300, mix:[['id',2],['clin',2],['safe',2]], feats:['ktp','lup'],
      memo:['Pasien dewasa membawa <b>KTP</b>, anak membawa <b>KIA</b>. Nama, tanggal lahir, dan alamat harus sama dengan kartu pasien.',
        'Nama dan tanggal lahir di <b>berkas</b> juga harus cocok dengan kartu pasien.',
        'Pakai <b>lup</b> (P): klik dua data, garis hijau berarti cocok, merah berarti tidak cocok.',
        'Wajar, jangan ditolak: sapaan Tn./Ny. tidak tercantum di KTP, dan KTP-el lama yang tanggal berlakunya lewat tetap sah.']},
    {title:'Wajah & gelang', limit:300, mix:[['gelang',2],['id',1],['clin',1],['safe',2]], feats:['ktp','lup','wajah','gelang'],
      memo:['Bandingkan <b>wajah</b> orang di loket dengan foto KTP/KIA. Foto lama boleh beda kacamata atau kumis, tapi orangnya harus sama.',
        'Setiap pasien memakai <b>gelang identitas</b> dari triase: biru untuk laki-laki, merah muda untuk perempuan, dan stiker merah berarti alergi.',
        'Nama dan tanggal lahir di gelang harus cocok. Gelang yang tertukar berarti risiko salah pasien.']},
    {title:'Hasil lab', limit:300, mix:[['lab',3],['id|gelang',1],['clin',1],['safe',2]], feats:['ktp','lup','wajah','gelang','lab'],
      memo:['Sebagian pasien datang dengan <b>hasil lab</b>. Nilai bertanda <b>H</b> berarti tinggi, <b>L</b> berarti rendah.',
        'Tanyakan: apakah obat di berkas berbahaya untuk hasil lab itu? (Mis. K tinggi + KCl, GDS rendah + insulin, trombosit dengue + ibuprofen, leukopenia tifoid + kloramfenikol, SGOT/SGPT tinggi + simvastatin, kreatinin tinggi + NSAID/glibenklamid).',
        'Lembar lab juga punya identitas. Lab milik pasien lain tidak boleh jadi dasar tindakan.']},
    {title:'Jaminan (JKN)', limit:300, mix:[['lab',2],['gelang',1],['id',1],['clin',1],['safe',3]], feats:['ktp','lup','wajah','gelang','lab','jkn'],
      memo:['Pasien membawa <b>kartu JKN</b>. Kartu ini hanya untuk penjaminan, bukan penanda keselamatan pasien.',
        '<b>Jangan menolak</b> berkas karena masalah JKN, misalnya kartu tidak aktif atau kartu milik keluarga. Dalam keadaan gawat darurat, rumah sakit dilarang menolak pasien atau mendahulukan urusan administrasi (UU 17/2023 Pasal 174).',
        'Semua aturan malam 1–4 tetap berlaku. Total 8 berkas, masing-masing 5 menit.']},
    {title:'Mode Sulit', hard:true, limit:300, mix:[['flaw',7],['safe',3]], feats:['ktp','lup','wajah','gelang','lab','jkn'],
      memo:['Menggunakan <b>generator kasus acak SKDI dokter umum</b>: pasien (wajah, nama, tanggal lahir, alamat) dan jenis kesalahannya diacak dari templat sehingga diagnosis yang sama bisa punya kesalahan berbeda.',
        'Semua jenis kesalahan bisa muncul: dosis ×10, satuan mg/g tertukar, alergi segolongan, kontraindikasi kehamilan/ginjal, interaksi obat (warfarin + NSAID, ISDN + sildenafil), rute salah, hingga KTP keluarga & hasil lab.',
        'Jumlah berkas yang salah juga acak. Waktu per berkas <b>5 menit</b>, tanpa petunjuk daftar cek di bawah meja.']}
  ];

  /* ================= PANDUAN OBAT TERVERIFIKASI (85 OBAT) =================
     Struktur tiap obat:
     n   = Nama generik
     alt = Sinonim / nama lain (opsional, ikut dicari)
     cls = Golongan farmakologi
     ind = Indikasi klinis utama
     d   = Dosis dewasa & batas maksimum
     a   = Dosis anak (mg/kgBB & batas usia)
     kh  = Kehamilan, menyusui & penyesuaian ginjal/hati
     ki  = Kontraindikasi
     int = Interaksi penting (opsional)
     es  = Efek samping utama & monitoring/antidot */

  /* Bagian A: Analgesik, Antibiotik, Saluran Cerna, Antihistamin, Antidot/Lainnya */
  const DRUGS_A = [
   {n:'Paracetamol', alt:'Asetaminofen PCT', cls:'Analgesik-antipiretik',
    ind:'Nyeri ringan–sedang, demam (termasuk demam dengue dan kehamilan).',
    d:'500–1.000 mg PO/IV tiap 4–6 jam (IV 1 g bila BB ≥ 50 kg tiap 6 jam; bila BB < 50 kg: 15 mg/kg/kali maks 3 g/hari). Maks dewasa sehat 4 g/hari (maks 2–3 g/hari pada gangguan hati, alkoholik kronik, atau malnutrisi).',
    a:'10–15 mg/kgBB/kali PO/rektal tiap 4–6 jam (maks 60–75 mg/kgBB/hari, tidak melebihi 4 g/hari). IV anak < 33 kg: 15 mg/kgBB/kali tiap 6 jam.',
    kh:'Aman pada kehamilan & menyusui (pilihan lini pertama). Turunkan batas harian pada gangguan hati; aman pada gagal ginjal.',
    ki:'Gagal hati berat/aktif, hipersensitivitas.',
    int:'Alkohol kronik dan inducer enzim hati (fenitoin, karbamazepin, isoniazid) meningkatkan risiko hepatotoksisitas.',
    es:'Sangat jarang pada dosis terapi. Overdosis: nekrosis hati akut (antidot: N-asetilsistein / NAC).'},

   {n:'Ibuprofen', alt:'NSAID', cls:'NSAID (non-selektif)',
    ind:'Nyeri ringan–sedang, demam, inflamasi, dismenore, nyeri muskuloskeletal.',
    d:'200–400 mg PO tiap 6–8 jam sesudah makan. Maks 1.200 mg/hari tanpa pengawasan (maks 2.400 mg/hari dengan pengawasan dokter).',
    a:'5–10 mg/kgBB/kali tiap 6–8 jam (usia ≥ 6 bulan). Maks 40 mg/kgBB/hari (maks 400 mg/dosis).',
    kh:'Hindari kehamilan ≥ 20 minggu & KONTRAINDIKASI trimester 3 (penutupan dini duktus arteriosus, oligohidramnion). Hindari bila eGFR < 30 atau dehidrasi berat.',
    ki:'Ulkus/perdarahan GI aktif, demam dengue / trombositopenia, gagal ginjal berat, gagal jantung berat, pasca-CABG, kehamilan trimester 3, asma sensitif aspirin/NSAID.',
    int:'Warfarin/antikoagulan (risiko perdarahan GI berat), ACEi/ARB + diuretik ("triple whammy" gagal ginjal akut), litium, metotreksat.',
    es:'Dispepsia, ulkus/perdarahan lambung, cedera ginjal akut, retensi cairan/hipertensi.'},

   {n:'Natrium diklofenak', alt:'Kalium diklofenak NSAID', cls:'NSAID (non-selektif)',
    ind:'Nyeri akut sedang, artritis, kolik ginjal, nyeri muskuloskeletal.',
    d:'50 mg PO 2–3 kali/hari sesudah makan. Maks 150 mg/hari.',
    a:'1–3 mg/kgBB/hari terbagi 2–3 dosis (hanya bila perlu, usia > 1 tahun; umumnya pilih ibuprofen/paracetamol).',
    kh:'Kontraindikasi kehamilan trimester 3 (hindari ≥ 20 minggu). Hindari pada eGFR < 30 dan gangguan hati berat.',
    ki:'Ulkus/perdarahan saluran cerna aktif, penyakit jantung iskemik/serebrovaskular/PAD, gagal jantung NYHA II–IV, gagal ginjal berat, demam dengue/trombositopenia, kehamilan trimester 3.',
    int:'Antikoagulan/antiplatelet (perdarahan GI), ACEi/ARB/diuretik (nefrotoksik), steroid sistemik (risiko ulkus meningkat).',
    es:'Iritasi/perdarahan lambung, peningkatan risiko trombosis kardiovaskular, cedera ginjal akut, peningkatan enzim hati.'},

   {n:'Ketorolak', alt:'NSAID injeksi', cls:'NSAID injeksi poten',
    ind:'Nyeri akut sedang–berat jangka pendek (pascaoperasi, kolik ureter/ginjal). Durasi total IV+PO MAKS 5 HARI.',
    d:'10–30 mg IV/IM tiap 6–8 jam. Maks 90 mg/hari (dewasa < 65 th, BB ≥ 50 kg). Pada usia ≥ 65 tahun, BB < 50 kg, atau gangguan ginjal ringan: 10–15 mg tiap 6–8 jam, MAKS 60 mg/hari.',
    a:'0,5 mg/kgBB IV/IM per kali (maks 15 mg/dosis) tiap 6–8 jam (hanya jangka pendek oleh dokter).',
    kh:'Kontraindikasi kehamilan, persalinan, menyusui, dan gagal ginjal sedang–berat.',
    ki:'Perdarahan GI/serebrovaskular, ulkus peptikum aktif, gangguan ginjal sedang–berat, demam dengue/trombositopenia, dehidrasi berat, hamil/menyusui, pemakaian bersama NSAID lain/antikoagulan.',
    int:'NSAID lain/aspirin/antikoagulan (perdarahan hebat), ACEi/ARB/diuretik (AKI).',
    es:'Perdarahan saluran cerna berat, cedera ginjal akut, perdarahan pascaoperasi, nyeri lambung.'},

   {n:'Tramadol', cls:'Opioid lemah (agonis μ + SNRI)',
    ind:'Nyeri akut atau kronik sedang–berat bila analgesik non-opioid tidak memadai.',
    d:'50–100 mg PO/IV pelan tiap 6–8 jam. Maks 400 mg/hari (maks 300 mg/hari pada usia > 75 th; perpanjang interval tiap 12 jam bila CrCl < 30).',
    a:'KONTRAINDIKASI anak < 12 tahun (dan < 18 tahun pasca-tonsilektomi/adenoidektomi karena risiko depresi napas fatal akibat metabolisme ultra-cepat CYP2D6).',
    kh:'Hindari saat hamil & menyusui. Kurangi dosis/perpanjang interval pada eGFR < 30 dan sirosis hati.',
    ki:'Anak < 12 tahun, epilepsi tidak terkontrol, intoksikasi alkohol/opioid/sedatif, gagal napas berat, pemakai MAOI (dalam 14 hari).',
    int:'SSRI/SNRI/TCA/MAOI (sindrom serotonin & penurunan ambang kejang), benzodiazepin/alkohol (depresi napas).',
    es:'Mual, muntah, pusing, mengantuk, konstipasi, kejang (dosis tinggi), sindrom serotonin, depresi napas.'},

   {n:'Morfin', cls:'Opioid kuat',
    ind:'Nyeri berat akut (trauma, infark miokard bila nyeri refrakter nitrat), nyeri kanker.',
    d:'2–4 mg IV pelan (encerkan), titrasi ulang tiap 5–15 menit sesuai respons & laju napas. IM/SC 5–10 mg tiap 4 jam.',
    a:'0,05–0,1 mg/kgBB IV pelan tiap 2–4 jam (titrasi dengan monitor SpO₂ & RR).',
    kh:'Gunakan hati-hati pada gagal ginjal (akumulasi metabolit aktif M6G → sedasi berkepanjangan) & gangguan hati berat. Hindari persalinan dekat lahir (depresi napas neonatus).',
    ki:'Depresi napas berat, asma akut berat/status asmatikus, ileus paralitik, hipotensi berat/syok, cedera kepala dengan penurunan kesadaran tanpa ventilasi terkontrol.',
    int:'Benzodiazepin/sedatif/alkohol (depresi napas fatal), MAOI.',
    es:'Depresi napas, sedasi, hipotensi, bradikardia, mual, retensi urin, konstipasi. Antidot: Nalokson IV.'},

   {n:'Amoksisilin', alt:'Penisilin beta-laktam', cls:'Antibiotik penisilin',
    ind:'Faringitis bakterial, otitis media akut, sinusitis bakterial, pneumonia komunitas ringan, ISK sensitif.',
    d:'500 mg PO tiap 8 jam (atau 875 mg tiap 12 jam). Faringitis streptokokus: 500 mg tiap 12 jam atau 1.000 mg 1×/hari selama 10 hari.',
    a:'25–50 mg/kgBB/hari terbagi 2–3 dosis; OMA & pneumonia komunitas dosis tinggi: 80–90 mg/kgBB/hari terbagi 2 dosis (maks 3–4 g/hari).',
    kh:'Aman pada kehamilan & menyusui. Sesuaikan interval tiap 12–24 jam bila eGFR < 30.',
    ki:'Alergi penisilin/beta-laktam (anafilaksis, SJS/TEN), mononukleosis infeksiosa (ruam berat).',
    int:'Metotreksat (menurunkan klirens), warfarin (dapat menaikkan INR ringan).',
    es:'Diare, mual, ruam kulit, reaksi alergi hingga anafilaksis.'},

   {n:'Amoksisilin–klavulanat (Co-amoxiclav)', alt:'Penisilin Augmentin', cls:'Antibiotik penisilin + penghambat beta-laktamase',
    ind:'Rinosinusitis bakterial akut, otitis media akut, gigitan hewan/manusia, infeksi kulit/pioderma, ISK hamil.',
    d:'625 mg (500/125 mg) PO tiap 8 jam atau 1.000 mg (875/125 mg) tiap 12 jam sesudah makan. Sesuaikan interval bila eGFR < 30.',
    a:'25–45 mg/kgBB/hari (komponen amoksisilin) terbagi 2–3 dosis (OMA: hingga 80–90 mg/kg/hari).',
    kh:'Aman pada kehamilan & menyusui. Hati-hati gangguan hati.',
    ki:'Alergi penisilin/beta-laktam (anafilaksis/SJS), riwayat ikterus kolestatik akibat co-amoxiclav.',
    es:'Diare, mual, ruam alergi, ikterus kolestatik jarang.'},

   {n:'Ampisilin–sulbaktam', alt:'Penisilin beta-laktam', cls:'Antibiotik penisilin + penghambat beta-laktamase',
    ind:'Infeksi intra-abdomen, kulit/jaringan lunak berat, pneumonia aspirasi, infeksi ginekologi.',
    d:'1,5–3 g IV tiap 6 jam (maks 12 g/hari). Sesuaikan interval tiap 12–24 jam bila CrCl < 30.',
    a:'100–200 mg/kgBB/hari (komponen ampisilin) terbagi 4 dosis IV.',
    kh:'Umumnya aman pada kehamilan. Wajib sesuaikan interval dosis pada gangguan ginjal.',
    ki:'Alergi penisilin (anafilaksis/reaksi berat), riwayat ikterus kolestatik akibat obat ini.',
    int:'Alopurinol (meningkatkan risiko ruam), metotreksat.',
    es:'Diare, ruam, flebitis, peningkatan enzim hati, anafilaksis.'},

   {n:'Seftriakson', alt:'Sefalosporin', cls:'Sefalosporin generasi 3',
    ind:'Meningitis bakterial, sepsis, pneumonia berat, demam tifoid berat, infeksi intra-abdomen, selulitis berat, gonore.',
    d:'1–2 g IV tiap 24 jam (infeksi berat/meningitis: 2 g IV tiap 12 jam). Tidak perlu penyesuaian dosis pada gagal ginjal murni.',
    a:'50–75 mg/kgBB/hari IV 1×/hari (maks 2 g/hari). Meningitis anak: 100 mg/kgBB/hari dibagi 1–2 dosis (maks 4 g/hari).',
    kh:'Aman pada kehamilan. KONTRAINDIKASI neonatus ≤ 28 hari dengan hiperbilirubinemia (risiko kernikterus).',
    ki:'Alergi sefalosporin, riwayat reaksi berat (SJS/TEN/DRESS) terhadap beta-laktam, neonatus hiperbilirubinemia, pencampuran dengan cairan berkalsium (RL/Ca glukonas) IV pada neonatus.',
    int:'Cairan mengandung kalsium (Ringer Laktat, Ca glukonas) → risiko presipitasi kalsium-seftriakson fatal pada neonatus!',
    es:'Diare, flebitis, ruam, biliary sludge/pseudolitiasis, eosinofilia.'},

   {n:'Sefotaksim', alt:'Sefalosporin', cls:'Sefalosporin generasi 3',
    ind:'Sepsis neonatus/anak/dewasa, meningitis, pneumonia berat, SBP (peritonitis bakterial spontan).',
    d:'1–2 g IV tiap 8 jam (meningitis: 2 g IV tiap 4–6 jam). Kurangi frekuensi bila CrCl < 20.',
    a:'100–200 mg/kgBB/hari IV terbagi 3–4 dosis (lebih aman daripada seftriakson pada neonatus).',
    kh:'Aman pada kehamilan dan neonatus (tidak menggeser bilirubin & tidak presipitasi dengan kalsium).',
    ki:'Alergi sefalosporin.',
    es:'Diare, ruam, flebitis, jarang neutropenia.'},

   {n:'Sefiksim', alt:'Cefixime sefalosporin', cls:'Sefalosporin generasi 3 oral',
    ind:'ISK tanpa komplikasi (termasuk hamil/anak), demam tifoid anak, faringitis/OMA alternatif, gonore (kombinasi).',
    d:'200 mg PO tiap 12 jam atau 400 mg 1×/hari.',
    a:'8 mg/kgBB/hari PO dibagi 1–2 dosis (maks 400 mg/hari). Tifoid anak: 15–20 mg/kgBB/hari dibagi 2 dosis.',
    kh:'Aman pada kehamilan & menyusui. Turunkan dosis 25–50% bila CrCl < 60.',
    ki:'Alergi sefalosporin.',
    es:'Diare, mual, nyeri perut, ruam ringan.'},

   {n:'Siprofloksasin', alt:'Ciprofloxacin kuinolon', cls:'Fluorokuinolon',
    ind:'ISK komplikata/pielonefritis, prostatitis, diare bakterial berat/tifoid, infeksi tulang/sendi gram negatif.',
    d:'Sistitis tanpa komplikasi: 250 mg PO tiap 12 jam (3 hari). Pielonefritis/infeksi lain: 500 mg PO tiap 12 jam atau 400 mg IV tiap 8–12 jam. Sesuaikan bila CrCl < 30.',
    a:'Hindari rutin pada anak < 18 tahun (risiko artropati kartilago); bila mutlak perlu: 10–20 mg/kgBB/dosis tiap 12 jam (maks 750 mg/dosis).',
    kh:'KONTRAINDIKASI kehamilan & menyusui. Sesuaikan dosis pada gangguan ginjal.',
    ki:'Hamil, menyusui, riwayat tendinopati/ruptur tendon akibat kuinolon, miastenia gravis (memperburuk kelemahan otot!), pemakaian bersama tizanidin.',
    int:'Antasida/besi/kalsium/sukralfat (menurunkan absorpsi PO — beri jeda 2–4 jam), warfarin (naikkan INR), obat pemanjang QT, kortikosteroid (risiko ruptur tendon naik).',
    es:'Mual, pusing, tendinitis/ruptur tendon Achilles, perpanjangan QT, neuropati perifer, disglikemia.'},

   {n:'Levofloksasin', alt:'Kuinolon', cls:'Fluorokuinolon respiratorik',
    ind:'Pneumonia komunitas (rawat inap/komorbid), ISK komplikata, pielonefritis, sinusitis bakterial.',
    d:'500–750 mg PO/IV tiap 24 jam. Sesuaikan interval tiap 48 jam bila CrCl < 50.',
    a:'Hindari rutin pada anak < 18 tahun; hanya atas indikasi khusus dokter spesialis.',
    kh:'KONTRAINDIKASI hamil & menyusui. Wajib sesuaikan dosis pada CrCl < 50.',
    ki:'Hamil/menyusui, riwayat tendinopati kuinolon, miastenia gravis, sindrom QT panjang, epilepsi tak terkontrol.',
    int:'Antasida/mineral (jeda 2 jam), kortikosteroid (ruptur tendon), amiodaron/makrolida/ondansetron (QT panjang).',
    es:'Tendinitis/ruptur tendon, perpanjangan QT, hipo/hiperglikemia, pusing, delirium pada lansia.'},

   {n:'Metronidazol', cls:'Nitroimidazol (anaerob & antiprotozoa)',
    ind:'Infeksi bakteri anaerob, infeksi intra-abdomen, abses otak/hati, amebiasis, giardiasis, vaginosis bakterial, kolitis C. difficile.',
    d:'500 mg PO/IV tiap 8 jam. Amebiasis invasif: 500–750 mg tiap 8 jam selama 7–10 hari.',
    a:'7,5–10 mg/kgBB/kali PO/IV tiap 8 jam (maks 500 mg/kali).',
    kh:'Hindari kehamilan trimester 1 bila memungkinkan. Kurangi dosis 50% pada gangguan hati berat.',
    ki:'Hipersensitivitas; hindari alkohol selama terapi hingga 48 jam sesudahnya (reaksi disulfiram).',
    int:'Alkohol (muntah/flushing berat), warfarin (meningkatkan INR drastis!), litium.',
    es:'Rasa logam di mulut, mual, urin berwarna gelap, neuropati perifer (pemakaian lama).'},

   {n:'Gentamisin', alt:'Aminoglikosida', cls:'Aminoglikosida',
    ind:'Sepsis gram negatif, pielonefritis berat, endokarditis (kombinasi sinergis).',
    d:'5–7 mg/kgBB IV tiap 24 jam (extended-interval) atau 3–5 mg/kgBB/hari dibagi 3 dosis. WAJIB sesuaikan interval pada eGFR < 60.',
    a:'5–7,5 mg/kgBB/hari IV dibagi 1–3 dosis (sesuaikan usia gestasi pada neonatus & fungsi ginjal).',
    kh:'KONTRAINDIKASI kehamilan (ototoksisitas saraf VIII janin). Wajib pantau kreatinin & kadar obat pada gangguan ginjal.',
    ki:'Alergi aminoglikosida, miastenia gravis, hamil, gagal ginjal berat tanpa penyesuaian dosis/pemantauan.',
    int:'Loop diuretik/furosemid & vankomisin/NSAID (risiko nefrotoksik & ototoksik meningkat tajam).',
    es:'Nefrotoksisitas (nekrosis tubular akut), ototoksisitas (tuli/vertigo ireversibel), blokade neuromuskular.'},

   {n:'Azitromisin', alt:'Makrolida', cls:'Antibiotik makrolida',
    ind:'Pneumonia atipikal, faringitis/ISPA pada alergi penisilin, tifoid ringan, infeksi klamidia/IMS.',
    d:'500 mg PO 1×/hari selama 3 hari (atau 500 mg hari ke-1 lanjut 250 mg hari 2–5). Klamidia: 1 g dosis tunggal.',
    a:'10 mg/kgBB PO 1×/hari selama 3 hari (maks 500 mg/hari).',
    kh:'Umumnya aman pada kehamilan & menyusui. Hati-hati gangguan hati berat.',
    ki:'Alergi makrolida, riwayat ikterus kolestatik akibat azitromisin; hati-hati QT panjang/hipokalemia.',
    int:'Obat pemanjang QT (amiodaron, haloperidol, fluorokuinolon), warfarin (pantau INR).',
    es:'Mual, diare, kram perut, perpanjangan interval QT (jarang torsades de pointes).'},

   {n:'Klindamisin', cls:'Linkosamid',
    ind:'Infeksi kulit/jaringan lunak (termasuk MRSA komunitas/abses), faringitis/infeksi gigi pada alergi penisilin, pneumonia aspirasi.',
    d:'300–450 mg PO tiap 6–8 jam; IV 600 mg tiap 8 jam.',
    a:'20–40 mg/kgBB/hari PO/IV terbagi 3–4 dosis (maks 1,8 g/hari PO).',
    kh:'Aman pada kehamilan (pilihan alternatif alergi penisilin). Tidak perlu penyesuaian dosis ginjal.',
    ki:'Alergi klindamisin/linkomisin, riwayat kolitis pseudomembranosa (C. difficile) berat.',
    es:'Diare, risiko kolitis C. difficile, ruam, rasa logam (IV).'},

   {n:'Kotrimoksazol', alt:'TMP-SMX Trimetoprim Sulfametoksazol Sulfa', cls:'Sulfonamid + penghambat folat',
    ind:'ISK sensitif, abses kulit/MRSA komunitas, profilaksis/terapi PCP (Pneumocystis jirovecii), shigelosis.',
    d:'Forte 960 mg (160/800 mg) PO tiap 12 jam selama 3–7 hari. Kurangi 50% bila CrCl 15–30; hindari bila CrCl < 15.',
    a:'8–10 mg/kgBB/hari (komponen TMP) terbagi 2 dosis (usia ≥ 2 bulan).',
    kh:'KONTRAINDIKASI kehamilan trimester 1 (antagonis folat) & trimester 3 (kernikterus), bayi < 2 bulan, dan eGFR < 15.',
    ki:'Alergi sulfonamid (terutama riwayat SJS/TEN!), defisiensi G6PD, anemia megaloblastik, gagal ginjal/hati berat, hamil trim 1 & 3, bayi < 2 bulan.',
    int:'Warfarin (meningkatkan INR drastis & perdarahan!), ACEi/ARB/spironolakton (hiperkalemia berat!), metotreksat, sulfonilurea (hipoglikemia).',
    es:'Ruam alergi hingga SJS/TEN, hiperkalemia, peningkatan kreatinin, supresi sumsum tulang.'},

   {n:'Doksisiklin', alt:'Tetrasiklin', cls:'Tetrasiklin',
    ind:'Leptospirosis ringan–sedang, pneumonia atipikal, malaria (profilaksis/kombinasi), infeksi kulit MRSA, servisitis klamidia.',
    d:'100 mg PO tiap 12 jam (diminum dengan segelas air penuh, jangan langsung berbaring 30 menit).',
    a:'Usia ≥ 8 tahun: 2–4 mg/kgBB/hari terbagi 2 dosis (maks 200 mg/hari). Hindari rutin < 8 tahun (kecuali infeksi mengancam jiwa jangka pendek).',
    kh:'KONTRAINDIKASI kehamilan & menyusui (pewarnaan gigi permanen & gangguan tulang janin). Aman pada gangguan ginjal.',
    ki:'Kehamilan, menyusui, anak < 8 tahun (relatif), alergi tetrasiklin.',
    int:'Antasida/susu/besi/kalsium (kelasi — beri jeda 2 jam), warfarin.',
    es:'Esofagitis pil, mual, fotosensitivitas kulit, pewarnaan gigi anak.'},

   {n:'Kloramfenikol', cls:'Amfenikol',
    ind:'Demam tifoid (bila sensitif), meningitis bakterial pada alergi beta-laktam berat.',
    d:'50 mg/kgBB/hari PO/IV terbagi 4 dosis (maks 2–4 g/hari).',
    a:'50–75 mg/kgBB/hari terbagi 4 dosis (meningitis: 75–100 mg/kgBB/hari). HINDARI NEONATUS.',
    kh:'KONTRAINDIKASI kehamilan trimester 3/persalinan & menyusui (gray baby syndrome). Kurangi dosis pada gangguan hati.',
    ki:'Neonatus (gray baby syndrome), pansitopenia/depresi sumsum tulang, alergi kloramfenikol, hamil trimester 3.',
    es:'Supresi sumsum tulang reversibel, anemia aplastik idiosinkratik (jarang tapi fatal), gray baby syndrome.'},

   {n:'Meropenem', alt:'Karbapenem', cls:'Antibiotik karbapenem',
    ind:'Sepsis berat/syok septik, infeksi nosokomial ESBL, meningitis bakterial berat, infeksi intra-abdomen berat.',
    d:'1 g IV tiap 8 jam (meningitis: 2 g IV tiap 8 jam). WAJIB kurangi dosis/interval bila CrCl < 50.',
    a:'20 mg/kgBB/dosis IV tiap 8 jam (meningitis: 40 mg/kgBB tiap 8 jam, maks 2 g/dosis).',
    kh:'Kategori aman relatif pada kehamilan. Sesuaikan dosis ketat pada gagal ginjal.',
    ki:'Alergi karbapenem atau reaksi anafilaksis berat beta-laktam (reaksi silang rendah < 1%, evaluasi klinis).',
    int:'Asam valproat (meropenem menurunkan kadar valproat darah drastis → memicu kejang!).',
    es:'Diare, ruam, flebitis, kejang (bila dosis tidak disesuaikan pada gagal ginjal).'},

   {n:'Omeprazol', alt:'PPI', cls:'Penghambat pompa proton (PPI)',
    ind:'Dispepsia, GERD, tukak lambung/duodenum, profilaksis ulkus NSAID.',
    d:'20–40 mg PO 1×/hari diminum 30–60 menit sebelum makan pagi.',
    a:'0,7–1 mg/kgBB/hari 1 dosis PO (maks 20–40 mg).',
    kh:'Relatif aman pada kehamilan & gagal ginjal.',
    ki:'Hipersensitivitas PPI, pemakaian bersama rilpivirin.',
    int:'Klopidogrel (omeprazol menghambat CYP2C19 → mengurangi aktivasi klopidogrel; gunakan pantoprazol pada pasien klopidogrel!).',
    es:'Sakit kepala, diare; pemakaian jangka panjang: hipomagnesemia, defisiensi B12, infeksi C. difficile.'},

   {n:'Pantoprazol', alt:'PPI', cls:'Penghambat pompa proton (PPI)',
    ind:'Perdarahan saluran cerna atas (UGIB), tukak lambung, GERD, profilaksis ulkus stres (aman bersama klopidogrel).',
    d:'40 mg PO/IV 1–2×/hari. Perdarahan GI atas akut: bolus 80 mg IV lanjut infus 8 mg/jam selama 72 jam ATAU 40 mg IV tiap 12 jam.',
    a:'1 mg/kgBB/hari IV/PO (maks 40 mg) bila ada indikasi.',
    kh:'Relatif aman pada kehamilan; tidak perlu penyesuaian dosis ginjal.',
    ki:'Hipersensitivitas PPI.',
    int:'Interaksi CYP2C19 minimal dibanding omeprazol (pilihan PPI terbaik untuk pasien klopidogrel).',
    es:'Sakit kepala, diare, nyeri perut, hipomagnesemia jangka panjang.'},

   {n:'Antasida DOEN', alt:'Aluminium hidroksida Magnesium hidroksida', cls:'Antasida penetral asam lambung',
    ind:'Dispepsia, nyeri ulu hati (heartburn), gastritis akut.',
    d:'1–2 tablet kunyah (atau 5–10 mL suspensi) 3–4×/hari, 1 jam sesudah makan dan sebelum tidur.',
    a:'Anak > 6 th: ½–1 tablet kunyah atau 5 mL suspensi bila perlu.',
    kh:'Aman pada kehamilan. Hati-hati gagal ginjal berat (risiko akumulasi magnesium & aluminium).',
    ki:'Gagal ginjal berat (eGFR < 30, terutama sediaan tinggi Mg/Al), hipofosfatemia berat.',
    int:'Mengikat fluorokuinolon, doksisiklin, zat besi, levotiroksin → beri jeda minimal 2 jam!',
    es:'Konstipasi (Al) atau diare (Mg), hipermagnesemia pada gagal ginjal.'},

   {n:'Sukralfat', cls:'Sitoprotektor mukosa lambung',
    ind:'Tukak lambung/duodenum, gastritis erosif, refluks empedu.',
    d:'1 gram (10 mL suspensi 500 mg/5 mL) PO 3–4×/hari saat perut kosong (1 jam sebelum makan).',
    a:'40–80 mg/kgBB/hari terbagi 4 dosis (bila diindikasikan spesialis).',
    kh:'Aman pada kehamilan (absorpsi sistemik minimal). Hati-hati gagal ginjal kronik (akumulasi aluminium).',
    ki:'Hipersensitivitas; hati-hati disfagia (risiko bezoar) & PGK berat.',
    int:'Menghambat absorpsi siprofloksasin, fenitoin, digoksin, levotiroksin, warfarin → beri jeda 2 jam!',
    es:'Konstipasi, mulut kering.'},

   {n:'Ondansetron', cls:'Antiemetik (antagonis 5-HT3)',
    ind:'Mual muntah akut (gastroenteritis, pascaoperasi, kemoterapi, migrain).',
    d:'4–8 mg IV pelan/PO tiap 8 jam. Maks 24 mg/hari (dosis tunggal IV maks 16 mg karena risiko QT).',
    a:'0,1–0,15 mg/kgBB/dosis IV/PO (maks 4 mg/dosis) tiap 8 jam.',
    kh:'Hati-hati kehamilan trimester 1 (diskusikan manfaat-risiko). Maks 8 mg/hari pada gangguan hati berat.',
    ki:'Sindrom QT panjang kongenital, pemakaian bersama apomorfin.',
    int:'Obat pemanjang QT (amiodaron, haloperidol, makrolida, kuinolon), SSRI/tramadol (sindrom serotonin).',
    es:'Sakit kepala, konstipasi, perpanjangan interval QT.'},

   {n:'Domperidon', cls:'Antiemetik prokinetik (antagonis D2 perifer)',
    ind:'Mual muntah jangka pendek pada dewasa & remaja ≥ 12 th (BB ≥ 35 kg), dispepsia gastroparesis.',
    d:'10 mg PO 3×/hari sebelum makan. Maks 30 mg/hari, durasi sesingkat mungkin (≤ 7 hari).',
    a:'Tidak direkomendasikan rutin untuk anak < 12 th atau BB < 35 kg (peringatan BPOM/EMA risiko aritmia QT).',
    kh:'Hindari saat hamil. Kontraindikasi gangguan hati sedang–berat.',
    ki:'Perdarahan/obstruksi/perforasi GI, prolaktinoma, sindrom QT panjang, gagal jantung, gangguan hati sedang–berat, pemakai inhibitor CYP3A4 kuat (ketokonazol, eritromisin).',
    int:'Ketokonazol, eritromisin/klaritromisin, amiodaron (meningkatkan kadar domperidon & risiko torsades de pointes!).',
    es:'Perpanjangan QT, aritmia ventrikel (terutama dosis > 30 mg/hari atau usia > 60 th), mulut kering, hiperprolaktinemia.'},

   {n:'Metoklopramid', cls:'Antiemetik prokinetik (antagonis D2 sentral)',
    ind:'Mual muntah akut, migrain akut, gastroparesis (durasi maks 5 hari).',
    d:'10 mg IV pelan/IM/PO tiap 8 jam. Maks 30 mg/hari (0,5 mg/kg/hari), durasi ≤ 5 hari.',
    a:'Hindari rutin pada anak & dewasa muda (risiko tinggi reaksi distonia akut/ekstrapiramidal).',
    kh:'Relatif aman jangka pendek pada hiperemesis gravidarum. Kurangi 50% bila CrCl < 40.',
    ki:'Perdarahan/obstruksi/perforasi GI, penyakit Parkinson, feokromositoma, epilepsi tak terkontrol, anak < 1 tahun.',
    es:'Reaksi ekstrapiramidal (distonia akut, okulogirik — atasi dengan difenhidramin IV), mengantuk, tardive dyskinesia (pemakaian lama).'},

   {n:'Oralit (WHO/ORS)', alt:'ORS rehidrasi', cls:'Larutan rehidrasi oral osmolaritas rendah',
    ind:'Pencegahan dan tatalaksana dehidrasi ringan–sedang pada diare akut.',
    d:'Dewasa: 200–400 mL tiap BAB cair (atau sesuai derajat dehidrasi).',
    a:'Tanpa dehidrasi (Terapi A): 50–100 mL (< 2 th) atau 100–200 mL (2–10 th) tiap BAB. Dehidrasi ringan–sedang (Terapi B): 75 mL/kgBB dalam 3 jam.',
    kh:'Aman untuk semua usia dan kehamilan.',
    ki:'Dehidrasi berat dengan syok atau penurunan kesadaran (wajib resusitasi IV dulu), ileus paralitik, muntah masif tak terkendali.',
    es:'Muntah bila diminum terlalu cepat (berikan sedikit demi sedikit tiap 1–2 menit).'},

   {n:'Zinc', cls:'Suplemen mineral (terapi diare anak)',
    ind:'Terapi wajib pendamping oralit pada diare akut anak (memperpendek durasi & cegah kambuh).',
    d:'Tidak rutin untuk diare dewasa.',
    a:'Usia < 6 bulan: 10 mg/hari; usia ≥ 6 bulan: 20 mg/hari, diminum 1×/hari selama 10–14 hari penuh (meski diare sudah berhenti).',
    kh:'Aman pada anak; larutkan tablet dispersibel dalam air matang/ASI.',
    ki:'Hipersensitivitas.',
    es:'Mual atau muntah ringan (rasa logam).'},

   {n:'Ambroksol', cls:'Mukolitik',
    ind:'Batuk berdahak pada ISPA, bronkitis akut/kronik.',
    d:'30 mg PO 3×/hari sesudah makan.',
    a:'2–5 th: 7,5 mg (½ sdt sirup 15 mg/5 mL) 2–3×/hari; 6–12 th: 15 mg 2–3×/hari. Hindari < 2 th tanpa evaluasi dokter.',
    kh:'Hindari kehamilan trimester 1.',
    ki:'Hipersensitivitas, ulkus peptikum aktif (hati-hati).',
    es:'Mual ringan, rasa tidak nyaman di perut, jarang reaksi kulit berat.'},

   {n:'Cetirizin', alt:'Antihistamin H1 gen 2', cls:'Antihistamin H1 generasi 2 (minim sedasi)',
    ind:'Urtikaria akut/kronik, rinitis alergi, reaksi alergi kulit ringan.',
    d:'10 mg PO 1×/hari (kurangi jadi 5 mg/hari bila CrCl < 50).',
    a:'2–5 th: 2,5–5 mg/hari; 6–12 th: 5–10 mg/hari.',
    kh:'Relatif aman pada kehamilan. Sesuaikan dosis pada gangguan ginjal.',
    ki:'Hipersensitivitas hidroksizin/cetirizin, gagal ginjal stadium akhir (CrCl < 10).',
    es:'Kantuk ringan (jauh lebih ringan dibanding difenhidramin/CTM), mulut kering.'},

   {n:'Difenhidramin', cls:'Antihistamin H1 generasi 1',
    ind:'Reaksi alergi akut, urtikaria berat, adjuvan anafilaksis (SETELAH epinefrin!), distonia akut akibat metoklopramid/haloperidol.',
    d:'25–50 mg IV pelan/IM/PO tiap 6–8 jam (maks 300 mg/hari).',
    a:'1–1,25 mg/kgBB/dosis IV/IM/PO (maks 50 mg/dosis).',
    kh:'Hati-hati pada lansia (delirium, retensi urin, jatuh — Kriteria Beers!).',
    ki:'Serangan asma akut (mengentalkan sekret), glaukoma sudut sempit, hipertrofi prostat dengan retensi urin, neonatus/bayi prematur.',
    es:'Mengantuk berat, mulut kering, pandangan kabur, retensi urin, delirium pada lansia.'},

   {n:'Asam traneksamat', alt:'TXA antifibrinolitik', cls:'Antifibrinolitik',
    ind:'Perdarahan trauma mayor (< 3 jam), perdarahan pascapersalinan/HPP (< 3 jam), perdarahan uterus abnormal, epistaksis berat.',
    d:'Trauma/HPP: 1 g IV pelan dalam 10 menit, lanjut 1 g IV infus 8 jam. Perdarahan uterus/lain: 500–1.000 mg IV pelan/PO tiap 8 jam.',
    a:'15 mg/kgBB IV pelan (maks 1 g), lanjut 2 mg/kgBB/jam bila perdarahan trauma berat.',
    kh:'Sesuaikan dosis pada gagal ginjal (eksresi renal). Relatif aman pada HPP.',
    ki:'Tromboemboli aktif (DVT, emboli paru, stroke iskemik), perdarahan subaraknoid, riwayat kejang (hati-hati dosis tinggi), hematuria masif saluran kemih atas (risiko bekuan menyumbat ureter).',
    es:'Mual, hipotensi bila IV terlalu cepat, risiko trombosis, kejang pada dosis sangat tinggi.'},

   {n:'N-asetilsistein (NAC)', alt:'Antidot paracetamol Asetilsistein', cls:'Antidot hepatotoksisitas paracetamol & mukolitik',
    ind:'Overdosis paracetamol (paling efektif dalam 8 jam pertama; tetap bermanfaat > 8 jam), mukolitik (dosis oral lebih rendah).',
    d:'Overdosis PCT (protokol IV 21 jam): 150 mg/kgBB dalam 200 mL D5% selama 1 jam → 50 mg/kgBB dalam 500 mL selama 4 jam → 100 mg/kgBB dalam 1.000 mL selama 16 jam. Mukolitik: 200 mg PO 3×/hari.',
    a:'Gunakan protokol berat badan NAC (volume pelarut disesuaikan pada BB < 40 kg agar tidak hiponatremia).',
    kh:'Aman pada kehamilan (menyelamatkan ibu & janin pada overdosis PCT!).',
    ki:'Tidak ada kontraindikasi absolut pada overdosis paracetamol (hati-hati riwayat reaksi anafilaktoid → perlambat infus & beri antihistamin).',
    es:'Reaksi anafilaktoid (flushing, gatal, bronkospasme pada infus pertama), mual/muntah.'},

   {n:'Vitamin K1 (Fitomenadion)', alt:'Antidot warfarin', cls:'Vitamin koagulasi / antidot warfarin',
    ind:'Overdosis warfarin / INR sangat tinggi dengan atau tanpa perdarahan, defisiensi vitamin K, profilaksis perdarahan neonatus.',
    d:'INR > 10 tanpa perdarahan: 2,5–5 mg PO. Perdarahan berat akibat warfarin: 5–10 mg IV pelan (dalam 20–30 menit) + PCC/FFP cito.',
    a:'Profilaksis neonatus: 1 mg IM paha lateral segera setelah lahir. Reversal warfarin anak: 0,03–0,1 mg/kg IV/PO.',
    kh:'Aman pada kehamilan bila ada indikasi medis.',
    ki:'Hipersensitivitas.',
    es:'Reaksi anafilaktoid bila disuntik IV terlalu cepat (wajib encerkan & infus pelan!), resistensi warfarin sementara beberapa hari.'},

   {n:'Tiamin (Vitamin B1)', alt:'Wernicke', cls:'Vitamin B1 (koenzim metabolisme glukosa)',
    ind:'Pencegahan/terapi ensefalopati Wernicke pada alkoholisme kronik, malnutrisi berat, hiperemesis gravidarum berat (berikan SEBELUM/BERSAMA infus glukosa!).',
    d:'Profilaksis: 100 mg IV/IM sebelum dekstrosa. Ensefalopati Wernicke: 200–500 mg IV pelan tiap 8 jam selama 3–5 hari.',
    a:'10–25 mg IV/IM/hari bila defisiensi berat.',
    kh:'Aman pada kehamilan (penting pada hiperemesis gravidarum!).',
    ki:'Hipersensitivitas (sangat jarang).',
    es:'Sangat aman; jarang iritasi lokal atau reaksi alergi.'},

   {n:'Alopurinol', alt:'Asam urat gout', cls:'Penghambat xantin oksidase (penurun asam urat)',
    ind:'Terapi jangka panjang gout kronik / hiperurisemia berulang, pencegahan sindrom lisis tumor.',
    d:'Mulai rendah 100 mg PO 1×/hari (50 mg/hari bila eGFR < 60), titrasi bertahap tiap 2–4 minggu. JANGAN memulai saat serangan gout akut!',
    a:'Sindrom lisis tumor: 10 mg/kgBB/hari terbagi 2–3 dosis.',
    kh:'Wajib turunkan dosis awal pada gagal ginjal (menurunkan risiko SJS/TEN!).',
    ki:'Memulai terapi saat serangan gout akut (memperburuk nyeri — atasi inflamasi dulu), riwayat hipersensitivitas/SJS/DRESS alopurinol.',
    int:'Azatioprin/6-merkaptopurin (toksisitas sumsum tulang fatal!), ampisilin/amoksisilin (risiko ruam).',
    es:'Ruam berat (SJS/TEN/DRESS — hentikan segera bila muncul ruam!), pemicu flare gout di awal terapi.'},

   {n:'Loperamid', alt:'Antidiare antimotilitas', cls:'Antidiare (agonis opioid perifer saluran cerna)',
    ind:'Diare akut non-infektif / tanpa demam & darah pada DEWASA (hanya simtomatik sementara).',
    d:'Dewasa: 4 mg PO awal, lalu 2 mg tiap BAB cair (maks 16 mg/hari, stop bila 48 jam tidak membaik).',
    a:'KONTRAINDIKASI rutin pada anak balita (< 2 th kontraindikasi absolut; WHO/IDAI melarang antimotilitas pada diare akut anak!).',
    kh:'Hindari kehamilan trimester 1 & menyusui.',
    ki:'Anak balita / diare akut anak (risiko ileus paralitik, megakolon toksik, depresi SSP!), disentri (diare berdarah + demam tinggi), kolitis pseudomembran, ileus.',
    es:'Konstipasi, kram perut, pusing; overdosis memicu aritmia pemanjangan QT & depresi napas.'},

   {n:'Klorfeniramin (CTM)', alt:'Chlorpheniramine maleate antihistamin', cls:'Antihistamin H1 generasi 1',
    ind:'Rinitis alergi, urtikaria ringan, reaksi alergi kulit.',
    d:'4 mg PO tiap 4–6 jam (maks 24 mg/hari). Hati-hati satuan: mg bukan g!',
    a:'2–5 th: 1 mg tiap 4–6 jam (maks 6 mg/hr); 6–12 th: 2 mg tiap 4–6 jam (maks 12 mg/hr).',
    kh:'Hati-hati lansia (sedasi, delirium, retensi urin — Kriteria Beers!). Relatif aman pada kehamilan bila diperlukan.',
    ki:'Glaukoma sudut sempit, hipertrofi prostat dengan retensi urin, serangan asma akut, bayi baru lahir/prematur.',
    es:'Mengantuk berat, mulut kering, pandangan kabur, pusing.'},

   {n:'Kolkisin', alt:'Colchicine gout akut', cls:'Antiinflamasi spesifik gout',
    ind:'Serangan artritis gout akut (efektif bila diberikan < 24–36 jam sejak awitan), profilaksis flare saat memulai alopurinol.',
    d:'Gout akut: 1 mg (atau 1,2 mg) PO awal, diikuti 0,5 mg (atau 0,6 mg) 1 jam kemudian (maks 1,5–1,8 mg hari pertama), lalu 0,5 mg 1–2×/hari hingga reda.',
    a:'Jarang dipakai pada anak (hanya indikasi khusus FMF oleh spesialis).',
    kh:'Turunkan dosis drastis / hindari pada eGFR < 30 atau gangguan hati berat.',
    ki:'Gagal ginjal berat (CrCl < 30) atau gagal hati berat bersama inhibitor CYP3A4/P-gp (klaritromisin, ketokonazol), diskrasia darah.',
    int:'Klaritromisin/eritromisin/antijamur azol (toksisitas fatal!), statin (risiko miopati/rabdomiolisis).',
    es:'Diare/mual/muntah (tanda awal toksisitas — segera hentikan!), mielosupresi pada overdosis.'},

   {n:'Klorheksidin 0,2% (Obat Kumur)', alt:'Chlorhexidine gargle antiseptik mulut', cls:'Antiseptik topikal rongga mulut',
    ind:'Gingivitis, stomatitis, adjuvan tonsilofaringitis / kebersihan rongga mulut.',
    d:'Kumur 10–15 mL selama 30–60 detik 2×/hari lalu BUANG (JANGAN DITELAN!).',
    a:'Hanya anak ≥ 6–12 tahun yang sudah mampu berkumur tanpa menelan.',
    kh:'Aman topikal pada kehamilan bila tidak tertelan.',
    ki:'Ditelan / rute oral (PO), hipersensitivitas klorheksidin.',
    es:'Pewarnaan gigi kecokelatan sementara, perubahan rasa kecap, iritasi lambung bila tertelan.'}
  ];

  /* Bagian B: Kardiovaskular, Antikoagulan, Napas, Endokrin, Emergensi, Neuro, Obstetri, Elektrolit */
  const DRUGS_B = [
   {n:'Aspirin', alt:'Asam asetilsalisilat ASA Miniaspi', cls:'Antiplatelet',
    ind:'Sindrom koroner akut (STEMI/NSTEMI/UAP), stroke iskemik akut (setelah CT singkirkan perdarahan), pencegahan sekunder kardiovaskular.',
    d:'SKA: 160–320 mg PO DIKUNYAH (loading, tablet non-salut enterik), lanjut 80–100 mg/hari. Stroke iskemik: 160–325 mg dalam 24–48 jam.',
    a:'KONTRAINDIKASI rutin pada anak/remaja dengan infeksi virus (risiko SINDROM REYE!). Hanya indikasi khusus spesialis (penyakit Kawasaki).',
    kh:'Dosis rendah (80–100 mg) aman untuk profilaksis preeklamsia; hindari dosis analgesik pada trimester 3.',
    ki:'Perdarahan aktif (GI/intrakranial), ulkus peptikum aktif, demam dengue/trombositopenia, alergi aspirin/asma sensitif NSAID, anak dengan infeksi virus (varisela/influenza).',
    int:'Warfarin/NSAID lain (risiko perdarahan berat), ibuprofen dapat menghambat efek antiplatelet aspirin bila diminum bersamaan.',
    es:'Dispepsia, perdarahan saluran cerna, bronkospasme (pada asma sensitif aspirin), tinnitus pada dosis tinggi.'},

   {n:'Klopidogrel', alt:'Clopidogrel P2Y12', cls:'Antiplatelet (penghambat P2Y12)',
    ind:'SKA (kombinasi dengan aspirin), pasca-PCI/stent, stroke iskemik minor/TIA risiko tinggi.',
    d:'Loading 300 mg PO (fibrinolisis / usia ≤ 75 th; tanpa loading pada fibrinolisis usia > 75 th) atau 600 mg PO (primary PCI), lanjut 75 mg 1×/hari.',
    a:'Tidak untuk penggunaan rutin anak.',
    kh:'Hindari bila tidak perlu saat hamil/menyusui; hentikan 5 hari sebelum operasi elektif.',
    ki:'Perdarahan patologis aktif (ulkus berdarah, perdarahan intrakranial), gangguan hati berat.',
    int:'Omeprazol/esomeprazol menghambat aktivasi klopidogrel (gunakan pantoprazol bila butuh PPI!), antikoagulan/NSAID (perdarahan).',
    es:'Perdarahan, memar, diare, jarang TTP (thrombotic thrombocytopenic purpura).'},

   {n:'Warfarin', alt:'Antikoagulan oral VKA', cls:'Antikoagulan (antagonis vitamin K)',
    ind:'Fibrilasi atrium (pencegahan stroke), katup jantung mekanik, DVT/emboli paru.',
    d:'Dosis individual 2–5 mg PO 1×/hari dititrasi sesuai target INR (umumnya 2,0–3,0; katup mekanik 2,5–3,5).',
    a:'0,1–0,2 mg/kgBB/hari dititrasi ketat oleh spesialis.',
    kh:'KONTRAINDIKASI KEHAMILAN (teratogenik — embriopati warfarin & perdarahan janin!).',
    ki:'Perdarahan aktif, INR tinggi (> 4,5–5) / overdosis, kehamilan, hipertensi maligna tak terkontrol, trauma kepala/operasi SSP baru.',
    int:'SANGAT BANYAK! NSAID/aspirin, kotrimoksazol, metronidazol, fluorokuinolon, amiodaron → menaikkan INR drastis & memicu perdarahan fatal!',
    es:'Perdarahan minor–mayor (mimisan, hematuria, melena, perdarahan intrakranial). Antidot: Vitamin K1 IV + PCC/FFP.'},

   {n:'Enoksaparin', alt:'LMWH Heparin berat molekul rendah', cls:'Antikoagulan (LMWH)',
    ind:'SKA (NSTEMI/STEMI), DVT/emboli paru, profilaksis trombosis rawat inap.',
    d:'Terapi: 1 mg/kgBB SC tiap 12 jam (usia ≥ 75 th pada STEMI: 0,75 mg/kg tiap 12 jam tanpa bolus IV). Bila CrCl < 30: kurangi jadi 1 mg/kgBB SC tiap 24 jam (atau ganti UFH).',
    a:'1 mg/kgBB SC tiap 12 jam (bayi < 2 bln: 1,5 mg/kg tiap 12 jam).',
    kh:'Aman pada kehamilan (tidak menembus plasenta — pilihan antikoagulan ibu hamil!). Wajib sesuaikan/ganti UFH bila eGFR < 30.',
    ki:'Perdarahan aktif, trombositopenia berat (< 50.000/µL) atau riwayat HIT (heparin-induced thrombocytopenia), anestesi spinal dalam 12–24 jam.',
    es:'Perdarahan, hematoma tempat suntik, trombositopenia (HIT), hiperkalemia ringan.'},

   {n:'Nitrogliserin (ISDN / GTN)', alt:'Nitrat Isosorbid dinitrat', cls:'Vasodilator nitrat',
    ind:'Angina pektoris, nyeri dada iskemik SKA, edema paru kardiogenik akut (dengan TDS ≥ 90–100 mmHg).',
    d:'GTN SL 0,4–0,6 mg atau ISDN SL 5 mg tiap 5 menit (maks 3 dosis). Infus GTN 5–200 mcg/menit titrasi TD.',
    a:'Penggunaan pada anak hanya di ICU oleh spesialis.',
    kh:'Gunakan hati-hati saat hamil; aman pada gagal ginjal.',
    ki:'Pemakaian PDE-5 inhibitor (sildenafil/vardenafil dalam 24 jam, tadalafil dalam 48 jam) → HIPOTENSI FATAL! Hipotensi (TDS < 90 mmHg), infark ventrikel kanan (ST elevasi V4R), bradikardia/takikardia ekstrem, stenosis aorta berat.',
    int:'Sildenafil, tadalafil, vardenafil (KONTRAINDIKASI ABSOLUT!).',
    es:'Sakit kepala berdenyut, hipotensi berat, pusing, takikardia refleks, flushing.'},

   {n:'Furosemid', cls:'Diuretik loop',
    ind:'Edema paru akut, gagal jantung dekompensasi, edema sindrom nefrotik/sirosis, hiperkalemia (adjuvan bila masih ada diuresis).',
    d:'Edema paru/AHF: 20–40 mg IV bolus pelan (atau 1–2,5× dosis oral harian bila pengguna rutin), ulang sesuai respons urin. PO: 20–80 mg/hari. Cek satuan: mg, BUKAN gram!',
    a:'0,5–2 mg/kgBB/dosis IV/PO tiap 6–12 jam (maks 6 mg/kg/hari).',
    kh:'Hindari rutin pada hipertensi kehamilan (mengurangi volume plasma plasenta). Dosis lebih tinggi kadang perlu pada CKD, tapi hindari bila anuria.',
    ki:'Anuria, hipovolemia/dehidrasi berat, hipokalemia berat, hiponatremia berat, koma hepatikum.',
    int:'Aminoglikosida (ototoksik), digoksin (hipokalemia memicu toksisitas digoksin!), NSAID (menurunkan efek diuretik & AKI).',
    es:'Hipokalemia, hiponatremia, dehidrasi/hipotensi, hiperurisemia, ototoksisitas bila IV dosis tinggi terlalu cepat.'},

   {n:'Spironolakton', cls:'Diuretik hemat kalium (antagonis aldosteron)',
    ind:'Gagal jantung HFrEF, asites sirosis, hipertensi resisten, hiperaldosteronisme primer.',
    d:'25–50 mg PO 1×/hari (asites sirosis: 100–400 mg/hari). Pantau kalium dan kreatinin berkala.',
    a:'1–3 mg/kgBB/hari dibagi 1–2 dosis (oleh spesialis).',
    kh:'Hindari kehamilan (efek antiandrogen janin laki-laki). Kontraindikasi bila eGFR < 30.',
    ki:'Hiperkalemia (K > 5,0–5,2 mmol/L), gagal ginjal akut/CKD berat (eGFR < 30), anuria, penyakit Addison.',
    int:'ACEi/ARB, KCl/suplemen kalium, kotrimoksazol, NSAID → risiko HIPERKALEMIA FATAL!',
    es:'Hiperkalemia berat, perburukan fungsi ginjal, ginekomastia, hipotensi.'},

   {n:'Kaptopril', alt:'ACE inhibitor ACEi', cls:'ACE inhibitor',
    ind:'Hipertensi, hipertensi urgensi (PO), gagal jantung HFrEF, nefropati diabetik.',
    d:'12,5–50 mg PO 2–3×/hari. Hipertensi urgensi: 12,5–25 mg PO (hindari pemberian sublingual rutin karena risiko penurunan TD mendadak!).',
    a:'0,3–0,5 mg/kgBB/dosis PO tiap 8 jam (maks 6 mg/kg/hari).',
    kh:'KONTRAINDIKASI ABSOLUT KEHAMILAN (fetotoksik, oligohidramnion, gagal ginjal janin!). Kurangi dosis awal & pantau K/Cr pada CKD.',
    ki:'Kehamilan, riwayat angioedema, stenosis arteri renalis bilateral, hiperkalemia berat, syok kardiogenik, kombinasi dengan ARB/aliskiren/sacubitril (tunggu 36 jam).',
    int:'Spironolakton/KCl/kotrimoksazol (hiperkalemia), NSAID (gagal ginjal akut), litium.',
    es:'Batuk kering persisten, hiperkalemia, hipotensi dosis pertama, angioedema (gawat jalan napas!), peningkatan kreatinin.'},

   {n:'Candesartan / Valsartan', alt:'ARB Losartan Telmisartan', cls:'ARB (penghambat reseptor angiotensin II)',
    ind:'Hipertensi, gagal jantung HFrEF, nefropati diabetik (alternatif bila batuk akibat ACEi).',
    d:'Candesartan 8–32 mg PO 1×/hari; Valsartan 80–320 mg PO 1×/hari.',
    a:'Sesuai berat badan oleh dokter spesialis anak.',
    kh:'KONTRAINDIKASI ABSOLUT KEHAMILAN (sama fetotoksiknya dengan ACE inhibitor!). Pantau K dan kreatinin pada CKD.',
    ki:'Kehamilan, stenosis arteri renalis bilateral, hiperkalemia berat, kombinasi dengan ACEi/aliskiren.',
    int:'Spironolakton/KCl/NSAID (hiperkalemia & cedera ginjal akut).',
    es:'Hipotensi, hiperkalemia, pusing, peningkatan kreatinin (batuk jarang dibanding ACEi).'},

   {n:'Amlodipin', alt:'CCB', cls:'Penghambat kanal kalsium dihidropiridin (kerja panjang)',
    ind:'Hipertensi, hipertensi urgensi (oral), angina pektoris stabil.',
    d:'5–10 mg PO 1×/hari (lansia/gangguan hati: mulai 2,5 mg).',
    a:'0,06–0,3 mg/kgBB/hari 1×/hari (maks 10 mg, usia ≥ 6 th).',
    kh:'Aman pada gagal ginjal. Pada kehamilan, pilihan utama tetap nifedipin/metildopa/labetalol.',
    ki:'Syok kardiogenik, hipotensi berat, stenosis aorta berat.',
    es:'Edema pergelangan kaki, sakit kepala, flushing, palpitasi ringan.'},

   {n:'Nifedipin', alt:'CCB', cls:'Penghambat kanal kalsium dihidropiridin',
    ind:'Hipertensi emergensi kehamilan / preeklamsia berat (lepas cepat PO), tokolitik, hipertensi kronik (lepas lambat/OROS).',
    d:'Preeklamsia berat (TD ≥ 160/110): 10 mg PO lepas cepat (JANGAN SUBLINGUAL!), ulang 10–20 mg tiap 20–30 menit bila masih ≥ 160/110 (maks 50 mg/jam). Rumatan hipertensi: OROS 30–60 mg PO 1×/hari.',
    a:'0,25–0,5 mg/kgBB/dosis PO (oleh dokter spesialis).',
    kh:'Aman pada kehamilan (pilihan lini pertama preeklamsia berat bersama metildopa & labetalol).',
    ki:'Pemberian sublingual pada krisis hipertensi (hipotensi tak terkontrol/iskemia otak & plasenta!), syok kardiogenik, infark miokard akut (lepas cepat), stenosis aorta berat.',
    int:'MgSO₄ (pantau TD ketat karena potensi sinergi hipotensi, tapi tetap aman digunakan bersama pada PEB!).',
    es:'Sakit kepala, flushing, takikardia refleks, hipotensi mendadak (bila sublingual), edema perifer.'},

   {n:'Metildopa', cls:'Antihipertensi agonis α2 sentral',
    ind:'Hipertensi dalam kehamilan (hipertensi gestasional, preeklamsia, hipertensi kronik ibu hamil).',
    d:'250–500 mg PO 2–3×/hari (maks 3 g/hari).',
    a:'10–40 mg/kgBB/hari dibagi 2–4 dosis.',
    kh:'Pilihan paling mapan & aman sepanjang kehamilan dan menyusui.',
    ki:'Penyakit hati aktif (hepatitis/sirosis), depresi berat, feokromositoma, pemakai MAOI.',
    es:'Mengantuk, mulut kering, hipotensi ortostatik, tes Coombs positif / anemia hemolitik, peningkatan enzim hati.'},

   {n:'Labetalol', cls:'Alpha + Beta-blocker (campuran)',
    ind:'Hipertensi emergensi kehamilan/preeklamsia berat (IV/PO), diseksi aorta, hipertensi emergensi lain.',
    d:'Emergensi kehamilan: 20 mg IV pelan (2 menit), bila perlu 40 mg lalu 80 mg tiap 10–15 menit (maks 300 mg). PO: 100–400 mg tiap 12 jam.',
    a:'0,2–1 mg/kgBB IV bolus (ICU pediatri).',
    kh:'Aman pada kehamilan (lini pertama hipertensi berat kehamilan bersama nifedipin PO).',
    ki:'Asma/PPOK bronkospastik, blok AV derajat 2–3, bradikardia berat (< 60/mnt), gagal jantung dekompensasi akut, syok kardiogenik.',
    es:'Bradikardia, bronkospasme, hipotensi ortostatik, hipoglikemia neonatus ringan.'},

   {n:'Propranolol', cls:'Beta-blocker non-selektif (β1 + β2)',
    ind:'Tirotoksikosis/badai tiroid, takikardia supraventrikular, profilaksis varises esofagus, tremor esensial, profilaksis migrain.',
    d:'10–40 mg PO 2–3×/hari (badai tiroid: 60–80 mg PO tiap 4–6 jam).',
    a:'0,5–1 mg/kgBB/hari terbagi 2–3 dosis (titrasi sesuai indikasi kardiologi anak).',
    kh:'Gunakan hati-hati saat hamil (pantau pertumbuhan & glukosa neonatus). Kurangi dosis pada sirosis berat.',
    ki:'ASMA / PPOK bronkospastik (blok β2 → bronkospasme berat!), blok AV derajat 2–3, bradikardia berat, syok kardiogenik, gagal jantung dekompensasi akut.',
    int:'Verapamil/diltiazem IV (bradikardia berat/asistol!), insulin/sulfonilurea (menyamarkan gejala takikardia hipoglikemia).',
    es:'Bronkospasme berat, bradikardia, hipotensi, kelelahan, menyamarkan hipoglikemia.'},

   {n:'Bisoprolol', cls:'Beta-blocker kardioselektif β1',
    ind:'Hipertensi, gagal jantung kronik stabil (HFrEF), angina pektoris, kontrol laju fibrilasi atrium.',
    d:'1,25–10 mg PO 1×/hari (gagal jantung: mulai sangat rendah 1,25 mg, titrasi bertahap).',
    a:'Tidak rutin pada anak.',
    kh:'Hati-hati pada kehamilan. Maks 10 mg/hari pada gangguan ginjal/hati berat.',
    ki:'Blok AV derajat 2–3 tanpa pacu jantung, bradikardia berat (< 50–60/mnt), syok kardiogenik, gagal jantung dekompensasi akut, asma berat.',
    int:'Diltiazem/verapamil/digoksin/amiodaron (bradikardia & blok AV berat).',
    es:'Bradikardia, hipotensi, lelah, ekstremitas dingin, bronkospasme (pada dosis tinggi).'},

   {n:'Diltiazem', cls:'CCB non-dihidropiridin',
    ind:'Kontrol laju fibrilasi/flutter atrium, SVT, angina pektoris, hipertensi.',
    d:'AF RVR akut: 0,25 mg/kgBB (15–20 mg) IV pelan 2 menit, ulang 0,35 mg/kg bila perlu; infus 5–15 mg/jam. PO: 30–60 mg 3×/hari atau CD 120–240 mg 1×/hari.',
    a:'Hanya oleh kardiolog anak.',
    kh:'Hindari saat hamil; hati-hati gangguan hati.',
    ki:'Gagal jantung sistolik (HFrEF / EF < 40%) dekompensasi, blok AV derajat 2–3, bradikardia berat, hipotensi, AF dengan pre-eksitasi WPW (risiko VF!).',
    int:'Beta-blocker IV (risiko blok AV/asistol!), digoksin, simvastatin.',
    es:'Bradikardia, blok AV, hipotensi, edema perifer, konstipasi.'},

   {n:'Digoksin', cls:'Glikosida jantung (inotropik + kontrol laju)',
    ind:'Kontrol laju fibrilasi atrium (terutama pada HFrEF), gagal jantung sistolik refrakter.',
    d:'Digitalisasi akut: 0,25–0,5 mg IV/PO pelan lalu 0,25 mg tiap 6 jam (maks 1–1,5 mg/24 jam). Rumatan: 0,125–0,25 mg PO 1×/hari (kurangi pada lansia/CKD!).',
    a:'Sesuai protokol kardiologi anak (indeks terapi sangat sempit!).',
    kh:'Wajib turunkan dosis drastis pada gagal ginjal (eksresi renal) dan pantau kalium!',
    ki:'Blok AV derajat 2–3, bradikardia berat, VF/VT, AF dengan WPW, kardiomiopati hipertrofik obstruktif, hipokalemia belum terkoreksi.',
    int:'HIPOKALEMIA (furosemid!) & hiperkalsemia memicu toksisitas digoksin! Amiodaron & verapamil menaikkan kadar digoksin 2× lipat.',
    es:'Mual/muntah, penglihatan kuning-hijau (xantopsia), bradikardia, blok AV, aritmia ventrikel (indeks terapi sempit!).'},

   {n:'Amiodaron', cls:'Antiaritmia kelas III',
    ind:'Henti jantung VF/VT tanpa nadi refrakter kejut, VT monomorfik stabil, kontrol irama/laju AF.',
    d:'VF/pVT henti jantung: 300 mg IV/IO bolus, dosis ke-2 150 mg. VT stabil: 150 mg IV dalam 10 menit, lanjut infus 1 mg/menit (6 jam) lalu 0,5 mg/menit (18 jam).',
    a:'Henti jantung (PALS): 5 mg/kgBB IV/IO bolus (maks 300 mg), dapat diulang hingga total 15 mg/kgBB.',
    kh:'Hindari kehamilan (toksisitas tiroid janin) kecuali aritmia mengancam jiwa.',
    ki:'Bradikardia sinus berat, blok AV derajat 2–3 tanpa pacu, syok kardiogenik, hipersensitivitas iodium, disfungsi tiroid berat.',
    int:'Warfarin & digoksin (naikkan kadarnya → kurangi dosis!), obat pemanjang QT (fluorokuinolon, makrolida, haloperidol).',
    es:'Hipotensi (IV cepat), bradikardia, flebitis (berikan lewat vena besar/sentral), toksisitas paru/tiroid/hati jangka panjang.'},

   {n:'Adenosin', cls:'Antiaritmia (penghambat nodus AV kerja sangat singkat)',
    ind:'Takikardia supraventrikular (SVT) reguler kompleks sempit stabil.',
    d:'6 mg IV BOLUS SANGAT CEPAT (1–2 detik) diikuti flush NaCl 0,9% 20 mL cepat (jalur proksimal); bila gagal dalam 1–2 menit ulang 12 mg (bisa ulang 12 mg sekali lagi).',
    a:'0,1 mg/kgBB IV bolus cepat (maks 6 mg), ulang 0,2 mg/kgBB (maks 12 mg).',
    kh:'Aman pada kehamilan (waktu paruh < 10 detik!).',
    ki:'Blok AV derajat 2–3, sick sinus syndrome, asma/PPOK bronkospastik berat (memicu bronkospasme!), AF pre-eksitasi WPW.',
    int:'Dipiridamol & karbamazepin (potensiasi blok jantung — kurangi dosis 3 mg); kafein/teofilin (menghambat efek adenosin).',
    es:'Flushing, rasa tertekan dada, sesak singkat, jeda asistol beberapa detik (sementara, siapkan monitor EKG & defibrilator!).'},

   {n:'Epinefrin (Adrenalin)', cls:'Simpatomimetik (agonis α & β)',
    ind:'Anafilaksis (LINI PERTAMA — IM!), henti jantung (IV/IO), bradikardia refrakter/syok septik refrakter (infus).',
    d:'Anafilaksis: 0,3–0,5 mg IM (larutan 1:1.000 = 1 mg/mL) di paha anterolateral, ulang tiap 5–15 menit (JANGAN bolus IV 1:1.000!). Henti jantung: 1 mg IV/IO (larutan 1:10.000) tiap 3–5 menit.',
    a:'Anafilaksis: 0,01 mg/kgBB IM (1:1.000), maks 0,3 mg/dosis. Henti jantung: 0,01 mg/kgBB IV/IO (0,1 mL/kg larutan 1:10.000), maks 1 mg.',
    kh:'Tidak ada kontraindikasi absolut pada anafilaksis atau henti jantung (termasuk ibu hamil!).',
    ki:'Tidak ada kontraindikasi absolut pada kegawatan anafilaksis/henti jantung; hindari bolus IV pekat 1:1.000 pada pasien masih ada nadi!',
    es:'Takikardia, tremor, cemas, krisis hipertensi, iskemia miokard, aritmia ventrikel (terutama bila salah rute IV pekat).'},

   {n:'Norepinefrin', alt:'Noradrenalin vasopresor', cls:'Vasopresor (agonis α1 dominan + β1 ringan)',
    ind:'Vasopresor LINI PERTAMA pada syok septik dan syok distributif/kardiogenik hipotensif (target MAP ≥ 65 mmHg).',
    d:'Infus IV kontinu (syringe pump) 0,05–0,5 mcg/kgBB/menit (atau 2–30 mcg/menit), titrasi tiap 2–5 menit hingga MAP ≥ 65 mmHg. Idealnya lewat vena sentral (perifer besar hanya sementara dengan monitor ketat).',
    a:'0,05–0,1 mcg/kgBB/menit titrasi (maks 2 mcg/kg/menit).',
    kh:'Pastikan volume cairan sudah diresusitasi sebelum/bersama vasopresor.',
    ki:'Hipovolemia yang belum diresusitasi (relatif), trombosis vaskular mesenterika/perifer.',
    es:'Ekstravasasi menyebabkan nekrosis jaringan berat (antidot lokal: fentolamin), iskemia ujung jari, hipertensi, aritmia.'},

   {n:'Atropin', cls:'Antikolinergik (antimuskarinik)',
    ind:'Bradikardia simtomatik (ACLS), keracunan organofosfat/karbamat (sindrom kolinergik).',
    d:'Bradikardia (AHA ACLS terbaru): 1 mg IV bolus, ulang tiap 3–5 menit, maks 3 mg (tidak efektif pada blok AV derajat 2 Mobitz II / derajat 3 kompleks lebar!). Organofosfat: 1–2 mg IV, gandakan dosis tiap 5 mnt sampai sekret paru kering (atropinisasi).',
    a:'Bradikardia (PALS): 0,02 mg/kgBB IV/IO (maks 0,5 mg/dosis anak, 1 mg remaja). Organofosfat: 0,02–0,05 mg/kg IV.',
    kh:'Aman pada kegawatan kehamilan (keracunan/bradikardia).',
    ki:'Glaukoma sudut sempit, obstruksi saluran cerna/ileus paralitik, retensi urin (relatif pada bradikardia; tidak ada KI absolut pada keracunan organofosfat!).',
    es:'Takikardia, mulut kering, pupil midriasis, retensi urin, delirium antikolinergik.'},

   {n:'Salbutamol', alt:'Albuterol SABA', cls:'Agonis β2 kerja pendek (SABA)',
    ind:'Asma akut, bronkospasme, PPOK eksaserbasi, adjuvan hiperkalemia berat (dosis tinggi).',
    d:'Asma akut: nebulisasi 2,5–5 mg tiap 20 menit (3×) atau MDI 100 mcg 4–8 puff (spacer). Hiperkalemia: nebulisasi dosis tinggi 10–20 mg dalam 10–15 menit.',
    a:'Nebulisasi 0,15 mg/kgBB (min 2,5 mg, maks 5 mg) tiap 20 menit; atau MDI 4–8 puff dengan spacer.',
    kh:'Aman pada kehamilan (eksaserbasi asma jauh lebih berbahaya bagi janin daripada salbutamol).',
    ki:'Hipersensitivitas.',
    int:'Beta-blocker non-selektif (propranolol) memblok efek salbutamol!',
    es:'Tremor halus, takikardia, palpitasi, hipokalemia, asidosis laktat ringan pada dosis sangat tinggi.'},

   {n:'Ipratropium bromida', alt:'SAMA', cls:'Antikolinergik inhalasi kerja pendek',
    ind:'Asma eksaserbasi sedang–berat (dikombinasi dengan salbutamol pada jam pertama), PPOK eksaserbasi.',
    d:'Nebulisasi 0,5 mg tiap 20 menit (3 dosis awal), lanjut tiap 4–6 jam bila perlu.',
    a:'Nebulisasi 0,25 mg (< 20 kg) atau 0,5 mg (≥ 20 kg) tiap 20 menit (3 dosis awal).',
    kh:'Aman pada kehamilan (absorpsi sistemik minimal).',
    ki:'Alergi atropin atau turunannya.',
    es:'Mulut kering, rasa pahit, midriasis/glaukoma sudut sempit bila uap mengenai mata (gunakan masker rapat).'},

   {n:'Budesonid inhalasi', alt:'ICS', cls:'Kortikosteroid inhalasi',
    ind:'Terapi pengontrol (rumatan) asma persisten, croup berat (nebulisasi 2 mg).',
    d:'Inhaler 200–400 mcg 2×/hari (WAJIB kumur & buang air setelah pakai).',
    a:'100–200 mcg 2×/hari. Croup: nebulisasi 2 mg dosis tunggal bila muntah/tidak bisa oral.',
    kh:'Pilihan ICS paling mapan dan aman pada kehamilan.',
    ki:'Hipersensitivitas; bukan obat pelega tunggal serangan asma mendadak (kecuali kombinasi ICS-formoterol).',
    es:'Kandidiasis oral (cegah dengan berkumur), suara serak.'},

   {n:'Deksametason', cls:'Kortikosteroid sistemik kerja panjang',
    ind:'Croup anak (LINI PERTAMA), meningitis bakterial (adjuvan sebelum antibiotik pertama), edema otak tumor, asma akut, adjuvan anafilaksis.',
    d:'4–10 mg IV/IM tiap 6–8 jam (meningitis dewasa: 10 mg IV tiap 6 jam × 4 hari).',
    a:'Croup: 0,6 mg/kgBB PO/IM/IV dosis tunggal (maks 16 mg). Asma akut: 0,3–0,6 mg/kgBB (maks 12–16 mg).',
    kh:'Digunakan pada ancaman persalinan prematur (24–34 minggu) untuk pematangan paru janin (6 mg IM tiap 12 jam × 4 dosis).',
    ki:'Infeksi jamur sistemik tak terkontrol, ulkus peptikum perdarahan aktif (relatif bila gawat darurat).',
    es:'Hiperglikemia, hipertensi, retensi cairan, gastritis/ulkus GI, imunosupresi.'},

   {n:'Metilprednisolon', cls:'Kortikosteroid sistemik kerja sedang',
    ind:'Asma eksaserbasi sedang–berat, PPOK eksaserbasi, reaksi alergi berat, adjuvan anafilaksis, penyakit autoimun flare.',
    d:'Asma/PPOK akut: 40–80 mg IV (1 mg/kgBB) tiap 12–24 jam (atau prednison/metilprednisolon oral 32–40 mg/hari 5 hari).',
    a:'1–2 mg/kgBB/dosis IV (maks 60 mg/hari pada asma anak).',
    kh:'Relatif aman jangka pendek saat hamil bila indikasi kuat (eksaserbasi asma).',
    ki:'Infeksi sistemik tak terkontrol tanpa antimikroba, hipersensitivitas.',
    es:'Hiperglikemia, gastritis, hipertensi, retensi natrium, insomnia/euforia.'},

   {n:'Insulin reguler', alt:'Short-acting insulin', cls:'Antidiabetik (insulin kerja pendek)',
    ind:'Hiperglikemia rawat inap, KAD/HHS (IV kontinu), hiperkalemia berat (IV bersama glukosa).',
    d:'SC: 4–10 unit sesuai skala GDS. KAD: infus 0,1 unit/kgBB/jam IV (HANYA BILA Kalium ≥ 3,3 mmol/L!). Hiperkalemia: 10 unit IV + D40% 50 mL IV, pantau GDS tiap 30–60 menit.',
    a:'KAD anak: 0,05–0,1 unit/kgBB/jam IV (TANPA bolus IV pada anak; pastikan K ≥ 3,3). Hiperkalemia: 0,1 U/kg + dekstrosa 0,5 g/kg.',
    kh:'Aman pada kehamilan (pilihan utama DM gestasional/pregestasional). Kebutuhan menurun pada gagal ginjal → awas hipoglikemia!',
    ki:'HIPOGLIKEMIA (< 70 mg/dL), HIPOKALEMIA pada KAD (K < 3,3 mmol/L → tunda insulin & koreksi kalium dulu!).',
    es:'Hipoglikemia berat, hipokalemia, lipodistrofi.'},

   {n:'Glibenklamid', alt:'Glyburide sulfonilurea', cls:'Sulfonilurea kerja panjang',
    ind:'Diabetes melitus tipe 2 (hindari pada lansia & gagal ginjal!).',
    d:'2,5–5 mg PO 1×/hari sebelum sarapan (maks 15–20 mg/hari).',
    a:'Tidak diindikasikan pada anak.',
    kh:'KONTRAINDIKASI gagal ginjal (eGFR < 60 → akumulasi metabolit aktif → hipoglikemia berkepanjangan!) & hindari pada lansia (Kriteria Beers!).',
    ki:'DM tipe 1, KAD, hipoglikemia, gangguan ginjal (eGFR < 60) atau hati berat.',
    int:'Kotrimoksazol, alkohol, beta-blocker (memperberat/menyamarkan hipoglikemia).',
    es:'Hipoglikemia BERAT dan BERKEPANJANGAN (pasien wajib diobservasi minimal 24 jam pasca koreksi glukosa!), kenaikan BB.'},

   {n:'Metformin', cls:'Antidiabetik biguanid',
    ind:'Lini pertama DM tipe 2 tanpa kontraindikasi ginjal/hipoksia.',
    d:'500–850 mg PO 2–3×/hari sesudah makan (maks 2.550 mg/hari). Bila eGFR 30–44: maks 1.000 mg/hari & jangan mulai baru.',
    a:'Usia ≥ 10 tahun: mulai 500 mg 1–2×/hari oleh dokter.',
    kh:'KONTRAINDIKASI bila eGFR < 30 atau AKI! Tunda 48 jam pada kontras iodium IV (bila eGFR < 60/AKI) & sakit akut berat/dehidrasi.',
    ki:'eGFR < 30 mL/menit, gagal ginjal akut (AKI), asidosis metabolik/KAD, gagal jantung/hati/napas akut, syok/sepsis, alkoholisme berat.',
    es:'Mual, diare, kembung, defisiensi vitamin B12 jangka panjang, ASIDOSIS LAKTAT (jarang tapi mortalitas tinggi!).'},

   {n:'Dekstrosa 40%', alt:'D40 glukosa hipertonik', cls:'Larutan glukosa hipertonik (25 mL = 10 g)',
    ind:'Hipoglikemia berat dewasa (GDS < 70 mg/dL dengan penurunan kesadaran/tidak bisa oral), adjuvan insulin pada hiperkalemia.',
    d:'Hipoglikemia berat: 25–50 mL (10–20 g glukosa) IV bolus pelan (cek GDS ulang 15 menit, target > 100 mg/dL). Berikan Tiamin 100 mg IV dulu pada malnutrisi/alkoholik!',
    a:'HINDARI D40% langsung pada anak kecil! Gunakan Dekstrosa 10%: 2 mL/kgBB (2–5 mL/kgBB) IV bolus.',
    kh:'Aman pada kehamilan.',
    ki:'Hiperglikemia, perdarahan intrakranial akut, pemberian tanpa tiamin pada suspek defisiensi B1/alkoholisme.',
    es:'Flebitis, nekrosis jaringan bila ekstravasasi, rebound hipoglikemia (terutama pada overdosis sulfonilurea).'},

   {n:'Diazepam', cls:'Benzodiazepin',
    ind:'Kejang akut, status epileptikus (lini pertama), kejang demam berkepanjangan, ansietas/putus alkohol akut.',
    d:'Status epileptikus: 5–10 mg IV pelan (kecepatan maks 2–5 mg/menit), dapat diulang 1× dalam 5–10 menit (maks 20–30 mg). Rektal: 10 mg.',
    a:'Kejang anak (IDAI): IV 0,2–0,5 mg/kgBB pelan (maks 2 mg/menit, maks 10 mg/dosis). Rektal: BB < 12 kg = 5 mg; BB ≥ 12 kg = 10 mg (0,5 mg/kgBB).',
    kh:'Hati-hati pada kehamilan (namun tetap aman menyelamatkan kejang akut non-eklamsia). Kurangi dosis pada lansia & gangguan hati.',
    ki:'Depresi napas berat, apnea tidur berat, miastenia gravis, gagal hati berat, glaukoma sudut sempit.',
    int:'Opioid & alkohol (risiko depresi napas fatal!).',
    es:'Depresi napas/apnea (terutama bila IV bolus terlalu cepat!), sedasi, hipotensi. Antidot: Flumazenil (JANGAN dipakai bila pasien epilepsi/overdosis TCA karena memicu kejang refrakter!).'},

   {n:'Midazolam', cls:'Benzodiazepin kerja cepat',
    ind:'Kejang akut/status epileptikus (pilihan utama IM bila belum ada akses IV!), sedasi prosedural, agitasi akut berat.',
    d:'Status epileptikus IM (tanpa akses IV): 10 mg IM (5 mg bila BB 13–40 kg). IV: 2–5 mg pelan, titrasi.',
    a:'IM/bukal/intranasal: 0,2 mg/kgBB (maks 10 mg). IV: 0,1–0,2 mg/kgBB pelan (maks 5 mg).',
    kh:'Pantau saturasi oksigen & jalan napas kontinu (siapkan bag-valve-mask).',
    ki:'Depresi napas berat tanpa dukungan ventilasi, syok berat, miastenia gravis.',
    es:'Depresi napas, hipotensi, sedasi dalam, amnesia anterograd.'},

   {n:'Fenitoin', cls:'Antikonvulsan (penghambat kanal natrium)',
    ind:'Status epileptikus lini ke-2 (setelah benzodiazepin gagal), profilaksis/terapi kejang fokal & tonik-klonik.',
    d:'Loading 15–20 mg/kgBB IV diencerkan HANYA dalam NaCl 0,9% (JANGAN D5%!), kecepatan MAKS 50 mg/menit (25 mg/menit pada lansia/penyakit jantung) dengan monitor EKG & TD kontinu. Rumatan: 5 mg/kgBB/hari.',
    a:'Loading 15–20 mg/kgBB IV dalam NaCl 0,9%, kecepatan MAKS 1 mg/kgBB/menit (maks 50 mg/menit).',
    kh:'Teratogenik pada kehamilan jangka panjang (sindrom hidantoin janin). Indeks terapi sempit.',
    ki:'Blok AV derajat 2–3, bradikardia sinus, sindrom Adams-Stokes, hipersensitivitas fenitoin, pelarutan dengan Dekstrosa 5% (mengendap!).',
    int:'Warfarin, karbamazepin, amiodaron, meropenem, sukralfat.',
    es:'Hipotensi berat & aritmia/henti jantung bila infus > 50 mg/menit, nekrosis jaringan (purple glove syndrome) bila ekstravasasi, nistagmus, ataksia, SJS/TEN.'},

   {n:'Asam valproat', alt:'Natrium valproat', cls:'Antikonvulsan spektrum luas',
    ind:'Epilepsi umum/fokal, status epileptikus lini ke-2 (IV 20–40 mg/kg), gangguan bipolar, profilaksis migrain.',
    d:'Status epileptikus: 20–40 mg/kgBB IV (maks 3.000 mg) dalam 10 menit. Rumatan PO: 500–2.000 mg/hari terbagi 2 dosis.',
    a:'Rumatan 15–60 mg/kgBB/hari dibagi 2 dosis (hindari anak < 2 th bila curiga gangguan metabolik/mitokondria).',
    kh:'KONTRAINDIKASI KUAT pada kehamilan & wanita usia subur tanpa kontrasepsi efektif (risiko tinggi defek tuba neuralis & gangguan neurodevelopment janin!).',
    ki:'Kehamilan (untuk migrain/bipolar & sebisa mungkin hindari pada epilepsi), penyakit hati berat, gangguan siklus urea, mitokondriopati (POLG).',
    int:'Meropenem/karbapenem (menurunkan kadar valproat drastis → kejang!), lamotrigin (risiko SJS naik).',
    es:'Hepatotoksisitas, pankreatitis, trombositopenia, hiperamonemia, tremor, teratogenik berat.'},

   {n:'Haloperidol', cls:'Antipsikotik tipikal (antagonis D2)',
    ind:'Delirium hiperaktif berat, agitasi psikotik akut yang membahayakan.',
    d:'2,5–5 mg IM (atau 0,5–2 mg pada lansia!), dapat diulang tiap 30–60 menit bila perlu. Hindari IV rutin tanpa monitor EKG (risiko QT panjang).',
    a:'Hanya oleh psikiater/neurolog anak.',
    kh:'Lansia demensia: peningkatan risiko mortalitas & stroke (gunakan dosis serendah mungkin bila darurat).',
    ki:'Penyakit Parkinson, demensia Lewy body, sindrom QT panjang, koma/depresi SSP berat.',
    int:'Obat pemanjang QT (amiodaron, ondansetron, makrolida, kuinolon).',
    es:'Reaksi ekstrapiramidal/distonia akut, perpanjangan QT (torsades de pointes), sindrom neuroleptik maligna (demam tinggi, kaku, CK naik).'},

   {n:'Magnesium sulfat (MgSO₄)', cls:'Antikonvulsan preeklamsia & antiaritmia',
    ind:'Pencegahan/terapi kejang pada preeklamsia berat & eklamsia (LINI PERTAMA), torsades de pointes, asma berat refrakter.',
    d:'Preeklamsia berat/Eklamsia (PNPK POGI): Loading 4 g IV (10 mL MgSO₄ 40% diencerkan jadi 20 mL) pelan 15–20 menit, lanjut rumatan 1 g/jam IV sampai 24 jam pascapersalinan/kejang terakhir. Torsades: 2 g IV dalam 10–15 menit.',
    a:'Asma berat refrakter: 25–50 mg/kgBB IV (maks 2 g) dalam 20 menit.',
    kh:'WAJIB PENUHI SYARAT & PANTAU TIAP JAM: refleks patela (+), RR ≥ 16×/menit, urin ≥ 30 mL/jam (≥ 0,5 mL/kg/jam), siaga antidot Ca glukonas 10%! Kurangi rumatan pada gagal ginjal.',
    ki:'Tanda intoksikasi MgSO₄ (refleks patela hilang, RR < 16/mnt, oliguria < 30 mL/jam), blok jantung, miastenia gravis, gagal ginjal berat tanpa penyesuaian.',
    es:'Flushing, rasa hangat, hilang refleks patela (tanda awal intoksikasi!), depresi napas hingga henti jantung. Antidot: Kalsium glukonas 10% 10 mL (1 g) IV pelan.'},

   {n:'Oksitosin', cls:'Uterotonika',
    ind:'Pencegahan & tatalaksana perdarahan pascapersalinan (HPP) e.c. atonia uteri, induksi/augmentasi persalinan.',
    d:'Profilaksis HPP (MAK III): 10 IU IM segera setelah bayi lahir. Terapi HPP: 20–40 IU dalam 1.000 mL RL/NS infus 60 tetes/menit (JANGAN bolus IV cepat dosis besar → hipotensi/aritmia!).',
    a:'Tidak untuk anak.',
    kh:'Pastikan tidak ada janin kedua sebelum pemberian pada MAK III.',
    ki:'Disproporsi sefalopelvik, malpresentasi janin, gawat janin, plasenta previa totalis (untuk induksi persalinan).',
    es:'Hipotensi berat & takikardia (bila bolus IV cepat), intoksikasi air/hiponatremia (bila dosis tinggi dalam cairan hipotonik), hiperstimulasi uterus.'},

   {n:'Nalokson', cls:'Antidot opioid (antagonis reseptor μ)',
    ind:'Overdosis opioid dengan depresi napas (RR < 12/menit, sianosis, pin-point pupil).',
    d:'0,04–0,4 mg IV titrasi tiap 2–3 menit sampai napas adekuat (bisa 0,4–2 mg IM/IN bila belum ada IV; maks 10 mg bila tak ada respons → pikirkan penyebab lain!).',
    a:'0,01–0,1 mg/kgBB IV/IO/IM (maks 2 mg/dosis).',
    kh:'Masa kerja lebih pendek (30–90 menit) dibanding banyak opioid → WAJIB pantau ulang risiko renarkotisasi!',
    ki:'Hipersensitivitas (tidak ada KI absolut pada depresi napas opioid).',
    es:'Sindrom putus opioid akut (agitasi, muntah, takikardia, hipertensi), edema paru non-kardiogenik jarang.'},

   {n:'Kalsium glukonas 10%', cls:'Elektrolit / stabilisator membran miokard',
    ind:'Hiperkalemia berat dengan perubahan EKG (gelombang T tinggi/QRS lebar), antidot intoksikasi MgSO₄, hipokalsemia simtomatik (tetani/kejang).',
    d:'10 mL (1 gram = 93 mg Ca elemental) IV pelan dalam 2–5 menit dengan monitor EKG kontinu; dapat diulang setelah 5–10 menit bila perubahan EKG menetap. Catatan: TIDAK menurunkan kadar kalium serum!',
    a:'0,5 mL/kgBB (50 mg/kg, maks 10 mL) IV pelan dengan monitor EKG.',
    kh:'Aman pada kehamilan (antidot wajib di ruang bersalin/IGD untuk MgSO₄!).',
    ki:'Hiperkalsemia, keracunan digoksin (risiko aritmia berat; bila terpaksa hiperkalemia pada pengguna digoksin, infus pelan 20–30 menit), pencampuran dengan seftriakson pada neonatus.',
    int:'Seftriakson (presipitasi pada neonatus), natrium bikarbonat (mengendap bila dicampur satu jalur!).',
    es:'Bradikardia/aritmia bila disuntik terlalu cepat, nekrosis jaringan bila ekstravasasi.'},

   {n:'KCl (Kalium klorida IV)', alt:'Kalium koreksi hipokalemia', cls:'Elektrolit pekat (High-Alert Medication)',
    ind:'Hipokalemia sedang–berat (K < 3,0 mmol/L atau simtomatik/perubahan EKG) dan suplementasi K pada KAD.',
    d:'JANGAN PERNAH BOLUS IV! Selalu encerkan dalam NaCl 0,9%. Jalur perifer: konsentrasi MAKS 40 mEq/L (mis. 20 mEq dalam 500 mL), kecepatan umum ≤ 10 mEq/jam. Kecepatan 10–20 mEq/jam HANYA via vena sentral dengan monitor EKG kontinu.',
    a:'0,5–1 mEq/kgBB IV diencerkan (maks konsentrasi perifer 40 mEq/L, kecepatan maks 0,3–0,5 mEq/kg/jam dengan monitor EKG).',
    kh:'Pastikan produksi urin adekuat sebelum koreksi kalium pada pasien gangguan ginjal!',
    ki:'Hiperkalemia (K > 5,0 mmol/L), anuria/oliguria berat tanpa dialisis, pemberian IV bolus/tanpa pengenceran (HENTI JANTUNG SEKETIKA!).',
    int:'Spironolakton, ACEi/ARB, kotrimoksazol (risiko hiperkalemia berat).',
    es:'Flebitis/nyeri vena (konsentrasi tinggi), hiperkalemia, aritmia fatal/henti jantung bila terlalu cepat.'},

   {n:'Atorvastatin / Simvastatin', alt:'Statin kolesterol', cls:'Penghambat HMG-CoA reduktase (statin)',
    ind:'Dislipidemia, pencegahan primer/sekunder kardiovaskular, terapi intensitas tinggi pada SKA (atorvastatin 40–80 mg).',
    d:'Atorvastatin 10–80 mg PO 1×/hari (SKA: 40–80 mg). Simvastatin 10–40 mg PO 1×/hari malam hari.',
    a:'Hiperkolesterolemia familial oleh spesialis (≥ 10 th).',
    kh:'KONTRAINDIKASI kehamilan & menyusui. Aman pada gagal ginjal (atorvastatin tidak perlu penyesuaian dosis).',
    ki:'Kehamilan, menyusui, penyakit hati aktif (hepatitis akut!) atau peningkatan persisten SGOT/SGPT > 3× batas atas normal.',
    int:'Klaritromisin/eritromisin, amlodipin dosis tinggi (maks simvastatin 20 mg), gemfibrozil (risiko rabdomiolisis).',
    es:'Mialgia, peningkatan enzim hati, jarang rabdomiolisis (nyeri otot hebat + urin gelap kecokelatan).'}
  ];

  /* ================= DATA LAB, CAIRAN, PEDIATRI, RUMUS, TATALAKSANA & IDENTITAS ================= */
  const LABS = [
   {g:'Hematologi', rows:[
    ['Hemoglobin','Pria 13–17 g/dL · Wanita 12–15 g/dL · Anak 11–14 g/dL · Neonatus 14–20 g/dL'],
    ['Hematokrit','Pria 40–50% · Wanita 36–46% (dengue: naik ≥ 20% tanda hemokonsentrasi)'],
    ['MCV','80–100 fL (< 80 mikrositik; > 100 makrositik)'],
    ['Leukosit','4.000–11.000 /µL (anak 5.000–15.000 /µL)'],
    ['Trombosit','150.000–400.000 /µL (< 100.000 waspada perdarahan; hindari NSAID!)'],
    ['Eritrosit','Pria 4,5–5,9 · Wanita 4,0–5,2 juta/µL'],
    ['LED','Pria < 15 · Wanita < 20 mm/jam'],
    ['Retikulosit','0,5–2,5%']]},
   {g:'Koagulasi', rows:[
    ['PT','11–14 detik'],
    ['INR','Normal 0,8–1,2 · Target warfarin 2,0–3,0 (katup mekanik 2,5–3,5) · > 4,5 risiko perdarahan tinggi!'],
    ['aPTT','25–35 detik'],
    ['D-dimer','< 500 ng/mL FEU']]},
   {g:'Kimia darah dan ginjal', rows:[
    ['Ureum','10–50 mg/dL (BUN 7–20 mg/dL)'],
    ['Kreatinin','Pria 0,7–1,3 · Wanita 0,6–1,1 mg/dL · Anak 0,3–0,7 mg/dL'],
    ['eGFR','≥ 90 normal · < 60 PGK (hindari glibenklamid, sesuaikan antibiotik) · < 30 berat (KONTRAINDIKASI metformin, NSAID, spironolakton!)'],
    ['Asam urat','Pria 3,5–7,2 · Wanita 2,6–6,0 mg/dL']]},
   {g:'Elektrolit', rows:[
    ['Natrium','135–145 mmol/L (< 120 berat; koreksi kronik maks 6–8 mmol/L per 24 jam!)'],
    ['Kalium','3,5–5,0 mmol/L (< 3,3 tunda insulin pada KAD! > 6,0 darurat hiperkalemia!)'],
    ['Klorida','98–107 mmol/L'],
    ['Kalsium total','8,5–10,5 mg/dL (ion 1,1–1,3 mmol/L)'],
    ['Magnesium','1,7–2,4 mg/dL (terapeutik preeklamsia 4,8–8,4 mg/dL; > 9 refleks patela hilang)'],
    ['Fosfat','2,5–4,5 mg/dL']]},
   {g:'Fungsi hati dan pankreas', rows:[
    ['SGOT (AST)','< 35–40 U/L'],
    ['SGPT (ALT)','< 40 U/L'],
    ['Bilirubin total','0,2–1,2 mg/dL (direk < 0,3)'],
    ['Albumin','3,5–5,0 g/dL'],
    ['ALP','40–130 U/L'],
    ['Amilase','< 100 U/L'],
    ['Lipase','< 60 U/L (lebih spesifik pankreatitis: > 3× batas atas)']]},
   {g:'Glukosa dan metabolik', rows:[
    ['GDS','< 200 mg/dL (≥ 200 + gejala klasik = DM; KAD umumnya > 250 mg/dL)'],
    ['GDP','70–100 mg/dL (≥ 126 = DM)'],
    ['GD 2 jam PP','< 140 mg/dL'],
    ['HbA1c','< 5,7% normal · 5,7–6,4% prediabetes · ≥ 6,5% diabetes'],
    ['Hipoglikemia','< 70 mg/dL (level 2 berat < 54 mg/dL atau penurunan kesadaran → segera dekstrosa!)'],
    ['Laktat','0,5–2,0 mmol/L (> 4,0 curiga hipoperfusi berat / syok septik)']]},
   {g:'Lipid', rows:[
    ['Kolesterol total','< 200 mg/dL'],
    ['LDL','< 100 mg/dL (risiko tinggi < 70; sangat tinggi < 55)'],
    ['HDL','> 40 (pria) · > 50 (wanita) mg/dL'],
    ['Trigliserida','< 150 mg/dL']]},
   {g:'Jantung dan inflamasi', rows:[
    ['Troponin I/T','Di bawah persentil 99 lab (hs-troponin biasanya < 14 ng/L); naik + pola dinamis = cedera miokard'],
    ['CK-MB','< 25 U/L'],
    ['CRP','< 5 mg/L'],
    ['Prokalsitonin','< 0,1 ng/mL (> 2 ng/mL curiga sepsis bakterial berat)']]},
   {g:'Analisis gas darah (arteri)', rows:[
    ['pH','7,35–7,45 (< 7,30 + HCO₃ < 18 + keton = KAD)'],
    ['PaCO₂','35–45 mmHg'],
    ['PaO₂','80–100 mmHg'],
    ['HCO₃⁻','22–26 mmol/L'],
    ['Base excess','−2 sampai +2'],
    ['SaO₂','95–100%']]},
   {g:'Urinalisis', rows:[
    ['pH urine','4,5–8'],
    ['Berat jenis','1,003–1,030'],
    ['Protein, glukosa, keton, nitrit','Negatif (proteinuria ≥ +1 pada hamil ≥ 20 mg → evaluasi preeklamsia!)'],
    ['Leukosit esterase','Negatif (leukosit < 5/LPB)'],
    ['Eritrosit','< 3/LPB'],
    ['Produksi urine normal','Dewasa ≥ 0,5 mL/kgBB/jam (≥ 30 mL/jam) · Anak ≥ 1 mL/kg/jam · Bayi ≥ 2 mL/kg/jam']]},
   {g:'Tanda vital', rows:[
    ['Dewasa','Nadi 60–100 · RR 12–20 · TD normal < 120/80 (Hipertensi ≥ 140/90; Krisis ≥ 180/120) · Suhu 36,5–37,5 °C · SpO₂ ≥ 95%'],
    ['Bayi (< 1 th)','Nadi 100–160 · RR 30–60 · TDS ≥ 70 mmHg'],
    ['Balita (1–3 th)','Nadi 90–150 · RR 24–40 · TDS ≥ 72–90 mmHg'],
    ['Anak 3–12 th','Nadi 70–120 · RR 18–30 · TDS ≥ 76–100 mmHg'],
    ['Remaja','Nadi 60–100 · RR 12–20 · TDS ≥ 90–110 mmHg']]}
  ];

  const FLUIDS = [
   {n:'NaCl 0,9% (Normal Saline)', c:'Na 154, Cl 154 mmol/L; 308 mOsm/L (isotonik)', u:'Resusitasi, dehidrasi, KAD, pengencer wajib fenitoin dan transfusi darah. Hati-hati volume sangat besar: asidosis metabolik hiperkloremik.'},
   {n:'Ringer Laktat (RL)', c:'Na 130, K 4, Ca 3, Cl 109, laktat 28 mmol/L; 273 mOsm/L (isotonik berimbang)', u:'Resusitasi syok hipovolemik, luka bakar, dehidrasi, sepsis. JANGAN dicampur satu jalur dengan produk darah/transfusi (kalsium membekukan sitrat) atau seftriakson pada neonatus! Hati-hati gagal hati berat.'},
   {n:'Dekstrosa 5% (D5)', c:'50 g glukosa/L; 252 mOsm/L (hipotonik setelah dimetabolisme)', u:'Sumber air bebas (hipernatremia), rumatan glukosa. BUKAN cairan resusitasi syok, JANGAN untuk melarutkan fenitoin (mengendap!).'},
   {n:'D5 ¼ NS / D5 ½ NS', c:'Dekstrosa 5% dengan natrium rendah–sedang', u:'Rumatan pediatri (sesuai protokol & elektrolit serum; hindari cairan terlalu hipotonik bila risiko SIADH).'},
   {n:'Dekstrosa 10% (D10)', c:'100 g glukosa/L', u:'Pilihan hipoglikemia anak/neonatus (bolus 2 mL/kgBB, rentang 2–5 mL/kgBB), rumatan neonatus.'},
   {n:'KA-EN 1B / 3A / 3B', c:'Cairan rumatan dengan elektrolit & glukosa', u:'Rumatan anak/bayi (1B tanpa kalium untuk awal sebelum urin keluar; 3A/3B mengandung kalium 10–20 mEq/L setelah diuresis baik).'},
   {n:'NaCl 3% (Hipertonik)', c:'Na 513 mmol/L (High-Alert)', u:'Hiponatremia berat simtomatik akut (kejang/koma): bolus 100–150 mL (atau 2 mL/kgBB) IV dalam 10–20 menit. JANGAN infus cepat literan! Batas kenaikan Na kronik maks 6–8 mmol/L per 24 jam (batas absolut 8–10) untuk cegah ODS!'},
   {n:'Albumin 5% / 20–25%', c:'Koloid / plasma expander', u:'Hipoalbuminemia berat, parasentesis volume besar (> 5 L), sirosis dengan SBP atau sindrom hepatorenal.'},
   {n:'NaHCO₃ 8,4%', c:'1 mEq/mL (50 mEq/50 mL)', u:'Asidosis metabolik sangat berat (pH < 7,1), intoksikasi TCA/salisilat, hiperkalemia dengan asidosis. Jangan campur satu jalur dengan kalsium (mengendap!).'},
   {n:'KCl pekat 7,46%', c:'1 mEq/mL (High-Alert)', u:'Hipokalemia. JANGAN PERNAH BOLUS IV! Selalu encerkan: jalur perifer maks 40 mEq/L dan kecepatan ≤ 10 mEq/jam (10–20 mEq/jam hanya lewat vena sentral + monitor EKG kontinu).'}
  ];

  const PEDIA = {
   resus:[
    ['Bolus cairan syok anak','NS atau RL 10–20 mL/kgBB dalam 5–20 menit, nilai ulang perfusi & tanda kelebihan cairan. Syok kardiogenik/malnutrisi berat: 5–10 mL/kgBB lebih pelan.'],
    ['Bolus cairan neonatus','NS 10 mL/kgBB dalam 10–30 menit.'],
    ['Hipoglikemia anak','Dekstrosa 10% 2 mL/kgBB IV bolus (rentang 2–5 mL/kgBB); hindari D40% langsung pada anak kecil!'],
    ['Anafilaksis anak','Epinefrin 1:1.000 dosis 0,01 mg/kgBB IM paha lateral (maks 0,3 mg), ulang tiap 5–15 menit.'],
    ['Henti jantung (epinefrin)','0,01 mg/kgBB IV/IO (0,1 mL/kgBB larutan 1:10.000; maks 1 mg) tiap 3–5 menit.'],
    ['Defibrilasi anak','Awal 2 J/kgBB, ke-2 4 J/kgBB, selanjutnya ≥ 4 J/kgBB (maks 10 J/kgBB atau dosis dewasa).'],
    ['Kardioversi tersinkron','0,5–1 J/kgBB; bila gagal naikkan ke 2 J/kgBB.'],
    ['Kejang akut anak (IDAI)','Diazepam rektal 0,5 mg/kgBB (< 12 kg: 5 mg; ≥ 12 kg: 10 mg) ATAU diazepam IV 0,2–0,5 mg/kgBB pelan (maks 2 mg/mnt, maks 10 mg).']],
   est:[
    ['Perkiraan BB bayi 3–12 bln','(Umur bulan + 9) ÷ 2 kg'],
    ['Perkiraan BB anak 1–5 th','(Umur tahun × 2) + 8 kg'],
    ['Perkiraan BB anak 6–12 th','(Umur tahun × 3) + 7 kg (rumus APLS)'],
    ['Ukuran ETT cuffed','(Umur ÷ 4) + 3,5 mm'],
    ['Ukuran ETT uncuffed','(Umur ÷ 4) + 4 mm'],
    ['Kedalaman ETT (oral)','(Umur ÷ 2) + 12 cm atau 3 × diameter dalam ETT'],
    ['TDS minimal anak (1–10 th)','70 + (2 × umur tahun) mmHg']],
   maint:[
    ['Cairan rumatan (Holliday–Segar)','10 kg pertama: 100 mL/kg/hari · 10–20 kg: 1.000 + 50 mL/kg tiap kg di atas 10 kg · > 20 kg: 1.500 + 20 mL/kg tiap kg di atas 20 kg.'],
    ['Aturan 4-2-1 (mL/jam)','4 mL/kg/jam (10 kg pertama) + 2 mL/kg/jam (10 kg berikutnya) + 1 mL/kg/jam (sisanya).'],
    ['Dehidrasi ringan–sedang (Terapi B)','Oralit 75 mL/kgBB dalam 3 jam + Zinc 10 mg (< 6 bln) atau 20 mg (≥ 6 bln) selama 10–14 hari.'],
    ['Dehidrasi berat (Terapi C)','RL/NS 100 mL/kgBB. < 12 bln: 30 mL/kg dalam 1 jam lalu 70 mL/kg dalam 5 jam. ≥ 12 bln: 30 mL/kg dalam 30 menit lalu 70 mL/kg dalam 2,5 jam.']]
  };

  const FORMULAS = [
   ['Dosis anak dari mg/kgBB','Dosis (mg) = BB (kg) × dosis (mg/kgBB). Selalu bandingkan dengan dosis maksimum dewasa.'],
   ['Volume obat cair','Volume (mL) = dosis (mg) ÷ konsentrasi (mg/mL).'],
   ['Tetesan infus (tpm)','Tetes/menit = (volume mL × faktor tetes) ÷ waktu (menit). Makro 20 (kadang 15), mikro 60.'],
   ['Kecepatan infus (mL/jam)','Volume (mL) ÷ waktu (jam).'],
   ['Cockcroft–Gault (CrCl)','((140 − umur) × BB kg) ÷ (72 × kreatinin mg/dL); × 0,85 untuk wanita.'],
   ['Cairan luka bakar (Parkland / ABA)','Parkland: 4 mL × BB (kg) × %TBSA dalam 24 jam (ABA dewasa: 2 mL × BB × %TBSA); separuh dalam 8 jam pertama sejak kejadian.'],
   ['Kalsium terkoreksi','Ca total + 0,8 × (4 − albumin g/dL).'],
   ['Natrium terkoreksi (hiperglikemia)','Na terukur + 1,6 × ((GDS − 100) ÷ 100).'],
   ['Osmolaritas serum','2 × Na + glukosa ÷ 18 + ureum ÷ 2,8 (normal 275–295 mOsm/L).'],
   ['Anion gap','Na − (Cl + HCO₃⁻); normal 8–12 mmol/L.'],
   ['MAP','(TDS + 2 × TDD) ÷ 3; target syok ≥ 65 mmHg.'],
   ['Defisit natrium','0,6 × BB (kg) × (Na target − Na aktual). Koreksi kronik maks 6–8 mmol/L per 24 jam!'],
   ['IMT / BMI','BB (kg) ÷ TB (m)²; normal Asia 18,5–22,9.']
  ];

  const QUICK = [
   {h:'Checklist 5 BENAR tiap memeriksa berkas', items:[
    'Benar pasien: cocokkan nama, tanggal lahir, alamat, wajah di loket, gelang, dan identitas lembar lab (waspada KTP/KIA milik keluarga!).',
    'Benar obat & golongan: cocokkan kotak alergi (penisilin → amoksisilin / co-amoxiclav / ampisilin; sulfa → kotrimoksazol).',
    'Benar dosis & satuan: 1 g = 1.000 mg, 1 mg = 1.000 mcg; waspada dosis ×10, hitung mg/kgBB anak & batas lansia (ketorolak ≤ 60 mg/hr bila ≥ 65 th atau < 50 kg).',
    'Benar rute & kecepatan: epinefrin anafilaksis IM paha lateral (bukan IV 1:1.000!), KCl encer ≤ 40 mEq/L perifer & JANGAN bolus, nifedipin PO (bukan sublingual!), larutan nebu hanya inhalasi, obat kumur jangan ditelan.',
    'Benar kondisi & lab: cek kehamilan, asma, obat rutin (warfarin/sildenafil), fungsi ginjal/hati, perdarahan/trombosit, darah lengkap, dan nilai lab H/L.']},
   {h:'Kontraindikasi & interaksi mematikan (SKDI Dokter Umum)', items:[
    'Asma / PPOK: beta-blocker non-selektif (propranolol), labetalol, aspirin/NSAID (bila sensitif).',
    'Kehamilan: ACEi (kaptopril), ARB (candesartan/valsartan), fluorokuinolon (siprofloksasin), doksisiklin, kloramfenikol (trimester 3), statin, warfarin, asam valproat, NSAID trimester 3 (≥ 20 minggu).',
    'Gagal ginjal (eGFR < 30 / AKI) & lansia: metformin (eGFR < 30/AKI), NSAID/ketorolak (eGFR < 30), glibenklamid (lansia / eGFR < 60), spironolakton.',
    'Interaksi Warfarin: NSAID (ibuprofen, diklofenak, ketorolak), kotrimoksazol, & metronidazol → risiko perdarahan GI/otak berat & lonjakan INR!',
    'Penyakit hati aktif (hepatitis akut, SGOT/SGPT > 3× ULN): statin (simvastatin/atorvastatin) KONTRAINDIKASI absolut; batasi paracetamol.',
    'Perdarahan GI / demam dengue (trombosit rendah): NSAID (ibuprofen, diklofenak, ketorolak), aspirin, antikoagulan.',
    'Depresi sumsum tulang / leukopenia berat: Kloramfenikol KONTRAINDIKASI (risiko pansitopenia & anemia aplastik).',
    'Serangan gout akut (podagra): JANGAN mulai alopurinol saat flare akut (memperberat nyeri — atasi inflamasi dulu).',
    'Nitrat (ISDN/GTN) + sildenafil (24 jam) / tadalafil (48 jam) ATAU hipotensi (TDS < 90): HIPOTENSI FATAL.',
    'Anak: aspirin pada demam virus (sindrom Reye!), loperamid pada diare anak, tramadol (< 12 th), doksisiklin (< 8 th), fluorokuinolon (< 18 th).',
    'Hiperkalemia (K > 5,5): JANGAN beri KCl atau spironolakton! Hipoglikemia (GDS < 70): JANGAN beri insulin!']},
   {h:'Ringkasan tatalaksana IGD & Faskes Primer (SKDI 4A / 3B / 3A)', items:[
    'Anafilaksis (SKDI 4A): Epinefrin 1:1.000 IM paha anterolateral (dewasa 0,3–0,5 mg; anak 0,01 mg/kg maks 0,3 mg) sebagai LINI PERTAMA + O₂ + NaCl 0,9% cepat; steroid/antihistamin hanya adjuvan.',
    'STEMI / SKA (SKDI 3B): Aspirin 160–320 mg kunyah + clopidogrel 300 mg loading + pasang IV + rujuk segera untuk reperfusi; O₂ hanya bila SpO₂ < 90%; hindari nitrat pada pemakai sildenafil/TDS < 90.',
    'Asma eksaserbasi (SKDI 4A/3B): O₂ target SpO₂ 93–95% + nebulisasi SABA (+ ipratropium bila sedang-berat) tiap 20 mnt + kortikosteroid sistemik dini (prednison/metilprednisolon).',
    'Preeklamsia berat / Eklamsia (SKDI 3B · PNPK POGI): Loading awal MgSO₄ 4 g IV pelan 15–20 mnt (syarat: patela +, RR ≥ 16, urin ≥ 30 mL/jam; siapkan Ca glukonas 10% 10 mL IV) + nifedipin lepas cepat 10 mg PO bila TD ≥ 160/110 → segera rujuk Sp.OG.',
    'Hipoglikemia berat (SKDI 4A/3B · GDS < 54 atau penurunan kesadaran): D40% 25–50 mL IV pelan dewasa (anak D10% 2 mL/kg), cek GDS ulang 15 mnt; observasi 24 jam bila pemicunya sulfonilurea (glibenklamid).',
    'Kejang demam / Kejang akut anak (SKDI 4A/3B · IDAI): Diazepam rektal 5 mg (< 12 kg) atau 10 mg (≥ 12 kg), atau Diazepam IV 0,2–0,5 mg/kg pelan (maks 10 mg).',
    'Demam dengue tanpa tanda bahaya (SKDI 4A): Paracetamol saja (TANPA NSAID/aspirin), rehidrasi oral cukup, edukasi tanda bahaya & cek trombosit/Ht tiap 24 jam.',
    'Diare akut anak dehidrasi ringan–sedang (SKDI 4A · WHO/IDAI Terapi B): Oralit 75 mL/kg dalam 3 jam + Zinc 10–20 mg/hari selama 10 hari (tanpa loperamid).',
    'Hiperkalemia berat (SKDI 3B · K > 6,0): Hentikan sumber K, stabilisasi membran dengan Ca glukonas 10% 10 mL IV pelan, geser K dengan insulin reguler 10 U + D40% 50 mL IV & nebu salbutamol → segera rujuk untuk hemodialisis.']}
  ];

  const IDENT = [
   {h:'Yang dicek: nama, tanggal lahir, alamat, wajah', items:[
    'Kartu pasien adalah data rekam medis (acuan). KTP/KIA adalah dokumen yang dibawa pasien atau keluarga. Berkas adalah yang perlu kamu cap.',
    'KTP/KIA ↔ kartu pasien: nama, tanggal lahir, dan alamat harus sama.',
    'Berkas ↔ kartu pasien: nama dan tanggal lahir (beserta umurnya) harus sama.',
    'Orang di loket ↔ foto KTP/KIA: wajahnya harus orang yang sama. Foto KTP bisa foto lama, jadi kacamata, kumis, atau model rambut boleh berbeda.',
    'Nama sama belum tentu orang yang sama. Di IGD sering ada pasien bernama mirip, dan keluarga kadang membawa KTP/KIA orang lain.',
    'Bila nama dan tanggal lahir sama tapi alamat beda, bisa jadi itu orang lain. Alamat jadi pembeda ketiga.',
    'Bila tidak cocok: tolak dulu, verifikasi ulang ke pasien/keluarga dan bagian pendaftaran.']},
   {h:'Gelang identitas (mulai malam 3)', items:[
    'Gelang dipasang di triase. Warnanya biru untuk laki-laki dan merah muda untuk perempuan.',
    'Stiker merah bertuliskan ALERGI berarti pasien punya alergi. Cocokkan dengan kotak alergi di kartu pasien.',
    'Nama dan tanggal lahir di gelang harus sama dengan kartu pasien. Gelang yang tertukar berarti risiko salah pasien.']},
   {h:'Hasil lab & kartu JKN (malam 4–5)', items:[
    'Lembar lab punya identitas sendiri. Lab milik pasien lain tidak boleh jadi dasar tindakan.',
    'H = di atas nilai rujukan, L = di bawah. Tolak obat yang memperburuk nilai abnormal itu.',
    'Kartu JKN hanya untuk penjaminan. Dalam keadaan gawat darurat, rumah sakit dilarang menolak pasien atau mendahulukan urusan administrasi (UU 17/2023 Pasal 174). Masalah JKN bukan alasan menolak berkas.']},
   {h:'KTP vs KIA', items:[
    'KTP-el untuk penduduk berusia 17 tahun ke atas (atau yang sudah menikah).',
    'KIA (Kartu Identitas Anak) untuk anak di bawah 17 tahun. KIA anak di bawah 5 tahun memang tanpa foto dan berlaku sampai usia 5 tahun; KIA 5–17 tahun memakai foto.']},
   {h:'Hal yang wajar (jangan ditolak karena ini)', items:[
    'Sapaan Tn./Ny./An. tidak tercantum di KTP/KIA, dan nama di KTP ditulis huruf kapital.',
    'KTP-el cetakan lama yang masih mencantumkan tanggal berlaku (misalnya 2017) tetap sah seumur hidup.',
    'Golongan darah "-" (tidak diisi) itu biasa.',
    'NIK, agama, pekerjaan, dan status perkawinan tidak perlu dicek di game ini.',
    'Golongan darah di KTP tidak dipakai untuk transfusi. Transfusi selalu berdasarkan golongan darah dan crossmatch dari laboratorium.']}
  ];

  window.CLINED_IGD_DATA = {
    TYPES, GAME, GAME_DATE, WIL, FASKES, DOCS, APPEAR,
    TOPICS, TOPIC_ORDER, NIGHTS,
    DRUGS_A, DRUGS_B, LABS, FLUIDS, PEDIA, FORMULAS, QUICK, IDENT
  };
})();
