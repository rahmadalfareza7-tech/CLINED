document.addEventListener('click',(event)=>{const feedback=event.target.closest('#feedback');if(!feedback)return;event.preventDefault();const url=feedback.dataset.googleFormUrl||localStorage.getItem('clined_google_form_url')||'';if(!url){alert('Link Google Form belum dikonfigurasi di paket aplikasi ini.');return;}const opened=window.open(url,'_blank','noopener,noreferrer');if(!opened)window.location.href=url;});(function(){var splashStarted=Date.now();var finished=false;function finishSplash(){if(finished)return;finished=true;var loader=document.getElementById("appLoading");var content=document.getElementById("splashContent");if(!loader)return;if(content)content.classList.add("is-exiting");window.setTimeout(function(){loader.classList.add("is-hidden");window.setTimeout(function(){if(loader&&loader.parentNode)loader.parentNode.removeChild(loader);},520);},520);}function scheduleFinish(){var wait=Math.max(0,2100-(Date.now()-splashStarted));window.setTimeout(finishSplash,wait);}if(document.readyState==="complete")scheduleFinish();else window.addEventListener("load",scheduleFinish,{once:true});window.setTimeout(function(){if(!finished)scheduleFinish();},2400);})();const CLINED_SCHEMA_VERSION=4;(function migrateStorageSchema(){try{const current=Number(localStorage.getItem('clined_schema_version')||0);if(current<1){const aliases=[['xp','clined_xp'],['streak','clined_streak'],['gems','clined_gems']];aliases.forEach(([legacy,next])=>{if(localStorage.getItem(next)===null&&localStorage.getItem(legacy)!==null)localStorage.setItem(next,localStorage.getItem(legacy));});}if(current<2){if(!localStorage.getItem('clined_migrated_at'))localStorage.setItem('clined_migrated_at',new Date().toISOString());}if(current<3){}if(current<4){try{const wrong=JSON.parse(localStorage.getItem('gaster_v8_wrong_stats')||'[]');if(Array.isArray(wrong)){let changed=false;const normalized=wrong.map(item=>{if(!item||typeof item!=='object')return item;if(!item.lastWrong){item.lastWrong=item.lastSeen||new Date().toISOString();changed=true;}if(!Number.isFinite(Number(item.wrong))){item.wrong=1;changed=true;}return item;});if(changed)localStorage.setItem('gaster_v8_wrong_stats',JSON.stringify(normalized));}}catch{}}localStorage.setItem('clined_schema_version',String(CLINED_SCHEMA_VERSION));}catch(e){console.warn('CLINED storage migration skipped',e);}})();const dataKuis=[{"soal":"1. Seorang pria 27th datang ke rs keluhan sulit tidur 2 bulan yg lalu. Pulang kerja ia selalu nongkrong dicafe. Setelah kembali untuk tidur diperlukan 2 jam lebih untuk beristirahat. Dokter menyarankan untuk melakukan hygine tidur.","opsi":["A. menaruh jam dinding dan jam kamar diluar kamar tidur","B. Mandi air dingin sebelum tidur","C. Makan makanan sebelum tidur","D. Berbaring ditempat tidur sejak petang","E. Menonton tv didalam kamar"],"jawabanBenar":0,"pembahasan":"Menyingkirkan jam mencegah perilaku clock-watching yang memicu kecemasan. Opsi lain melanggar prinsip sleep hygiene.","pembahasanPilihan":["Sleep hygiene: menghilangkan jam dari kamar mengurangi clock-watching dan kecemasan saat sulit tidur.","Mandi air dingin sebelum tidur bukan intervensi utama; paparan dingin dapat meningkatkan kewaspadaan pada sebagian orang.","Makan menjelang tidur dapat menimbulkan rasa penuh/refluks dan bukan strategi sleep hygiene utama.","Berbaring sejak petang memperpanjang waktu terjaga di tempat tidur dan memperkuat asosiasi tempat tidur dengan sulit tidur.","TV di kamar memberi cahaya dan stimulasi; stimulus control justru menganjurkan kamar digunakan untuk tidur, bukan menonton TV."],"komponenStatistik":"Diagnostics"},{"soal":"2. Intinya fobia naik pesawat?","opsi":["A. Aviophobia","B. Agrophobia","C. Akrofobia","D. Klaustrofobia","E. Zoofobia"],"jawabanBenar":0,"pembahasan":"Aviophobia (aerophobia) adalah ketakutan spesifik terhadap penerbangan.","pembahasanPilihan":["Aviophobia/aerophobia adalah fobia spesifik terhadap penerbangan atau naik pesawat.","Agorafobia adalah takut situasi yang sulit ditinggalkan/ditolong, misalnya kerumunan atau transportasi umum, bukan khusus pesawat.","Akrofobia adalah takut ketinggian; contoh klinisnya takut berada di gedung tinggi atau jembatan.","Klaustrofobia adalah takut ruang sempit/tertutup seperti lift atau ruang MRI.","Zoofobia adalah ketakutan terhadap hewan tertentu, bukan terhadap penerbangan."],"komponenStatistik":"Recall"},{"soal":"3. Neurotransmiter perasaan baik adalah","opsi":["A. GABA","B. Serotonin","C. Oxitosin","D. Norephinefrin","E. Ephinerphrin"],"jawabanBenar":1,"pembahasan":"Serotonin dikenal sebagai neurotransmiter pengatur mood dan perasaan baik.","pembahasanPilihan":["GABA adalah neurotransmiter inhibitorik utama SSP; peningkatan GABA cenderung menekan eksitabilitas neuron.","Serotonin berperan dalam regulasi mood, tidur, nafsu makan, dan kecemasan; karena itu sering dikaitkan dengan mood positif.","Oksitosin terutama terkait ikatan sosial, kontraksi uterus, dan ejeksi ASI; bukan jawaban utama untuk neurotransmiter mood pada soal ini.","Norepinefrin berperan pada arousal, perhatian, dan respons stres; gangguannya dapat terkait depresi atau kecemasan.","Epinefrin terutama merupakan hormon/adrenalin dari medula adrenal; bukan neurotransmiter utama yang dimaksud dalam konteks mood ini."],"komponenStatistik":"Physiology"},{"soal":"4. Laki2 umur 45 tahun terbentur di bagian kepala, ia tidak mengingat apapun saat kejadian tetapi mengingat semuanya sebelum kejadian. bagian otak apa yang mengalami gangguan?","opsi":["A. Corteks cerebri","B. Amigdala","C. Hippokampus","D. Hipotalamus","E. Thalamus"],"jawabanBenar":2,"pembahasan":"Hipokampus bertugas mengkonsolidasi memori baru. Kerusakan memicu amnesia anterograd.","pembahasanPilihan":["Cortex cerebri berperan luas pada fungsi kognitif, tetapi bukan struktur utama konsolidasi memori baru.","Amigdala terutama memproses emosi dan memori emosional, bukan pusat utama pembentukan memori deklaratif baru.","Hipokampus penting untuk konsolidasi memori baru; lesi bilateral dapat menyebabkan amnesia anterograd.","Hipotalamus mengatur homeostasis, endokrin, dan fungsi otonom; bukan pusat utama konsolidasi memori episodik.","Thalamus adalah relay sensorik penting dan dapat berperan pada memori, tetapi bukan struktur utama yang ditanyakan."],"komponenStatistik":"Anatomy"},{"soal":"5. Seorang wanita 20 THN mengalami malnutrisi. Pasien riwayat epilepsi dan menjalani fenitonin. Kadar albumin pasien 3.0. Jika farmakokinetik fenitoin mengikat kuat plasma protein, apa risiko tersebut?","opsi":["A. Bioavailabilitas fenotonin menurun","B. Efektivitas fenotonin menurun","C. Ekskresi fenotonin meningkat","D. Toksisitas fenotonin meningkat","E. Menghambat terapi malnutrisi"],"jawabanBenar":3,"pembahasan":"Albumin rendah (malnutrisi) membuat fraksi obat bebas meningkat drastis, memicu toksisitas.","pembahasanPilihan":["Albumin rendah meningkatkan fraksi fenitoin bebas; bukan terutama menurunkan bioavailabilitas obat yang sudah diberikan.","Efek farmakodinamik dapat tampak lebih kuat karena kadar bebas meningkat, sehingga pernyataan 'efektivitas menurun' tidak tepat.","Albumin rendah tidak otomatis meningkatkan ekskresi fenitoin; masalah utamanya adalah perubahan ikatan protein.","Fenitoin sangat terikat albumin; hipoalbuminemia meningkatkan fraksi bebas sehingga risiko nistagmus, ataksia, diplopia, dan toksisitas meningkat.","Malnutrisi tidak diatasi dengan mengubah ikatan fenitoin; kondisi nutrisi harus ditangani terpisah."],"komponenStatistik":"Pharmacology"},{"soal":"6. Ulil albab dalam alquran","opsi":["A. Beriman","B. Bertaqwa","C. Berakal","D. Soleh","E. Fasik"],"jawabanBenar":2,"pembahasan":"Ulil Albab merujuk pada orang-orang yang berakal atau memiliki pikiran jernih.","pembahasanPilihan":["Beriman berarti percaya kepada Allah dan ajaran-Nya; maknanya tidak sama persis dengan istilah Ulul Albab.","Bertakwa berarti menjalankan perintah dan menjauhi larangan Allah; bukan arti literal Ulul Albab.","Ulul Albab merujuk pada orang-orang yang menggunakan akal/pikiran yang jernih dan mampu mengambil pelajaran.","Saleh berarti orang yang baik/taat; merupakan karakter, bukan terjemahan khusus Ulul Albab.","Fasik berarti keluar dari ketaatan atau melakukan kefasikan; jelas bukan makna Ulul Albab."],"komponenStatistik":"Recall"},{"soal":"7. Ada anak laki laki menunjukan kemaluannya dihadapan umum dan perempuan. Nah itu apa","opsi":["A. Frottoriesme","B. Voyeurisme","C. Ekshibisionisme","D. Fetishme","E. Pedofilia"],"jawabanBenar":2,"pembahasan":"Gangguan mendapat kepuasan dengan memperlihatkan alat kelamin secara tiba-tiba adalah Ekshibisionisme.","pembahasanPilihan":["Frotteurisme adalah mencari rangsangan seksual dengan menggesekkan tubuh/alat kelamin kepada orang yang tidak memberi persetujuan.","Voyeurisme adalah memperoleh rangsangan dengan mengintip orang lain yang sedang telanjang atau beraktivitas seksual secara diam-diam.","Ekshibisionisme adalah mempertontonkan genital kepada orang yang tidak mengharapkannya; gambaran soal paling sesuai.","Fetishisme berfokus pada benda mati atau bagian tubuh tertentu sebagai sumber rangsangan seksual.","Pedofilia berkaitan dengan ketertarikan seksual terhadap anak yang belum pubertas; sekadar mempertontonkan genital lebih khas ekshibisionisme."],"komponenStatistik":"Diagnostics"},{"soal":"8. Apa obat untuk bangkitan lena?","opsi":["A. Diazepam","B. Topiramat","C. Etosuksimid","D. Klomazepam","E. Midazolam"],"jawabanBenar":2,"pembahasan":"Etosuksimid adalah drug of choice yang paling efektif untuk kejang lena (absence seizure).","pembahasanPilihan":["Diazepam adalah benzodiazepin untuk penghentian kejang akut/status epileptikus, bukan terapi pilihan jangka panjang absence seizure.","Topiramat merupakan antikejang spektrum luas, tetapi bukan obat lini pertama untuk absence seizure.","Etosuksimid adalah pilihan klasik lini pertama untuk absence seizure karena bekerja terutama pada kanal Ca2+ tipe-T di talamus.","Klonazepam dapat menekan absence seizure, tetapi bukan pilihan utama dibanding etosuksimid karena toleransi dan efek sedasi.","Midazolam digunakan terutama untuk menghentikan kejang akut; bukan terapi utama absence seizure kronis."],"komponenStatistik":"Pharmacology"},{"soal":"9. Seorang laki-laki usia 60 tahun stroke hemoragic. Ditemukan gumpalan darah pada daerah gyrus cinguli. apakah alat yang mempercabangkan daerah tersebut :","opsi":["A. Arteri cerebrii anterior","B. Arteri communis anterior","C. Arteri cerebrii media","D. Arteri communis posterior","E. Arteri cerebrii posterior"],"jawabanBenar":0,"pembahasan":"Vaskularisasi utama untuk area medial otak termasuk gyrus cinguli adalah Arteri Cerebri Anterior.","pembahasanPilihan":["ACA memperdarahi permukaan medial hemisfer, termasuk banyak bagian gyrus cinguli.","Arteri communicans anterior menghubungkan kedua ACA, tetapi bukan pembuluh utama yang langsung memperdarahi gyrus cinguli.","MCA terutama memperdarahi permukaan lateral hemisfer, bukan wilayah medial cinguli.","Arteri communicans posterior menghubungkan sirkulasi anterior dan posterior; bukan pemasok utama gyrus cinguli.","PCA terutama memperdarahi lobus oksipital dan bagian medial temporal; bukan pemasok utama gyrus cinguli."],"komponenStatistik":"Anatomy"},{"soal":"10. Seorang laki-laki 40 tahun, penjaga kantin, suka memperlihatkan alat kelamin terutama pada siswi, gangguannya apa?","opsi":["A. Frottoriesme","B. Voyeurisme","C. Ekshibisionisme","D. Fetishme","E. Pedofilia"],"jawabanBenar":2,"pembahasan":"Ekshibisionisme adalah dorongan memamerkan alat kelamin kepada orang yang tidak menduganya.","pembahasanPilihan":["Frotteurisme adalah mencari rangsangan seksual dengan menggesekkan tubuh/alat kelamin kepada orang yang tidak memberi persetujuan.","Voyeurisme adalah memperoleh rangsangan dengan mengintip orang lain yang sedang telanjang atau beraktivitas seksual secara diam-diam.","Ekshibisionisme adalah mempertontonkan genital kepada orang yang tidak mengharapkannya; gambaran soal paling sesuai.","Fetishisme berfokus pada benda mati atau bagian tubuh tertentu sebagai sumber rangsangan seksual.","Pedofilia berkaitan dengan ketertarikan seksual terhadap anak yang belum pubertas; sekadar mempertontonkan genital lebih khas ekshibisionisme."],"komponenStatistik":"Diagnostics"},{"soal":"11. Apa fobia pesawat terbang?","opsi":["A. Akrofobia","B. Aviophobia","C. Agorafobia","D. Klaustrofobia","E. Nomophobia"],"jawabanBenar":1,"pembahasan":"Aviophobia atau aerophobia adalah fobia naik pesawat terbang.","pembahasanPilihan":["Akrofobia adalah takut ketinggian, misalnya berada di balkon atau gedung tinggi.","Aviophobia/aerophobia adalah fobia spesifik terhadap penerbangan atau naik pesawat.","Agorafobia adalah takut situasi yang sulit ditinggalkan/ditolong, bukan khusus pesawat.","Klaustrofobia adalah takut ruang sempit atau tertutup.","Nomofobia adalah ketakutan/ketidaknyamanan karena tidak memiliki akses ke telepon seluler."],"komponenStatistik":"Recall"},{"soal":"12. Apa fobia jauh dari hape?","opsi":["A. Nomophobia","B. Xenophobia","C. Fotophobia","D. Akrofobia","E. Agorafobia"],"jawabanBenar":0,"pembahasan":"Nomophobia (no-mobile-phone phobia) adalah rasa takut kehilangan akses pada ponsel.","pembahasanPilihan":["Nomofobia adalah istilah untuk ketakutan atau kecemasan ketika tidak dapat menggunakan atau mengakses ponsel.","Xenofobia adalah ketakutan/permusuhan terhadap orang asing atau kelompok luar, bukan ponsel.","Fotofobia adalah sensitivitas/ketidaknyamanan terhadap cahaya terang.","Akrofobia adalah takut ketinggian.","Agorafobia berkaitan dengan situasi seperti kerumunan, tempat terbuka/tertutup, atau transportasi yang dianggap sulit ditinggalkan."],"komponenStatistik":"Recall"},{"soal":"13. Laki-laki 45 tahun mengalami benturan di kepala, ia tidak dapat mengingat kejadian setelah benturan tersebut (Amnesia Antegrade). Struktur yang mengalami gangguan?","opsi":["A. Cortex Cerebri","B. Amygdala","C. Ganglia Basalis","D. Hyppocampus","E. Hypothalamus"],"jawabanBenar":3,"pembahasan":"Hipokampus mengatur konsolidasi memori baru; lesi memicu amnesia anterograde.","pembahasanPilihan":["Cortex cerebri berperan luas pada fungsi kognitif, tetapi bukan struktur utama konsolidasi memori baru.","Amigdala terutama memproses emosi dan memori emosional, bukan pusat utama pembentukan memori deklaratif baru.","Hipokampus penting untuk konsolidasi memori baru; lesi bilateral dapat menyebabkan amnesia anterograd.","Hipotalamus mengatur homeostasis, endokrin, dan fungsi otonom; bukan pusat utama konsolidasi memori episodik.","Thalamus adalah relay sensorik penting dan dapat berperan pada memori, tetapi bukan struktur utama yang ditanyakan."],"komponenStatistik":"Anatomy"},{"soal":"14. Anak 17 tahun jatuh dari motor, kepala terbentur. Hasil CT Scan pendarahan temporal dextra bentuk crescent sign. HU=65. Tidak tampak pergeseran garis tengah. Diagnosisnya?","opsi":["A. Pendarahan subarachnoid","B. Pendarahan subdural","C. Pendarahan epidural","D. Infark cerebri","E. Abses cerebri"],"jawabanBenar":1,"pembahasan":"Crescent sign (bentuk bulan sabit) pada CT scan patognomonis untuk Hematoma Subdural (SDH).","pembahasanPilihan":["Subarachnoid hemorrhage biasanya tampak darah di sulkus/cisterna dan sering terkait thunderclap headache; bukan gambaran crescent.","Subdural hematoma berbentuk crescent karena darah terkumpul di antara dura dan arachnoid; sering akibat robekan bridging veins.","Epidural hematoma khas berbentuk lentiform/bikonveks dan dapat terkait fraktur temporal serta robekan middle meningeal artery.","Infark cerebri menunjukkan area hipodens karena iskemia, bukan koleksi darah berbentuk crescent.","Abses serebri berupa lesi massa dengan edema dan biasanya ring enhancement; bukan hematoma crescent."],"komponenStatistik":"Diagnostics"},{"soal":"15. (Soal sama dengan 14) Hasil CT Scan ditemukan pendarahan bentuk crescent sign. Apakah diagnosisnya?","opsi":["A. Pendarahan subarachnoid","B. Pendarahan subdural","C. Pendarahan epidural","D. Infark cerebri","E. Abses cerebri"],"jawabanBenar":1,"pembahasan":"Crescent sign adalah tanda hematoma subdural.","pembahasanPilihan":["Subarachnoid hemorrhage biasanya tampak darah di sulkus/cisterna dan sering terkait thunderclap headache; bukan gambaran crescent.","Subdural hematoma berbentuk crescent karena darah terkumpul di antara dura dan arachnoid; sering akibat robekan bridging veins.","Epidural hematoma khas berbentuk lentiform/bikonveks dan dapat terkait fraktur temporal serta robekan middle meningeal artery.","Infark cerebri menunjukkan area hipodens karena iskemia, bukan koleksi darah berbentuk crescent.","Abses serebri berupa lesi massa dengan edema dan biasanya ring enhancement; bukan hematoma crescent."],"komponenStatistik":"Diagnostics"},{"soal":"16. Perempuan usia 53 keluhan nyeri punggung, pf didapatkan deformitas pada regio korpus torakal berbentuk tonjolan keras. Etiologi yg mungkin?","opsi":["A. Infeksi","B. Inflamasi","C. Degeneratif","D. Mekanik","E. Neoplasma"],"jawabanBenar":0,"pembahasan":"Tonjolan keras (gibbus) di torakal akibat destruksi tulang paling sering disebabkan infeksi Spondilitis TB.","pembahasanPilihan":["Infeksi, khususnya spondilitis TB, dapat menyebabkan nyeri, destruksi korpus, dan deformitas gibbus.","Inflamasi adalah mekanisme umum, tetapi deformitas korpus torakal khas perlu mencari penyebab struktural seperti infeksi TB.","Degeneratif lebih sering mengenai diskus/faset dan menghasilkan nyeri mekanik; tidak khas untuk tonjolan keras gibbus.","Kelainan mekanik dapat menyebabkan nyeri punggung, tetapi tidak menjelaskan pola destruksi korpus yang khas infeksi.","Neoplasma dapat merusak korpus vertebra, tetapi harus didukung red flags lain; pada konteks ini infeksi merupakan etiologi penting."],"komponenStatistik":"Diagnostics"},{"soal":"17. Ada orang susah tidur biasa dia tidur jam 21.00 tapi baru bisa tidur 2 jam setelahnya, ga ada gangguan lainnya cuman susah tidur diagnosisnya apa","opsi":["A. Insomnia early","B. Insomnia mid","C. Insomnia late","D. Hipersomnia","E. Parasomnia"],"jawabanBenar":0,"pembahasan":"Early insomnia (sleep onset) adalah kesulitan memulai fase tidur di awal malam.","pembahasanPilihan":["Early insomnia adalah sulit memulai tidur; pasien baru tertidur jauh setelah masuk tempat tidur.","Middle insomnia adalah sering terbangun di tengah malam dan sulit tidur kembali.","Late insomnia adalah bangun terlalu dini dan tidak dapat kembali tidur.","Hipersomnia berarti tidur berlebihan atau kantuk berlebihan di siang hari, kebalikan dari keluhan ini.","Parasomnia adalah perilaku/fenomena abnormal saat tidur, misalnya sleepwalking atau night terror."],"komponenStatistik":"Diagnostics"},{"soal":"18. Wanita 65 tahun sulit tidur sudah di kasur sejak jam 21:00 baru tertidur dua jam kemudian. Tidak ada gejala waham. Diagnosisnya apa?","opsi":["A. Gejala insomnia organik","B. Gejala insomnia non-organik","C. Hipersomnia","D. Parasomnia","E. Sleep apnea"],"jawabanBenar":1,"pembahasan":"Tidak ada kelainan organik medis langsung atau psikotik penyerta, diklasifikasikan sebagai insomnia non-organik.","pembahasanPilihan":["Insomnia organik berarti sulit tidur yang berkaitan dengan kondisi medis/neurologis tertentu; soal menyatakan tidak ada penyebab organik.","Insomnia non-organik ditandai kesulitan memulai atau mempertahankan tidur tanpa penyebab organik yang jelas.","Hipersomnia menyebabkan kebutuhan tidur berlebihan/kantuk siang, bukan sleep-onset insomnia.","Parasomnia berupa kejadian abnormal selama tidur, bukan sekadar terlambat tertidur.","Sleep apnea biasanya disertai dengkuran, henti napas, dan kantuk siang; bukan gambaran utama kasus."],"komponenStatistik":"Diagnostics"},{"soal":"19. Perempuan 52th terkena stroke hemoragik, pada area broca (44 dan 45) di bagian lobus mana?","opsi":["A. Lobus frontalis","B. Lobus parietal","C. Lobus limbik","D. Lobus occipital","E. Lobus temporalis"],"jawabanBenar":0,"pembahasan":"Area Broca untuk motorik bahasa terletak pada gyrus frontalis inferior, yakni di Lobus Frontalis.","pembahasanPilihan":["Area Broca berada pada gyrus frontalis inferior hemisfer dominan, sehingga termasuk lobus frontalis.","Lobus parietalis terutama berperan pada sensasi somatik dan integrasi spasial.","Lobus limbik mencakup jaringan yang terkait emosi dan memori; bukan lokasi utama Broca.","Lobus oksipital terutama memproses penglihatan.","Lobus temporalis penting untuk pendengaran dan pemahaman bahasa, terutama area Wernicke."],"komponenStatistik":"Anatomy"},{"soal":"20. Tukang jualan kantin suka ngeliatin kemaluan depan umum khususnya pada anak-anak perempuan?","opsi":["A. Transvertisme","B. Eksibisionisme","C. Voyeurisme","D. Frotteurisme","E. Pedofilia"],"jawabanBenar":1,"pembahasan":"Tindakan mempertontonkan kemaluan secara mendadak kepada publik adalah Eksibisionisme.","pembahasanPilihan":["Fetishisme berfokus pada benda mati atau bagian tubuh tertentu sebagai sumber rangsangan seksual.","Ekshibisionisme adalah mempertontonkan genital kepada orang yang tidak mengharapkannya; gambaran soal paling sesuai.","Voyeurisme adalah memperoleh rangsangan dengan mengintip orang lain yang sedang telanjang atau beraktivitas seksual secara diam-diam.","Frotteurisme adalah mencari rangsangan seksual dengan menggesekkan tubuh/alat kelamin kepada orang yang tidak memberi persetujuan.","Pedofilia berkaitan dengan ketertarikan seksual terhadap anak yang belum pubertas; sekadar mempertontonkan genital lebih khas ekshibisionisme."],"komponenStatistik":"Diagnostics"},{"soal":"21. Perempuan 22 tahun kontrol epilepsi. Tidak ada bangkitan selama 3 bulan, ada kelemahan anggota gerak dan BB naik. Obat apa yang menimbulkan efek samping tersebut?","opsi":["A. Asam valproat","B. Fenobarbital","C. Etosuksimid","D. Alpramazol","E. Metronidazole"],"jawabanBenar":0,"pembahasan":"Asam valproat (anti-konvulsan) terkenal dengan efek samping berupa peningkatan berat badan.","pembahasanPilihan":["Asam valproat dapat menyebabkan kenaikan berat badan; juga perlu memperhatikan tremor dan hepatotoksisitas.","Fenobarbital dapat menyebabkan sedasi, gangguan kognitif, dan efek metabolisme obat; bukan pilihan paling khas untuk kenaikan BB pada kasus ini.","Etosuksimid terutama digunakan untuk absence seizure dan efek samping khasnya adalah gangguan GI, bukan kenaikan BB.","Alprazolam adalah benzodiazepin untuk kecemasan; tidak digunakan sebagai terapi pemeliharaan epilepsi dan dapat menyebabkan sedasi/dependensi.","Metronidazol adalah antibiotik/antiprotozoa; bukan obat antikejang pemeliharaan."],"komponenStatistik":"Pharmacology"},{"soal":"22. Laki laki 23 tahun membutuhkan analgesik. Diberikan agonis antagonis pentazocin. Keuntungan lebih rendah dari morfin. Apa kekurangan dari obat tersebut?","opsi":["A. Lebih mudah timbul depresi nafas","B. Lebih cepat timbul gejala putus obat","C. Tidak digunakan pada pasien asma","D. Dosis terapi lebih besar dari morfin","E. Dapat meninbulkan retensi urin"],"jawabanBenar":1,"pembahasan":"Pentazocine adalah agonis-antagonis opioid dengan efek analgesik dan ceiling effect pada depresi napas. Kekurangan penting dibanding morfin adalah dapat memicu withdrawal pada pasien yang sudah bergantung opioid karena aktivitas antagonistiknya pada reseptor μ.","pembahasanPilihan":["SALAH. Pentazocine justru memiliki ceiling effect terhadap depresi napas sehingga risiko depresi napas berat cenderung lebih rendah daripada agonis μ murni seperti morfin.","BENAR. Sebagai agonis-antagonis, pentazocine dapat menggeser agonis μ dari reseptor dan memicu withdrawal pada pasien yang sudah toleran/dependen opioid.","SALAH. Asma bukan kontraindikasi spesifik pentazocine; seperti semua opioid, depresi napas tetap harus diwaspadai pada pasien dengan gangguan napas.","SALAH. Potensi analgesiknya lebih rendah daripada morfin, tetapi masalah yang paling khas pada soal adalah antagonisme parsial yang dapat memicu withdrawal, bukan semata kebutuhan dosis lebih besar.","SALAH. Retensi urin memang dapat terjadi pada opioid, tetapi bukan kekurangan utama yang membedakan pentazocine dari morfin pada konteks ini."],"catatanKlinis":"⚠️ Poin ujian: pentazocine = mixed agonist-antagonist. Kata kunci pembeda adalah withdrawal precipitation pada pasien opioid-dependent.","komponenStatistik":"Pharmacology"},{"soal":"23. Wanita percaya dia menikah dgn ustad dan sedang menanti dia pulang. Tidak ada halusinasi. Diagnosis?","opsi":["A. Waham menetap","B. Skizofrenia","C. Bipolar","D. Depresi berat","E. Gangguan stres pasca trauma"],"jawabanBenar":0,"pembahasan":"Waham erotomania yang menetap tanpa gejala skizofrenia lainnya merujuk pada Gangguan Waham Menetap.","pembahasanPilihan":["Waham menetap/delusional disorder dapat berupa keyakinan salah yang menetap tanpa gangguan psikotik global; erotomania adalah salah satu bentuknya.","Skizofrenia biasanya memerlukan gejala psikotik yang lebih luas seperti halusinasi, waham, disorganisasi, atau gejala negatif.","Gangguan bipolar memerlukan episode mania/hipomania atau depresi; waham saja tidak cukup untuk diagnosis.","Depresi berat dengan gejala psikotik membutuhkan episode depresi yang jelas dan biasanya waham/hallusinasi mood-congruent atau incongruent.","PTSD membutuhkan trauma dan gejala intrusi, avoidance, perubahan mood/kognisi, serta hyperarousal."],"komponenStatistik":"Diagnostics"},{"soal":"24. Pasien sulit tidur dan berulang kali terbangun, kemudian sulit tidur lg. Diagnosis?","opsi":["A. Insomnia early","B. Insomnia mid","C. Insomnia late","D. Hipersomnia","E. Parainsomnia"],"jawabanBenar":1,"pembahasan":"Insomnia mid (sleep maintenance insomnia) ditandai dengan sering terbangun di pertengahan tidur.","pembahasanPilihan":["Insomnia sleep-onset/early terjadi saat sulit mulai tidur.","Middle insomnia adalah terbangun berulang pada malam hari lalu sulit tidur kembali, sesuai kasus.","Late insomnia berupa bangun terlalu dini pada pagi hari.","Hipersomnia adalah tidur berlebihan atau kantuk siang berlebihan.","Parasomnia adalah fenomena abnormal selama tidur, bukan pola terbangun berulang sederhana."],"komponenStatistik":"Diagnostics"},{"soal":"25. Seorang wanita mudah panik sesak napas. Meringkuk mendengar suara berderap. Riwayat hampir diperkosa temannya. Diagnosis?","opsi":["A. PTSD (post traumatic stress disorder)","B. Gangguan cemas menyeluruh","C. Depresi","D. Fobia spesifik","E. Serangan panik"],"jawabanBenar":0,"pembahasan":"Riwayat trauma nyata yang mengancam nyawa memicu gejala kilas balik dan penghindaran, khas untuk PTSD.","pembahasanPilihan":["PTSD dapat muncul setelah trauma seksual dengan re-experiencing/flashback, avoidance, hyperarousal, dan respons takut.","Gangguan cemas menyeluruh ditandai kekhawatiran berlebihan menetap terhadap banyak hal, bukan terutama terikat trauma.","Depresi dominan dengan mood rendah/anhedonia dan gejala neurovegetatif; riwayat trauma saja tidak cukup.","Fobia spesifik adalah takut terhadap objek/situasi tertentu; kasus lebih sesuai dengan respons trauma kompleks.","Serangan panik adalah episode mendadak berupa takut intens dengan gejala otonom; pada kasus ini ada konteks trauma dan gejala PTSD."],"komponenStatistik":"Diagnostics"},{"soal":"26. Perempuan 45 tahun, kebas di ujung-ujung telapak tangan dan kaki. Riwayat diabetes tidak terkontrol 5 tahun. Patogenesis kondisi tersebut?","opsi":["A. Pasca infeksi","B. Peningkatan myoinositol","C. Mikroangiopati","D. Autoimun","E. Makroangiopati"],"jawabanBenar":2,"pembahasan":"Neuropati diabetikum tipe stocking-glove disebabkan oleh kerusakan pembuluh darah kapiler halus (mikroangiopati) saraf.","pembahasanPilihan":["Neuropati diabetik bukan terutama komplikasi pascainfeksi.","Peningkatan myoinositol bukan mekanisme utama yang menjelaskan kerusakan saraf diabetik; perubahan jalur poliol dan mikrovaskular lebih relevan.","Mikroangiopati menyebabkan iskemia saraf dan merupakan mekanisme penting neuropati diabetik.","Autoimun lebih khas pada neuropati tertentu seperti GBS/CIDP, bukan mekanisme utama polineuropati diabetik kronis.","Makroangiopati menyebabkan penyakit pembuluh besar seperti PAD; dapat menyertai DM tetapi bukan mekanisme utama neuropati distal simetris."],"komponenStatistik":"Physiology"},{"soal":"27. Wanita 74 tahun dengan alzhemeir, otopsi ditemukan atrofi pada gyrus bilateral dan hipokampus. Kemungkinan temuan lainnya?","opsi":["A. Penyakit lessyenchema","B. Periventrical patches","C. Cerebritis","D. Pachygyria","E. Hydrocephalus ex vacuo"],"jawabanBenar":4,"pembahasan":"Atrofi otak pada Alzheimer akan memicu pelebaran sekunder ventrikel otak yang disebut Hydrocephalus ex vacuo.","pembahasanPilihan":["Lesi tertentu bukan temuan khas Alzheimer; diagnosis neuropatologi Alzheimer lebih terkait plak amyloid dan neurofibrillary tangles.","Periventrical patches lebih terkait demielinisasi seperti multiple sclerosis, bukan Alzheimer tipikal.","Cerebritis adalah inflamasi jaringan otak dan bukan temuan neuropatologi khas Alzheimer.","Pachygyria adalah kelainan migrasi kortikal kongenital, bukan perubahan degeneratif Alzheimer.","Atrofi hipokampus dan korteks pada Alzheimer menyebabkan pelebaran ventrikel ex vacuo; juga dapat ditemukan plak amyloid dan tangles tau."],"komponenStatistik":"Histology"},{"soal":"28. Perempuan 53 tahun nyeri punggung berat, demam, BB turun. Deformitas korpus torakal bawah berbentuk benjolan keras. Deformitas yang di maksud?","opsi":["A. Lordosis","B. Gibbus","C. Beak","D. Kifosis","E. Skoliosis"],"jawabanBenar":1,"pembahasan":"Deformitas tajam menonjol akibat infeksi (TB Spondilitis) pada korpus tulang belakang disebut Gibbus.","pembahasanPilihan":["Lordosis adalah lengkung anterior berlebihan, terutama lumbal; bukan deformitas tajam akibat kolaps korpus torakal.","Gibbus adalah kifosis angular tajam akibat kolaps/destruksi beberapa korpus, klasik pada spondilitis TB.","Beak menggambarkan osteofit atau tonjolan tulang, bukan istilah utama untuk deformitas gibbus.","Kifosis adalah lengkung posterior torakal; gibbus merupakan bentuk angular yang lebih tajam.","Skoliosis adalah deviasi lateral tulang belakang."],"komponenStatistik":"Diagnostics"},{"soal":"29. Seneng main hp ga bisa lepas dari hp sampe ganggu presentasi kuliah:","opsi":["A. Nomofobia","B. Klaustrofobia","C. Agorafobia","D. Akrofobia","E. Xenofobia"],"jawabanBenar":0,"pembahasan":"Nomofobia (no-mobile-phone phobia) adalah ketakutan berlebih bila tidak mengakses ponsel.","pembahasanPilihan":["Nomofobia adalah istilah untuk ketakutan atau kecemasan ketika tidak dapat menggunakan atau mengakses ponsel.","Fotofobia adalah sensitivitas/ketidaknyamanan terhadap cahaya terang.","Agorafobia berkaitan dengan situasi seperti kerumunan, tempat terbuka/tertutup, atau transportasi yang dianggap sulit ditinggalkan.","Akrofobia adalah takut ketinggian.","Xenofobia adalah ketakutan/permusuhan terhadap orang asing atau kelompok luar, bukan ponsel."],"komponenStatistik":"Diagnostics"},{"soal":"30. Perempuan ngaku ustad adalah suaminya, istri kedua ustad makanya ga di publish. Diagnosis?","opsi":["A. Skizofrenia","B. Bipolar","C. Waham Erotomania","D. Waham Kebesaran","E. Waham Kejar"],"jawabanBenar":2,"pembahasan":"Keyakinan menetap bahwa seseorang (biasanya berstatus lebih tinggi) mencintainya adalah Waham Erotomania.","pembahasanPilihan":["Skizofrenia membutuhkan gangguan psikotik yang lebih luas dan durasi sesuai kriteria; waham terisolasi tidak otomatis skizofrenia.","Bipolar memerlukan episode mood (mania/hipomania/depresi) selain gejala psikotik.","Erotomania adalah waham bahwa orang lain, sering seseorang berstatus lebih tinggi, mencintai pasien; kasus ini khas.","Waham kebesaran berisi keyakinan memiliki kekuasaan, identitas, kemampuan, atau status luar biasa.","Waham kejar berisi keyakinan bahwa dirinya sedang diikuti, disadap, diracuni, atau dirugikan."],"komponenStatistik":"Diagnostics"},{"soal":"31. Fobia ketinggian disebut:","opsi":["A. Akrofobia","B. Agorafobia","C. Klaustrofobia","D. Aviophobia","E. Xenofobia"],"jawabanBenar":0,"pembahasan":"Akrofobia adalah istilah medis untuk ketakutan ekstrem pada tempat tinggi.","pembahasanPilihan":["Akrofobia adalah takut ketinggian.","Agorafobia adalah takut situasi yang sulit ditinggalkan atau mendapat pertolongan.","Klaustrofobia adalah takut ruang tertutup/sempit.","Aviophobia adalah takut terbang.","Xenofobia adalah ketakutan/permusuhan terhadap orang asing atau kelompok luar."],"komponenStatistik":"Recall"},{"soal":"32. Bola mata ke arah medial terus, nervus apa yg bermasalah?","opsi":["A. N. Trochlearis","B. N. Abduscens","C. N. Oculomotorius","D. N. Opticus","E. N. Facialis"],"jawabanBenar":1,"pembahasan":"Lesi pada Nervus VI (Abduscens) menyebabkan otot rektus lateral lumpuh, sehingga mata tertarik ke medial (esotropia).","pembahasanPilihan":["N. trochlearis (IV) mempersarafi superior oblique; lesinya menyebabkan diplopia vertikal dan kesulitan melihat ke bawah-adduksi.","N. abducens (VI) mempersarafi lateral rectus; lesinya membuat mata deviasi medial/esotropia karena lateral rectus lemah.","N. oculomotorius (III) mempersarafi medial rectus dan sebagian besar otot ekstraokular; lesi lengkap biasanya menyebabkan mata down-and-out.","N. opticus (II) membawa penglihatan aferen; lesinya tidak menyebabkan esotropia primer.","N. facialis (VII) mempersarafi otot ekspresi wajah, bukan otot ekstraokular."],"komponenStatistik":"Anatomy"},{"soal":"33. Kebas di ujung telapak tangan kaki. Riwayat diabetes tidak terkontrol. Diagnosis yang paling TIDAK mungkin?","opsi":["A. Mononeuropati multipleks","B. Neuropati perifer","C. Polineuropati diabetikum","D. Infark thalamus","E. Guillain Barre Syndrome"],"jawabanBenar":3,"pembahasan":"Infark thalamus adalah lesi saraf pusat, bukan neuropati tepi (sarung tangan dan kaus kaki) seperti pada DM.","pembahasanPilihan":["Mononeuropati multipleks dapat terjadi pada diabetes, vasculitis, atau penyakit sistemik; jadi masih mungkin.","Neuropati perifer merupakan istilah luas dan sangat mungkin pada diabetes kronis.","Polineuropati diabetikum adalah penyebab klasik kebas distal simetris pada tangan dan kaki.","Infark thalamus lebih sering menimbulkan gangguan sensorik sentral pada hemibody, bukan pola stocking-glove distal simetris.","Guillain-Barré dapat menyebabkan parestesia dan kelemahan progresif, tetapi biasanya akut/subakut dan sering ascending; tetap merupakan diagnosis banding."],"komponenStatistik":"Diagnostics"},{"soal":"34. (Sama dgn 32) Bola mata ke arah medial terus, nervus apa yg bermasalah?","opsi":["A. N. III","B. N. IV","C. N. V","D. N. VI","E. N. VII"],"jawabanBenar":3,"pembahasan":"Nervus VI (Abduscens).","pembahasanPilihan":["N. III mempersarafi medial rectus, tetapi lesi III lengkap biasanya juga memberi ptosis dan pupil abnormal; bukan jawaban terbaik pada kasus ini.","N. IV mempersarafi superior oblique.","N. V mempersarafi sensasi wajah dan otot mastikasi, bukan gerakan bola mata.","N. VI mempersarafi lateral rectus; lesinya menyebabkan mata tertarik ke medial karena kehilangan abduksi.","N. VII mempersarafi otot ekspresi wajah."],"komponenStatistik":"Anatomy"},{"soal":"35. Arteri yg memperdarahi gyrus cinguli?","opsi":["A. Cerebri media","B. Cerebri posterior","C. Cerebri anterior","D. Communicans anterior","E. Basilaris"],"jawabanBenar":2,"pembahasan":"Permukaan otak bagian medial, termasuk gyrus cinguli, diperdarahi oleh arteri cerebri anterior.","pembahasanPilihan":["MCA memperdarahi permukaan lateral hemisfer, termasuk area bahasa motorik lateral, bukan gyrus cinguli medial.","PCA terutama memperdarahi lobus oksipital dan medial temporal.","ACA memperdarahi permukaan medial frontal-parietal, termasuk gyrus cinguli.","Communicans anterior menghubungkan kedua ACA; bukan pembuluh utama yang memperdarahi jaringan cinguli.","Basilaris memberi cabang ke batang otak dan berlanjut menjadi PCA; bukan pemasok utama cinguli."],"komponenStatistik":"Anatomy"},{"soal":"36. Pria 35 tahun gejala psikiatrik dan demensia (Creutzfeldt Jakob). Sifat mikroorganisme penyebab?","opsi":["A. Sensitif enzim nuklease","B. Resisten terhadap enzim nuklease","C. Masa inkubasi sangat cepat","D. Bakteri gram negatif","E. Anaerob"],"jawabanBenar":1,"pembahasan":"Penyakit Prion (BSE/CJD) disebabkan oleh protein tanpa asam nukleat sehingga resisten terhadap enzim nuklease.","pembahasanPilihan":["Prion tidak seperti bakteri biasa; agen penyebab CJD terutama berupa protein salah lipat dan sangat resisten terhadap inaktivasi nuklease.","Prion tidak mengandung asam nukleat seperti DNA/RNA, sehingga relatif resisten terhadap nuklease.","Masa inkubasi CJD biasanya panjang, sering bertahun-tahun, bukan sangat cepat.","CJD bukan penyakit bakteri gram negatif.","CJD bukan infeksi anaerob bakteri; penyebabnya adalah prion."],"komponenStatistik":"Histology"},{"soal":"37. Sistem saraf otonom yang bekerja pada saat relax?","opsi":["A. Saraf simpatis","B. Saraf parasimpatis","C. Saraf motorik","D. Saraf sensorik","E. Saraf somatik"],"jawabanBenar":1,"pembahasan":"Saraf parasimpatis mengontrol respon rest and digest (relaksasi).","pembahasanPilihan":["Simpatis dominan pada fight-or-flight: meningkatkan denyut jantung, bronkodilatasi, dan menurunkan aktivitas GI.","Parasimpatis dominan saat rest-and-digest: menurunkan denyut jantung dan meningkatkan fungsi gastrointestinal.","Saraf motorik somatik mengendalikan otot rangka secara sadar, bukan sistem relaksasi viseral.","Saraf sensorik membawa informasi aferen ke SSP; bukan sistem otonom yang mengatur keadaan istirahat.","Sistem somatik berhubungan dengan sensasi sadar dan motorik volunter."],"komponenStatistik":"Physiology"},{"soal":"38. Parkinson disease (tremor, rigitas, bradikinesia). Pernyataan yang TIDAK TEPAT?","opsi":["A. Kerusakan substansia nigra pars kompakta","B. Dopamin menurun","C. Meningkatnya eksitasi pada korteks cerebri","D. Instabilitas postural","E. Gangguan traktus ekstrapiramidal"],"jawabanBenar":2,"pembahasan":"Pada Parkinson, justru eksitasi thalamus ke korteks cerebri berkurang (menyebabkan gerak melambat/bradikinesia).","pembahasanPilihan":["Parkinson terutama berkaitan dengan degenerasi neuron dopaminergik substantia nigra pars compacta.","Kadar dopamin di striatum menurun sehingga keseimbangan direct/indirect pathway terganggu.","Pernyataan peningkatan eksitasi korteks secara umum tidak tepat sebagai mekanisme utama; output thalamokortikal justru cenderung menurun pada jalur motorik.","Instabilitas postural merupakan gejala motorik Parkinson, terutama pada stadium lanjut.","Gangguan sirkuit basal ganglia/ekstrapiramidal merupakan inti patofisiologi Parkinson."],"komponenStatistik":"Physiology"},{"soal":"39. Wanita 24 tahun menyayat tangannya. Tidak semangat hidup 3 minggu. Tatalaksana utama?","opsi":["A. Escitalopram","B. Propanolol","C. Trifenidil","D. Diazepam","E. Zolpidem"],"jawabanBenar":0,"pembahasan":"Tatalaksana episode depresi mayor yang utama adalah antidepresan golongan SSRI seperti Escitalopram.","pembahasanPilihan":["Escitalopram adalah SSRI; pada depresi dengan risiko bunuh diri tetap perlu pemantauan ketat dan safety planning.","Propranolol bukan terapi utama episode depresi mayor; lebih sering untuk tremor atau gejala otonom tertentu.","Trihexyphenidyl adalah antikolinergik untuk gejala Parkinson, bukan terapi depresi.","Diazepam dapat meredakan kecemasan akut tetapi tidak mengobati episode depresi mayor dan berisiko ketergantungan.","Zolpidem adalah hipnotik untuk insomnia; bukan terapi inti depresi mayor."],"komponenStatistik":"Pharmacology"},{"soal":"40. Perempuan, 60 tahun tidak bisa membedakan semua sensasi somatosensorik, organ yang mungkin terganggu?","opsi":["A. Epithalamus","B. Subthalamus","C. Metathalamus","D. Hypothalamus","E. Thalamus"],"jawabanBenar":4,"pembahasan":"Thalamus merupakan stasiun pemancar utama untuk semua sinyal sensorik (kecuali penciuman).","pembahasanPilihan":["Epithalamus berkaitan dengan habenula dan pineal, bukan relay utama semua sensasi somatosensorik.","Subthalamus merupakan bagian sirkuit basal ganglia, bukan pusat relay sensorik utama.","Metathalamus terutama mencakup corpus geniculatum lateral/medial untuk visual dan auditorik.","Hipotalamus mengatur homeostasis dan fungsi endokrin/otonom, bukan relay utama sensasi sadar.","Thalamus adalah relay utama hampir semua sensasi somatosensorik menuju korteks, kecuali olfaksi."],"komponenStatistik":"Anatomy"},{"soal":"41. Perempuan 24 tahun menyayat tangan. Sedih, kesulitan tidur selama 3 minggu. Tidak ada halusinasi/waham. Diagnosis?","opsi":["A. Episode depresi sedang","B. Episode depresi berat dengan gejala psikotik","C. Episode depresi berat tanpa gejala psikotik","D. Episode depresi ringan","E. Episode depresi minor"],"jawabanBenar":2,"pembahasan":"Percobaan bunuh diri masuk depresi berat, namun karena tidak ada halusinasi, diklasifikasikan tanpa gejala psikotik.","pembahasanPilihan":["Episode depresi sedang memiliki gejala lebih banyak/berat dibanding ringan tetapi belum memenuhi gambaran berat.","Gejala psikotik mensyaratkan waham/halusinasi; kasus menyatakan tidak ada gejala tersebut.","Episode depresi berat tanpa gejala psikotik sesuai dengan gejala depresi bermakna selama ≥2 minggu disertai perilaku menyakiti diri.","Episode ringan biasanya gangguan fungsi lebih ringan dan gejala lebih sedikit.","Depresi minor adalah istilah nonformal/subthreshold; bukan pilihan terbaik ketika kriteria episode berat terpenuhi."],"komponenStatistik":"Diagnostics"},{"soal":"42. Arti kata ulil albab dalam al quran adalah","opsi":["A. Orang yang berakal","B. Orang yang beriman","C. Orang yang bertakwa","D. Orang yang fasik","E. Orang yang soleh"],"jawabanBenar":0,"pembahasan":"Ulil Albab merujuk kepada kaum yang menggunakan akalnya untuk merenungkan penciptaan.","pembahasanPilihan":["Saleh berarti orang yang baik/taat; merupakan karakter, bukan terjemahan khusus Ulul Albab.","Beriman berarti percaya kepada Allah dan ajaran-Nya; maknanya tidak sama persis dengan istilah Ulul Albab.","Bertakwa berarti menjalankan perintah dan menjauhi larangan Allah; bukan arti literal Ulul Albab.","Fasik berarti keluar dari ketaatan atau melakukan kefasikan; jelas bukan makna Ulul Albab.","Ulul Albab merujuk pada orang-orang yang menggunakan akal/pikiran yang jernih dan mampu mengambil pelajaran."],"komponenStatistik":"Recall"},{"soal":"43. Struktur yang mempengaruhi jalur saraf motorik ekstrapiramid adalah...","opsi":["A. Korteks premotorik, medulla oblongata","B. Corpus striatum, nukleus lentiformis, tegmentum mesencephali, cerebellum","C. Mesencephalon, pons, medulla spinalis","D. Diencephalon, substansia grisea","E. Nukleus caudatus, pons"],"jawabanBenar":1,"pembahasan":"Jalur ekstrapiramidal sangat terkait dengan anatomi Ganglia Basalis dan serebelum.","pembahasanPilihan":["Korteks premotor dan medula bukan keseluruhan struktur ekstrapiramidal; jalur piramidal terutama berasal dari korteks motorik.","Basal ganglia seperti corpus striatum/nukleus lentiformis bekerja bersama sirkuit mesensefalon dan serebelum untuk modulasi gerak.","Mesensefalon, pons, dan medula adalah batang otak; bukan keseluruhan pusat ekstrapiramidal.","Diencephalon dan substansia grisea terlalu umum dan tidak menggambarkan inti sirkuit basal ganglia.","Nukleus caudatus memang bagian basal ganglia, tetapi pons bukan struktur utama ekstrapiramidal; opsi ini tidak lengkap."],"komponenStatistik":"Anatomy"},{"soal":"44. Efek penambahan vasokonstriktor pada anestesi lokal?","opsi":["A. Konstriksi pembuluh darah besar","B. Penurunan perfusi jaringan sekitar","C. Penurunan durasi waktu eliminasi","D. Peningkatan risiko toksisitas sistemik","E. Mempercepat obat masuk darah"],"jawabanBenar":1,"pembahasan":"Vasokonstriktor menurunkan aliran/perfusi darah di area lokal sehingga obat menetap lebih lama.","pembahasanPilihan":["Vasokonstriktor seperti epinefrin menyempitkan pembuluh lokal, tetapi efek klinis yang dicari adalah mengurangi aliran/perfusi lokal.","Penurunan perfusi lokal memperlambat absorpsi anestetik ke sirkulasi sehingga durasi blok memanjang dan toksisitas sistemik berkurang.","Vasokonstriktor justru cenderung memperpanjang, bukan memperpendek, durasi anestesi lokal.","Risiko toksisitas sistemik umumnya menurun karena absorpsi sistemik diperlambat; overdosis tetap harus dihindari.","Vasokonstriktor tidak mempercepat masuknya anestetik ke darah; justru menghambat absorpsi sistemik."],"komponenStatistik":"Pharmacology"},{"soal":"45. Wanita Ca ovarium metastase. Aktivitas terhambat karena nyeri abdomen (VAS tinggi). Analgesik?","opsi":["A. Gol opioid","B. Gol COX 2","C. Gabungan NSAID lemah","D. Gol COX 3","E. Blok epidural"],"jawabanBenar":0,"pembahasan":"Untuk nyeri hebat pada kasus kanker metastasis, opioid kuat (WHO step 3) adalah lini utama.","pembahasanPilihan":["Opioid merupakan analgesik utama untuk nyeri kanker berat dengan VAS tinggi, dengan titrasi berdasarkan respons dan efek samping.","COX-2/NSAID dapat membantu nyeri inflamasi tetapi sering tidak cukup untuk nyeri kanker berat sendiri.","NSAID lemah tidak memadai sebagai monoterapi untuk nyeri kanker berat.","COX-3 bukan target klinis standar untuk terapi nyeri kanker.","Epidural dapat dipertimbangkan pada kasus terpilih, tetapi bukan pilihan awal umum dibanding opioid sistemik untuk nyeri kanker berat."],"komponenStatistik":"Pharmacology"},{"soal":"46. Pasien Parkinson, pernyataan dibawah yang TIDAK tepat adalah?","opsi":["A. Kerusakan substansia nigra pars kompakta","B. Menurunnya inhibisi pada Globus palidus interna","C. Dopamin menurun","D. Meningkatnya eksitasi pada korteks cerebri","E. Terjadi resting tremor"],"jawabanBenar":3,"pembahasan":"Hambatan dari GPi ke thalamus meningkat pada Parkinson, sehingga eksitasi ke korteks serebri justru menurun.","pembahasanPilihan":["Parkinson terutama berkaitan dengan degenerasi neuron dopaminergik substantia nigra pars compacta.","Gangguan sirkuit basal ganglia/ekstrapiramidal merupakan inti patofisiologi Parkinson.","Kadar dopamin di striatum menurun sehingga keseimbangan direct/indirect pathway terganggu.","Pernyataan peningkatan eksitasi korteks secara umum tidak tepat sebagai mekanisme utama; output thalamokortikal justru cenderung menurun pada jalur motorik.","Instabilitas postural merupakan gejala motorik Parkinson, terutama pada stadium lanjut."],"komponenStatistik":"Physiology"},{"soal":"47. Pulang dari Texas, diduga Meningitis. Pemeriksaan penunjang?","opsi":["A. Darah lengkap","B. CT Scan Kepala","C. LCS (Lumbal Pungsi)","D. MRI","E. EEG"],"jawabanBenar":2,"pembahasan":"Pemeriksaan Cairan Serebrospinal (LCS) adalah baku emas untuk diagnosis meningitis.","pembahasanPilihan":["Darah lengkap dapat membantu menilai infeksi tetapi tidak mengonfirmasi etiologi meningitis.","CT kepala dipakai bila ada indikasi sebelum LP, misalnya defisit fokal, penurunan kesadaran tertentu, atau risiko massa.","Lumbal pungsi memungkinkan analisis LCS: sel, protein, glukosa, Gram/kultur, dan pemeriksaan etiologi.","MRI lebih sensitif untuk komplikasi tertentu tetapi bukan pemeriksaan awal rutin untuk memastikan meningitis.","EEG menilai aktivitas listrik otak dan bukan pemeriksaan utama untuk diagnosis meningitis."],"komponenStatistik":"Diagnostics"},{"soal":"48. Diurut untuk menghilangkan rasa nyeri dan memberikan perasaan senang. Neurotransmitter pereda nyeri?","opsi":["A. Dopamin","B. Histamin","C. GABA","D. Endorfin","E. Melatonin"],"jawabanBenar":3,"pembahasan":"Endorfin adalah analgesik alami tubuh (opioid endogen) pereda nyeri yang memicu rasa sejahtera.","pembahasanPilihan":["Dopamin terutama terkait reward, motivasi, dan gerakan; bukan opioid endogen utama untuk analgesia.","Histamin berperan dalam alergi, inflamasi, dan wakefulness; bukan mediator utama analgesia opioid.","GABA adalah inhibitorik utama SSP dan dapat memodulasi nyeri, tetapi bukan neurotransmiter analgesik endogen klasik yang dimaksud.","Endorfin adalah opioid endogen yang mengaktivasi reseptor opioid dan mengurangi persepsi nyeri.","Melatonin mengatur ritme sirkadian dan tidur; bukan neurotransmiter utama pereda nyeri."],"komponenStatistik":"Physiology"},{"soal":"49. Sifat kimia cairan liquor cerebrospinal (LCS) normal?","opsi":["A. Osmolaritasnya sama dengan osmolaritas darah","B. Klorida lebih rendah dari plasma","C. pH sangat basa","D. Protein sama dengan darah","E. Glukosa LCS lebih tinggi dari darah"],"jawabanBenar":0,"pembahasan":"LCS isotonis/isosmolar dengan plasma darah, dengan kadar protein yang jauh lebih rendah dan glukosa sekitar 60% plasma.","pembahasanPilihan":["Osmolalitas LCS mendekati plasma; komposisinya mirip tetapi tidak identik.","Klorida LCS relatif lebih tinggi daripada plasma, bukan lebih rendah.","pH LCS sedikit lebih rendah dari darah dan tidak sangat basa.","Protein LCS jauh lebih rendah daripada plasma karena sawar darah-LCS.","Glukosa LCS sekitar 60% kadar plasma dan biasanya lebih rendah, bukan lebih tinggi."],"komponenStatistik":"Physiology"},{"soal":"50. Tetanus karena paku, trismus, risus sardonicus. Yang TIDAK TEPAT pada tatalaksana pasien?","opsi":["A. Observasi di ICU redup","B. Penisilin G dan metronidazole","C. Diazepam","D. Debridement, necrotomy, jahit ulang rapat","E. Pemberian HTIG 500 UI"],"jawabanBenar":3,"pembahasan":"Luka dicurigai C. tetani (anaerob) tidak boleh dijahit rapat; harus dibiarkan terbuka terkena oksigen setelah debridement.","pembahasanPilihan":["Pasien tetanus berat memerlukan monitoring intensif karena spasme dapat mengganggu napas dan otonom.","Metronidazol adalah pilihan antimikroba yang baik; penisilin G juga secara historis digunakan.","Diazepam/benzodiazepin membantu mengontrol spasme dan kekakuan.","Luka tetanus harus dibersihkan dan didebridement; luka tusuk kotor tidak dianjurkan dijahit rapat primer karena menjebak kondisi anaerob.","HTIG menetralkan toksin yang masih bebas; dosis mengikuti pedoman lokal, sehingga angka dosis harus disesuaikan protokol."],"catatanKlinis":"⚠️ Catatan: pada tetanus modern, metronidazol umumnya lebih disukai daripada penisilin. Yang jelas TIDAK TEPAT adalah menjahit luka tusuk kotor rapat primer setelah debridement.","komponenStatistik":"Pharmacology"},{"soal":"51. Pasien tidak bisa lepas dari gadget atau gawai","opsi":["A. Xenophobia","B. Nomophobia","C. Fotophobia","D. Akrofobia","E. Klaustrofobia"],"jawabanBenar":1,"pembahasan":"Nomophobia adalah rasa takut tidak bisa mengakses ponsel/gawai.","pembahasanPilihan":["Nomofobia adalah istilah untuk ketakutan atau kecemasan ketika tidak dapat menggunakan atau mengakses ponsel.","Xenofobia adalah ketakutan/permusuhan terhadap orang asing atau kelompok luar, bukan ponsel.","Fotofobia adalah sensitivitas/ketidaknyamanan terhadap cahaya terang.","Akrofobia adalah takut ketinggian.","Agorafobia berkaitan dengan situasi seperti kerumunan, tempat terbuka/tertutup, atau transportasi yang dianggap sulit ditinggalkan."],"komponenStatistik":"Diagnostics"},{"soal":"52. Jatuh dari motor. CT Scan perdarahan temporal dextra crescent sign. Diagnosis?","opsi":["A. Abses serebri","B. Infark serebri","C. Perdarahan epidural","D. Perdarahan subdural","E. Perdarah subaracnoid"],"jawabanBenar":3,"pembahasan":"Crescent sign (bentuk bulan sabit) = Subdural Hematoma (SDH).","pembahasanPilihan":["Abses serebri berupa lesi massa dengan edema dan biasanya ring enhancement; bukan hematoma crescent.","Infark cerebri menunjukkan area hipodens karena iskemia, bukan koleksi darah berbentuk crescent.","Epidural hematoma khas berbentuk lentiform/bikonveks dan dapat terkait fraktur temporal serta robekan middle meningeal artery.","Subdural hematoma berbentuk crescent karena darah terkumpul di antara dura dan arachnoid; sering akibat robekan bridging veins.","Subarachnoid hemorrhage biasanya tampak darah di sulkus/cisterna dan sering terkait thunderclap headache; bukan gambaran crescent."],"komponenStatistik":"Diagnostics"},{"soal":"53. Meningitis dengan LCS keruh, bakteri diplokokus gram positif. Bakteri apa?","opsi":["A. Neisseria hemophilia","B. Neisseria meningitidis","C. Streptococcus pneumonia","D. Streptococcus pyogenes","E. Listeria"],"jawabanBenar":2,"pembahasan":"S. pneumoniae adalah diplokokus gram positif khas penyebab radang selaput otak (meningitis).","pembahasanPilihan":["Neisseria haemophilus bukan nama spesies penyebab meningitis; Haemophilus influenzae adalah bakteri berbeda dan gram negatif coccobacillus.","N. meningitidis berbentuk diplokokus gram negatif, bukan gram positif.","Streptococcus pneumoniae adalah diplokokus gram positif berkapsul dan merupakan penyebab penting meningitis komunitas.","Streptococcus pyogenes adalah kokus gram positif beta-hemolitik yang terutama menyebabkan faringitis dan infeksi kulit.","Listeria monocytogenes adalah basil gram positif intraseluler fakultatif, penting pada neonatus, lansia, dan imunokompromais."],"komponenStatistik":"Diagnostics"},{"soal":"54. GCS: tidak membuka mata (E1), suara mengerang (V2), tangan bergerak tidak melokalisir nyeri (fleksi/M4). Nilai GCS?","opsi":["A. E1V2M5","B. E1V3M5","C. E1V2M4","D. E2V1M5","E. E2V2M4"],"jawabanBenar":2,"pembahasan":"Sesuai skor E1, V2, dan M4.","pembahasanPilihan":["E1V2M5 salah karena M5 berarti melokalisasi nyeri; kasus hanya fleksi abnormal M4.","E1V3M5 salah karena suara mengerang adalah V2, bukan V3 (kata-kata tidak sesuai).","E1V2M4 benar: mata tidak membuka, suara mengerang, dan menarik/fleksi terhadap nyeri sesuai skor 1+2+4=7.","E2V1M5 salah karena mata hanya terbuka terhadap nyeri dan respons verbal bukan V1 jika mengerang.","E2V2M4 salah karena E pada kasus adalah 1, bukan 2."],"komponenStatistik":"Diagnostics"},{"soal":"55. Kejang dgn tatapan kosong, menepuk-nepuk tangan berulang. Apa yang dimaksud dengan automatisme?","opsi":["A. Bangkitan kejang","B. Tatapan kosong","C. Mengompol","D. Menepuk nepuk tangan berulang","E. Pandangan gelap"],"jawabanBenar":3,"pembahasan":"Automatisme adalah gerakan repetitif, tak bertujuan, tanpa disadari (seperti menepuk tangan atau mengecap bibir).","pembahasanPilihan":["Bangkitan kejang adalah aktivitas listrik abnormal; automatisme merupakan perilaku otomatis yang terjadi selama bangkitan.","Tatapan kosong dapat terjadi pada absence seizure tetapi bukan definisi automatisme.","Mengompol dapat menjadi manifestasi kejang, tetapi bukan automatisme.","Menepuk-nepuk tangan berulang tanpa tujuan sadar merupakan contoh automatisme, terutama pada kejang fokal dengan gangguan kesadaran.","Pandangan gelap lebih menggambarkan gangguan visual/presinkop, bukan automatisme."],"komponenStatistik":"Recall"},{"soal":"56. Percobaan bunuh diri sayat tangan, sedih, tidak berguna selama 3 minggu. Diagnosis?","opsi":["A. Episode depresi minor","B. Episode depresi berat dengan gejala psikotik","C. Episode depresi sedang","D. Episode depresi ringan","E. Episode depresi berat tanpa gejala psikotik"],"jawabanBenar":4,"pembahasan":"Percobaan bunuh diri tergolong gejala berat. Tanpa halusinasi/waham = tanpa gejala psikotik.","pembahasanPilihan":["Depresi minor adalah istilah nonformal/subthreshold; bukan pilihan terbaik ketika kriteria episode berat terpenuhi.","Gejala psikotik mensyaratkan waham/halusinasi; kasus menyatakan tidak ada gejala tersebut.","Episode depresi sedang memiliki gejala lebih banyak/berat dibanding ringan tetapi belum memenuhi gambaran berat.","Episode ringan biasanya gangguan fungsi lebih ringan dan gejala lebih sedikit.","Episode depresi berat tanpa gejala psikotik sesuai dengan gejala depresi bermakna selama ≥2 minggu disertai perilaku menyakiti diri."],"komponenStatistik":"Diagnostics"},{"soal":"57. Kecurigaan epilepsi, radiologi dengan menggunakan medan magnet. Apa nama pemeriksaan tersebut?","opsi":["A. USG kepala","B. CT Scan kepala","C. MRI kepala","D. Intravenous urography","E. Foto polos"],"jawabanBenar":2,"pembahasan":"MRI (Magnetic Resonance Imaging) menggunakan medan magnetik dan gelombang radio.","pembahasanPilihan":["USG kepala tidak menjadi pemeriksaan pilihan untuk evaluasi epilepsi pada dewasa.","CT dapat mendeteksi lesi struktural akut, tetapi tidak menggunakan medan magnet.","MRI menggunakan medan magnet dan memberi resolusi tinggi untuk lesi struktural penyebab epilepsi.","Intravenous urography adalah pemeriksaan sistem urinaria, bukan otak.","Foto polos tengkorak tidak cukup sensitif untuk evaluasi etiologi epilepsi."],"komponenStatistik":"Diagnostics"},{"soal":"58. Percabangan yang menghubungkan antara a.cerebri anterior kiri dan kanan adalah?","opsi":["A. Cerebri media","B. Communicans anterior","C. Cerebri anterior","D. Communicans posterior","E. Cerebri posterior"],"jawabanBenar":1,"pembahasan":"Arteri communicans anterior menjembatani kedua ACA di sirkulus Willisi.","pembahasanPilihan":["MCA bukan pembuluh yang menghubungkan kedua sisi sirkulasi anterior.","Arteri communicans anterior menghubungkan ACA kiri dan kanan di bagian anterior circle of Willis.","ACA adalah pembuluh yang dihubungkan oleh ACom; ACA sendiri bukan 'jembatan' antara keduanya.","Communicans posterior menghubungkan ICA dengan PCA pada masing-masing sisi.","PCA merupakan cabang terminal basilaris dan tidak menghubungkan kedua ACA."],"komponenStatistik":"Anatomy"},{"soal":"59. N. cranialis untuk mempersarafi pengecapan rasa pahit (posterior lidah) adalah?","opsi":["A. N. glossopharyngeal","B. N. trigeminal","C. N. opticus","D. N. abduscens","E. N. fascialis"],"jawabanBenar":0,"pembahasan":"Nervus IX (Glossopharyngeal) mensarafi pengecapan 1/3 posterior lidah tempat papila sirkumvalata merespons pahit.","pembahasanPilihan":["N. glossopharyngeus (IX) membawa sensasi rasa dari sepertiga posterior lidah, termasuk rasa pahit.","N. trigeminus membawa sensasi umum anterior 2/3 lidah, seperti nyeri dan suhu, bukan taste.","N. opticus membawa informasi visual.","N. abducens menggerakkan lateral rectus.","N. facialis membawa taste dari dua pertiga anterior lidah melalui chorda tympani."],"komponenStatistik":"Anatomy"},{"soal":"60. Terapi antihipertensi propranolol. Bagaimana mekanisme kerja obat tersebut?","opsi":["A. Menghambat alfa-1","B. Menghambat beta-2","C. Menghambat alfa-2","D. Menghambat beta-1 (dan beta 2)","E. Merangsang beta-1"],"jawabanBenar":3,"pembahasan":"Propranolol adalah agen beta-blocker non-selektif (menghambat reseptor Beta 1 dan 2).","pembahasanPilihan":["Propranolol bukan selektif alfa-1; blokade alfa-1 merupakan mekanisme obat seperti prazosin.","Propranolol memblok beta-1 dan beta-2; beta-2 blockade dapat menyebabkan bronkospasme.","Alfa-2 bukan target utama propranolol.","Propranolol adalah non-selective beta blocker, menghambat beta-1 dan beta-2 sehingga menurunkan HR, kontraktilitas, dan renin.","Merangsang beta-1 justru meningkatkan denyut/kontraktilitas; berlawanan dengan propranolol."],"komponenStatistik":"Pharmacology"},{"soal":"61. Pasien curiga stroke tanpa CT Scan, dinilai dengan Siriraj Stroke Score. SSS digunakan untuk?","opsi":["A. Membedakan stroke hemoragik vs iskemik klinis","B. Menilai koma","C. Menentukan dosis obat","D. Menilai area lumpuh","E. Skrining depresi"],"jawabanBenar":0,"pembahasan":"Skor SSS digunakan khusus untuk menduga patologi stroke apakah perdarahan atau iskemik.","pembahasanPilihan":["Siriraj Stroke Score membantu membedakan stroke hemoragik dan nonhemoragik secara klinis ketika CT belum tersedia; bukan pengganti CT.","SSS bukan alat utama untuk grading koma; GCS digunakan untuk tingkat kesadaran.","SSS tidak menentukan dosis obat secara langsung.","SSS tidak dirancang untuk memetakan luas area kelumpuhan.","SSS bukan instrumen skrining depresi."],"komponenStatistik":"Diagnostics"},{"soal":"62. Pasien PTSD (hampir diperkosa), meringkuk, cemas. Terapi farmako yang tepat?","opsi":["A. SSRI (Sertraline / Fluoxetine)","B. Antipsikotik tipikal","C. Haloperidol","D. Obat anti-epilepsi","E. Litium"],"jawabanBenar":0,"pembahasan":"SSRI adalah lini pertama farmakoterapi standar untuk PTSD.","pembahasanPilihan":["PTSD dapat muncul setelah trauma seksual dengan re-experiencing/flashback, avoidance, hyperarousal, dan respons takut.","Gangguan cemas menyeluruh ditandai kekhawatiran berlebihan menetap terhadap banyak hal, bukan terutama terikat trauma.","Depresi dominan dengan mood rendah/anhedonia dan gejala neurovegetatif; riwayat trauma saja tidak cukup.","Fobia spesifik adalah takut terhadap objek/situasi tertentu; kasus lebih sesuai dengan respons trauma kompleks.","Serangan panik adalah episode mendadak berupa takut intens dengan gejala otonom; pada kasus ini ada konteks trauma dan gejala PTSD."],"komponenStatistik":"Pharmacology"},{"soal":"63. Kebas di ujung tangan kaki, DM 5 tahun. Diagnosis yang PALING TIDAK mungkin?","opsi":["A. Guillain Barre Syndrome","B. Infark Thalamus","C. Mononeuropati","D. Polineuropati diabetikum","E. Neuropati perifer"],"jawabanBenar":1,"pembahasan":"Infark thalamus merusak sistem saraf pusat di otak, bukan menyebabkan kebas ujung jari pola stocking-glove.","pembahasanPilihan":["GBS biasanya onset akut/subakut dengan kelemahan ascending dan arefleksia; bukan pola kronis khas DM.","Infark thalamus dapat menyebabkan sensory syndrome hemibody, bukan stocking-glove distal simetris.","Mononeuropati dapat terjadi pada DM, tetapi tidak menjelaskan pola distal simetris secara umum.","Polineuropati diabetikum sangat khas dengan kebas distal simetris pola stocking-glove.","Neuropati perifer adalah istilah payung dan dapat mencakup neuropati diabetik."],"komponenStatistik":"Diagnostics"},{"soal":"64. Jatuh dari motor tanpa helm. CT Scan perdarahan temporal dextra cresent sign (bulan sabit). Diagnosis?","opsi":["A. Infark serebri","B. Edema serebri","C. Perdarahan subdural","D. Perdarahan epidural","E. Perdarahan subarachnoid"],"jawabanBenar":2,"pembahasan":"Subdural Hematoma (SDH) identik dengan gambaran crescent sign pada CT Scan.","pembahasanPilihan":["Infark cerebri menunjukkan area hipodens karena iskemia, bukan koleksi darah berbentuk crescent.","Abses serebri berupa lesi massa dengan edema dan biasanya ring enhancement; bukan hematoma crescent.","Subdural hematoma berbentuk crescent karena darah terkumpul di antara dura dan arachnoid; sering akibat robekan bridging veins.","Epidural hematoma khas berbentuk lentiform/bikonveks dan dapat terkait fraktur temporal serta robekan middle meningeal artery.","Subarachnoid hemorrhage biasanya tampak darah di sulkus/cisterna dan sering terkait thunderclap headache; bukan gambaran crescent."],"komponenStatistik":"Diagnostics"},{"soal":"65. GCS: buka mata dgn nyeri (E2), suara mengerang (V2), fleksi dekortikasi (M3). Termasuk kondisi?","opsi":["A. Trauma kepala ringan","B. Trauma kepala sedang","C. Trauma kepala berat","D. Coma sedang","E. Coma dalam"],"jawabanBenar":2,"pembahasan":"Total skor = 7. Kategori Cedera Kepala Berat (CKB) adalah GCS < 8.","pembahasanPilihan":["Trauma kepala ringan umumnya GCS 13-15; skor kasus jauh di bawah itu.","Trauma kepala sedang GCS 9-12; skor kasus lebih rendah.","Trauma kepala berat didefinisikan GCS ≤8; kasus E2V2M3 = 7.","Coma sedang bukan klasifikasi standar yang menggantikan penilaian GCS pada trauma kepala.","Coma dalam bukan istilah yang tepat untuk menentukan derajat trauma; gunakan GCS dan kondisi klinis."],"komponenStatistik":"Diagnostics"},{"soal":"66. Sel saraf motorik yang ada di kornu anterior medulla spinalis bermorfologi?","opsi":["A. Unipolar","B. Bipolar","C. Pseudounipolar","D. Multipolar","E. Tripolar"],"jawabanBenar":3,"pembahasan":"Sebagian besar neuron eferen motorik adalah sel-sel bertipe multipolar (1 akson banyak dendrit).","pembahasanPilihan":["Neuron unipolar memiliki satu proses; bukan morfologi khas motor neuron kornu anterior.","Neuron bipolar memiliki dua proses, misalnya pada retina/epitel olfaktorius tertentu.","Neuron pseudounipolar khas ganglion sensorik spinal dan membawa aferen, bukan motor neuron.","Motor neuron kornu anterior adalah neuron multipolar dengan banyak dendrit dan satu akson.","Tripolar bukan klasifikasi morfologi neuron yang lazim digunakan dalam anatomi dasar."],"komponenStatistik":"Histology"},{"soal":"67. Pasien terapi fenitoin, albumin 3.0 (rendah). Efek protein plasma rendah terhadap fenitoin?","opsi":["A. Toksisitas fenitoin meningkat","B. Fenitoin gagal diserap","C. Efektivitas menurun","D. Ekskresi meningkat tajam","E. Obat rusak di hati"],"jawabanBenar":0,"pembahasan":"Pengikatan protein yang kurang (karena albumin rendah) menaikkan jumlah fenitoin bebas, berisiko intoksikasi.","pembahasanPilihan":["Hipoalbuminemia meningkatkan fraksi fenitoin bebas; kadar total dapat tampak rendah sementara kadar bebas/toksisitas meningkat.","Fenitoin tetap dapat diserap; masalah utama adalah ikatan protein, bukan absorpsi usus.","Efektivitas tidak otomatis menurun; efek farmakologis dapat meningkat karena fraksi bebas naik.","Ekskresi tidak meningkat tajam hanya karena albumin rendah.","Albumin rendah tidak membuat fenitoin rusak di hati."],"komponenStatistik":"Pharmacology"},{"soal":"68. Anak demam 3 hari, muntah proyektil, tanda peningkatan tekanan intrakranial?","opsi":["A. Muntah proyektil (menyemprot)","B. Diare","C. Berkeringat","D. Nadi cepat","E. Batuk"],"jawabanBenar":0,"pembahasan":"Muntah mendadak tanpa rasa mual adalah salah satu indikator klasik peningkatan TIK (Tekanan Intra Kranial).","pembahasanPilihan":["Muntah proyektil dapat menjadi tanda peningkatan tekanan intrakranial, terutama bila disertai sakit kepala, papiledema, atau perubahan kesadaran.","Diare bukan tanda khas peningkatan tekanan intrakranial.","Berkeringat bersifat nonspesifik dan tidak menunjukkan ICP meningkat.","Nadi cepat bukan tanda klasik; peningkatan ICP berat dapat menimbulkan Cushing triad berupa hipertensi, bradikardi, dan napas abnormal.","Batuk tidak spesifik untuk peningkatan tekanan intrakranial."],"komponenStatistik":"Diagnostics"},{"soal":"69. Bola mata kiri selalu melihat ke medial (esotropia strabismus). Alat mana yang mengalami gangguan?","opsi":["A. N. Glossopharygeus","B. N. Occulomatorius","C. N. Opticus","D. N. Trigeminus","E. N. Abduscens (VI)"],"jawabanBenar":4,"pembahasan":"Lesi pada N. Abduscens melumpuhkan m. rektus lateralis sehingga bola mata tertarik kuat ke arah medial.","pembahasanPilihan":["N. trochlearis (IV) mempersarafi superior oblique; lesinya menyebabkan diplopia vertikal dan kesulitan melihat ke bawah-adduksi.","N. abducens (VI) mempersarafi lateral rectus; lesinya membuat mata deviasi medial/esotropia karena lateral rectus lemah.","N. oculomotorius (III) mempersarafi medial rectus dan sebagian besar otot ekstraokular; lesi lengkap biasanya menyebabkan mata down-and-out.","N. opticus (II) membawa penglihatan aferen; lesinya tidak menyebabkan esotropia primer.","N. facialis (VII) mempersarafi otot ekspresi wajah, bukan otot ekstraokular."],"komponenStatistik":"Anatomy"},{"soal":"70. Benjolan kongenital lumbosakral berisi saraf (meningen & myelo) jika tidak diatasi bisa kelumpuhan?","opsi":["A. Meningochele","B. Spina bifida oculata","C. Meningitis","D. Meningoensefalitis","E. Myelomeningochele"],"jawabanBenar":4,"pembahasan":"Jika isi kantong berupa meningen tulang belakang bersama korda spinal, disebut myelomeningocele.","pembahasanPilihan":["Meningokel hanya berisi meninges dan cairan, tanpa jaringan saraf utama.","Spina bifida occulta adalah defek tulang dengan kulit relatif utuh dan biasanya tanpa kantong saraf terbuka.","Meningitis adalah infeksi meningen, bukan malformasi kongenital.","Meningoensefalitis adalah inflamasi otak dan meningen, bukan kelainan tabung saraf.","Myelomeningocele berisi meninges, cairan, dan jaringan medula/saraf; merupakan bentuk spina bifida terbuka yang dapat menyebabkan defisit neurologis."],"komponenStatistik":"Anatomy"},{"soal":"71. Bangunan yang berfungsi untuk memori (konsolidasi jangka pendek ke jangka panjang)?","opsi":["A. Hippocampus","B. Thalamus","C. Corpus callous","D. Gyrus cinguli","E. Amigdala"],"jawabanBenar":0,"pembahasan":"Hipokampus bertugas esensial dalam memproses memori baru.","pembahasanPilihan":["Hipokampus berperan penting dalam pembentukan dan konsolidasi memori deklaratif dari jangka pendek menjadi jangka panjang.","Thalamus berfungsi sebagai relay sensorik dan berperan dalam beberapa sirkuit memori, tetapi bukan pusat konsolidasi utama.","Corpus callosum menghubungkan kedua hemisfer dan memungkinkan komunikasi antarsisi.","Gyrus cinguli berperan pada emosi, motivasi, perhatian, dan komponen memori.","Amigdala terutama memproses emosi dan memperkuat memori emosional."],"komponenStatistik":"Anatomy"},{"soal":"72. Maqasyid syariah menjaga akal?","opsi":["A. Hifzun aql","B. Hifzun nafs","C. Hifzun din","D. Hifzun mal","E. Hifzun nasl"],"jawabanBenar":0,"pembahasan":"Hifdz al-aql berarti pelestarian/penjagaan terhadap akal.","pembahasanPilihan":["Hifz al-'aql berarti menjaga akal/intelek; salah satu tujuan utama maqashid al-syari'ah.","Hifz al-nafs berarti menjaga jiwa/kehidupan.","Hifz al-din berarti menjaga agama.","Hifz al-mal berarti menjaga harta.","Hifz al-nasl berarti menjaga keturunan."],"komponenStatistik":"Recall"},{"soal":"73. Pilihan obat pelumpuh otot untuk memfasilitasi intubasi cepat RSI (Rapid Sequence Intubation)?","opsi":["A. Atracurium","B. Vecuronium","C. Rocuronium (atau Suksinilkolin)","D. Sulfentanyn","E. Propofol"],"jawabanBenar":2,"pembahasan":"Pelumpuh otot dengan mula kerja paling cepat direkomendasikan untuk intubasi darurat.","pembahasanPilihan":["Atracurium bekerja lebih lambat dan umumnya bukan pilihan utama untuk RSI.","Vecuronium efektif sebagai relaksan, tetapi onsetnya lebih lambat daripada rocuronium untuk RSI.","Rocuronium memiliki onset cepat; suksinilkolin juga cepat dan merupakan pilihan klasik bila tidak kontraindikasi.","Sufentanil adalah opioid analgesik, bukan obat pelumpuh otot.","Propofol adalah agen induksi anestesi, bukan neuromuscular blocker."],"komponenStatistik":"Pharmacology"},{"soal":"74. Kakek tidak bisa membedakan sensasi somatosensori separuh tubuh, bagian organ apa yg kena?","opsi":["A. Metthalamus","B. Subtahalmus","C. Epithalamus","D. Thalamus","E. Hipothalamus"],"jawabanBenar":3,"pembahasan":"Thalamus merupakan pusat pemancar untuk nyeri, suhu, dan semua jaras somatosensorik.","pembahasanPilihan":["Hipotalamus mengatur homeostasis dan fungsi endokrin/otonom, bukan relay utama sensasi sadar.","Metathalamus terutama mencakup corpus geniculatum lateral/medial untuk visual dan auditorik.","Epithalamus berkaitan dengan habenula dan pineal, bukan relay utama semua sensasi somatosensorik.","Thalamus adalah relay utama hampir semua sensasi somatosensorik menuju korteks, kecuali olfaksi.","Subthalamus merupakan bagian sirkuit basal ganglia, bukan pusat relay sensorik utama."],"komponenStatistik":"Anatomy"},{"soal":"75. Struktur yang berperan sentral pada sistem gerak motorik ekstrapiramidal?","opsi":["A. Corpus striatum, nukleus lentiformis, serebelum","B. Korteks piramidal motor","C. Hipokampus","D. Saraf perifer tepi","E. Medulla spinalis posterior"],"jawabanBenar":0,"pembahasan":"Sistem ekstrapiramidal sangat bergantung pada ganglia basalis (termasuk corpus striatum) untuk koordinasi otot halus.","pembahasanPilihan":["Basal ganglia/corpus striatum dan nukleus lentiformis merupakan pusat utama sirkuit ekstrapiramidal; serebelum juga memodulasi koordinasi gerak.","Korteks motorik piramidal terutama menggerakkan jalur corticospinal/piramidal.","Hipokampus berperan pada memori, bukan pusat utama kontrol gerak ekstrapiramidal.","Saraf perifer membawa output motorik ke otot tetapi bukan pusat ekstrapiramidal.","Kolumna posterior medula spinalis terutama membawa sensasi propriosepsi, vibrasi, dan diskriminasi."],"komponenStatistik":"Anatomy"},{"soal":"76. Kekurangan dari obat analgesik opioid dosis tinggi adalah efek toksiknya berupa?","opsi":["A. Depresi nafas berat","B. Retensi urin","C. Mual muntah ringan","D. Alergi kulit","E. Diare kronis"],"jawabanBenar":0,"pembahasan":"Efek toksik paling berbahaya dari golongan obat opioid adalah mendepresi pusat pernapasan di medula oblongata.","pembahasanPilihan":["Depresi napas adalah toksisitas opioid yang paling mengancam nyawa, terutama pada dosis tinggi atau kombinasi depresan SSP.","Retensi urin memang dapat terjadi akibat inhibisi parasimpatis kandung kemih, tetapi bukan efek toksik paling berbahaya.","Mual muntah dapat terjadi, terutama pada awal terapi, tetapi umumnya bukan toksisitas paling serius.","Ruam/alergi dapat terjadi namun bukan efek toksik khas yang paling penting pada overdosis opioid.","Diare bukan efek khas; opioid justru menyebabkan konstipasi karena menurunkan motilitas usus."],"komponenStatistik":"Pharmacology"},{"soal":"77. Cortex kornu anterior medulla spinalis memiliki neuron bertipe eferen. Apa namanya?","opsi":["A. Sel purkinje","B. Sel pyramid","C. Sel ganglion","D. Sel saraf motoris","E. Sel saraf sensoris"],"jawabanBenar":3,"pembahasan":"Neuron di sisi depan (anterior) korda spinalis adalah neuron motorik (Lower Motor Neurons).","pembahasanPilihan":["Sel Purkinje adalah neuron inhibitorik utama korteks serebelum.","Sel piramidal terutama ditemukan di korteks serebri dan merupakan neuron proyeksi utama jalur corticospinal.","Sel ganglion adalah istilah umum untuk badan sel di ganglion; bukan nama spesifik motor neuron kornu anterior.","Neuron motorik alfa/gamma di kornu anterior adalah neuron eferen multipolar yang menginervasi otot rangka.","Neuron sensorik primer berada di dorsal root ganglion dan bersifat pseudounipolar."],"komponenStatistik":"Histology"},{"soal":"78. Stroke haemoragik gyrus cinguli. Nama pembuluh darah yang pecah?","opsi":["A. A. communicans anterior","B. A. Communicans posterior","C. A. cerebri anterior","D. A. cerebri media","E. A. cerebri posterior"],"jawabanBenar":2,"pembahasan":"A. Cerebri Anterior (ACA) mendistribusikan darah ke sisi medial lobus frontoparietal otak.","pembahasanPilihan":["Arteri communicans anterior menghubungkan kedua ACA, tetapi bukan pembuluh utama yang langsung memperdarahi gyrus cinguli.","Arteri communicans posterior menghubungkan sirkulasi anterior dan posterior; bukan pemasok utama gyrus cinguli.","PCA terutama memperdarahi lobus oksipital dan bagian medial temporal; bukan pemasok utama gyrus cinguli.","MCA terutama memperdarahi permukaan lateral hemisfer, bukan wilayah medial cinguli.","ACA memperdarahi permukaan medial hemisfer, termasuk banyak bagian gyrus cinguli."],"komponenStatistik":"Anatomy"},{"soal":"79. Pasien sesak diberikan aminofilin cepat, malah terjadi kejang akut. Obat lini pertama untuk hentikan kejang?","opsi":["A. Propofol","B. Diazepam intravena","C. Atropin sulfat","D. Magnesium","E. Valproat oral"],"jawabanBenar":1,"pembahasan":"Kejang aktif di IGD segera ditangani dengan agen abortif utama seperti Diazepam IV.","pembahasanPilihan":["Propofol dapat digunakan sebagai terapi anestetik/refrakter pada status tertentu, tetapi bukan lini pertama kejang akut umum di luar setting khusus.","Diazepam IV adalah benzodiazepin yang efektif untuk menghentikan kejang akut; pada status epileptikus benzodiazepin merupakan lini awal.","Atropin adalah antimuskarinik untuk bradikardia/sekresi, bukan antikejang.","Magnesium adalah terapi spesifik kejang pada eklampsia, bukan pilihan umum untuk kejang akibat aminofilin.","Valproat oral bukan pilihan untuk menghentikan kejang akut karena onset oral tidak sesuai keadaan emergensi."],"komponenStatistik":"Pharmacology"},{"soal":"80. Arti Ulul Albab dalam Alquran?","opsi":["A. Orang yang berakal","B. Orang yang beriman","C. Orang yang bertakwa","D. Orang yang sabar","E. Orang mukmin"],"jawabanBenar":0,"pembahasan":"Mereka yang memikirkan dan mengambil hikmah menggunakan akalnya (orang yang berakal).","pembahasanPilihan":["Fasik berarti keluar dari ketaatan atau melakukan kefasikan; jelas bukan makna Ulul Albab.","Beriman berarti percaya kepada Allah dan ajaran-Nya; maknanya tidak sama persis dengan istilah Ulul Albab.","Bertakwa berarti menjalankan perintah dan menjauhi larangan Allah; bukan arti literal Ulul Albab.","Saleh berarti orang yang baik/taat; merupakan karakter, bukan terjemahan khusus Ulul Albab.","Ulul Albab merujuk pada orang-orang yang menggunakan akal/pikiran yang jernih dan mampu mengambil pelajaran."],"komponenStatistik":"Recall"},{"soal":"81. Pasien demam malam, nyeri kepala, riwayat TB putus obat. Kaku kuduk (+). Hasil CSS pendukung diagnosis?","opsi":["A. Ditemukan pellicle (cobweb sign)","B. Tekanan cairan normal","C. Protein normal","D. Glukosa sangat tinggi","E. Cairan sangat jernih"],"jawabanBenar":0,"pembahasan":"Meningitis TB khas memiliki bentukan jaring (pellicle/cobweb) apabila tabung cairan otak didiamkan.","pembahasanPilihan":["Pada meningitis TB, LCS dapat menunjukkan cobweb clot/pellicle setelah didiamkan karena kadar protein tinggi; juga biasanya limfositosis dan glukosa rendah.","Tekanan pembukaan dapat meningkat pada meningitis TB; jadi tidak selalu normal.","Protein LCS biasanya meningkat pada meningitis TB, bukan normal.","Glukosa LCS biasanya menurun, bukan sangat tinggi.","LCS dapat tampak jernih tetapi tetap abnormal secara biokimia; 'jernih' tidak menyingkirkan meningitis TB."],"komponenStatistik":"Diagnostics"},{"soal":"82. Massa di kanalis spinalis torakolumbal yang berada tepat di bawah duramater namun di luar medula spinalis?","opsi":["A. Ekstra dural","B. Ekstra dural ekstra medular","C. Intra dural","D. Intra dural ekstra medular","E. Intra dular intra medular"],"jawabanBenar":3,"pembahasan":"Tumor meningen punggung (seperti meningioma) secara tipikal berlokasi intradural ekstramedular.","pembahasanPilihan":["Ekstradural berarti massa berada di luar dura; berbeda dengan gambaran yang disebut dalam soal.","Ekstradural ekstramedular berarti di luar dura dan di luar medula; tidak sesuai dengan massa tepat di bawah dura.","Intradural saja belum menentukan apakah massa berada di dalam atau di luar medula.","Intradural ekstramedular berarti di bawah dura tetapi di luar medula spinalis; meningioma adalah contoh klasik.","Intradural intramedular berarti massa berada di dalam medula spinalis, bukan di luar medula."],"komponenStatistik":"Anatomy"},{"soal":"83. Efek samping opioid jangka panjang yang paling toleransinya lambat berkembang (selalu ada)?","opsi":["A. Bradikardi","B. Hipotensi","C. Defekasi","D. Konstipasi (sembelit)","E. Sedasi"],"jawabanBenar":3,"pembahasan":"Pasien pengguna opioid rutin nyaris tidak mengembangkan toleransi terhadap miosis (pupil mengecil) dan konstipasi.","pembahasanPilihan":["Bradikardia dapat terjadi pada opioid akut, tetapi toleransi terhadap beberapa efek kardiovaskular dapat berkembang.","Hipotensi dapat terjadi karena vasodilatasi, terutama pada dosis tinggi, tetapi bukan efek dengan toleransi paling lambat.","Opioid justru menyebabkan konstipasi; defekasi meningkat bukan efek khas.","Konstipasi sangat sedikit mengalami toleransi sehingga sering menetap selama penggunaan opioid kronis.","Sedasi dapat mengalami toleransi relatif terhadap waktu pada sebagian pasien."],"komponenStatistik":"Pharmacology"},{"soal":"84. Yang termasuk panel pemeriksaan KIMIA likuor serebrospinal adalah?","opsi":["A. Pemeriksaan protein albumin dan glukosa","B. Pemeriksaan hitung jenis sel","C. Pemeriksaan hitung jumlah sel total","D. Pemeriksaan warna fisik","E. Pemeriksaan kultur kuman"],"jawabanBenar":0,"pembahasan":"Uji protein dan glukosa termasuk area biokimia cairan tubuh, sedangkan sel darah masuk hematologi/sitologi.","pembahasanPilihan":["Protein dan glukosa merupakan parameter biokimia utama LCS bersama beberapa analit lain; keduanya membantu membedakan infeksi tertentu.","Hitung jenis sel termasuk analisis sitologi/hematologi LCS, bukan panel kimia.","Jumlah sel total termasuk pemeriksaan sitologi/seluler.","Warna dan kejernihan adalah pemeriksaan makroskopik/fisik.","Kultur kuman adalah pemeriksaan mikrobiologi."],"komponenStatistik":"Diagnostics"},{"soal":"85. Pada medulla spinalis, neuron multipolar (tanduk anterior) fungsinya mengirim sinyal. Apakah nama neuron ini?","opsi":["A. Sel saraf motoris","B. Sel ganglion","C. Sel purkinje","D. Sel pyramid","E. Sel saraf sensoris"],"jawabanBenar":0,"pembahasan":"Tanduk ventral (anterior horn) berisi motor neuron.","pembahasanPilihan":["Neuron motorik alfa/gamma di kornu anterior adalah neuron eferen multipolar yang menginervasi otot rangka.","Neuron sensorik primer berada di dorsal root ganglion dan bersifat pseudounipolar.","Sel Purkinje adalah neuron inhibitorik utama korteks serebelum.","Sel ganglion adalah istilah umum untuk badan sel di ganglion; bukan nama spesifik motor neuron kornu anterior.","Sel piramidal terutama ditemukan di korteks serebri dan merupakan neuron proyeksi utama jalur corticospinal."],"komponenStatistik":"Histology"},{"soal":"86. Anestesi lokal epidural dengan ditambahkan ajuvan opioid morfin akan menghasilkan efek apa?","opsi":["Memperpanjang efek analgesia epidural dan memungkinkan kebutuhan anestetik lokal lebih rendah","B. Penurunan tekanan darah cepat","C. Peningkatan suhu tubuh","D. Peningkatan GFR","E. Blokade saraf motorik total"],"jawabanBenar":0,"pembahasan":"Morfin epidural sebagai adjuvan memberikan analgesia segmental yang lebih lama melalui reseptor opioid spinal, sehingga kebutuhan anestetik lokal dapat dikurangi. Ini bukan berarti morfin memperpanjang kerja anestetik lokal di SSP.","pembahasanPilihan":["BENAR. Morfin neuraksial memperpanjang analgesia melalui reseptor opioid di medula spinalis dan dapat mengurangi kebutuhan anestetik lokal.","SALAH. Hipotensi dapat terjadi akibat blok simpatis dari anestetik lokal, tetapi bukan efek utama yang dicari dari penambahan morfin sebagai adjuvan.","SALAH. Morfin epidural tidak ditujukan untuk meningkatkan suhu tubuh; efek samping yang lebih relevan justru pruritus, mual, retensi urin, dan depresi napas terlambat.","SALAH. Tidak ada alasan fisiologis morfin epidural meningkatkan GFR; perubahan tekanan darah atau retensi urin justru dapat mengganggu fungsi ginjal secara tidak langsung.","SALAH. Morfin adalah adjuvan analgesik, bukan obat yang menyebabkan blok motorik total; blok motorik terutama ditentukan oleh anestetik lokal dan konsentrasinya."],"komponenStatistik":"Pharmacology"},{"soal":"87. Neurotransmitter di celah sinaps harus dihilangkan agar fungsi kembali normal, bagaimana mekanismenya?","opsi":["A. Di-reuptake ke vesikel presinaps (reuptake inhibitor SSRI) atau dipecah enzim","B. Diserap semua postsinaps","C. Dibiarkan","D. Diproduksi dendrit","E. Selalu berada di celah"],"jawabanBenar":0,"pembahasan":"Aktivitas sinaps diregulasi dengan membuang sisa neurotransmitter via daur ulang (reuptake) maupun pemecahan kimiawi.","pembahasanPilihan":["Neurotransmiter diakhiri melalui reuptake, degradasi enzimatik, atau difusi; mekanisme berbeda menurut neurotransmiter.","Neurotransmiter tidak semuanya diserap oleh neuron postsinaps; sebagian besar dibersihkan dari celah sinaps melalui mekanisme terminasi.","Neurotransmiter tidak dibiarkan terus berada di celah karena akan mempertahankan sinyal.","Neurotransmiter umumnya dilepas dari terminal presinaps, bukan diproduksi oleh dendrit postsinaps untuk mengakhiri sinyal.","Jika neurotransmiter menetap di celah, reseptor akan terus teraktivasi; karena itu harus ada mekanisme terminasi."],"komponenStatistik":"Physiology"},{"soal":"88. Kesadaran turun, pelihara merpati, meningitis. Tinta india ink positif sel ragi polisakarida kapsul lebar?","opsi":["A. Histoplasma capsulatumb","B. Blastomyces dermatitidis","C. Coccidiodes Immitis","D. Aspergillus Fumigatus","E. Cryptococcus neoformans"],"jawabanBenar":4,"pembahasan":"Jamur berkapsul tebal penyebab meningitis yang dihubungkan dengan paparan merpati (guano) adalah C. neoformans.","pembahasanPilihan":["Histoplasma dapat terkait paparan kotoran burung/kelelawar dan menyebabkan penyakit paru/diseminata; bukan gambaran tinta India positif.","Blastomyces adalah jamur dimorfik dengan broad-based budding dan dapat menyebabkan penyakit paru/kulit, bukan meningitis berkapsul khas.","Coccidioides membentuk spherules berisi endospora dan terutama menyebabkan infeksi paru; bukan jamur berkapsul dengan India ink.","Aspergillus memiliki hifa bersepta dengan acute-angle branching dan dapat menyebabkan penyakit invasif pada imunokompromais; bukan jamur berkapsul klasik.","Cryptococcus neoformans memiliki kapsul polisakarida tebal, dapat positif India ink, dan berkaitan dengan paparan kotoran merpati serta meningitis."],"komponenStatistik":"Diagnostics"},{"soal":"89. Perempuan 33 obesitas sangat masif, merasa tidak pernah kenyang (pusat lapar tak terhambat). Struktur yang rusak?","opsi":["A. Hypothalamus","B. Hypocampus","C. Gyrus post centralis","D. Ganglia basalis","E. Tectum"],"jawabanBenar":0,"pembahasan":"Hipotalamus menampung pusat selera/satiety (nukleus ventromedial & area hipotalamik lateral).","pembahasanPilihan":["Hipotalamus mengatur homeostasis energi; nukleus ventromedial berperan pada satiety dan area lateral pada hunger.","Hipokampus terutama untuk pembentukan memori dan navigasi spasial, bukan pusat utama rasa kenyang.","Gyrus postcentralis adalah korteks somatosensorik primer.","Ganglia basalis terutama memodulasi gerak dan pembelajaran kebiasaan, bukan pusat utama regulasi lapar.","Tectum mesensefalon berperan pada refleks visual/auditorik, bukan pusat nafsu makan."],"komponenStatistik":"Physiology"},{"soal":"90. Wanita 24 thn sayat pergelangan. Depresi mayor. Tatalaksana aman yang tepat?","opsi":["A. Propanolol","B. Trihexilperidyl","C. Diazepam","D. Zolpidem","E. Antidepresan SSRI (Sertraline/Escitalopram)"],"jawabanBenar":4,"pembahasan":"SSRI memiliki batas rasio terapeutik paling aman dan efektif sebagai lini pertama depresi dan pencegah bunuh diri.","pembahasanPilihan":["Propranolol dapat mengurangi gejala adrenergik tertentu tetapi bukan terapi inti episode depresi mayor dengan risiko bunuh diri.","Trihexyphenidyl adalah antikolinergik untuk gejala Parkinson dan dapat memperburuk fungsi kognitif; bukan terapi depresi.","Diazepam bukan terapi utama depresi mayor dan berisiko sedasi serta ketergantungan.","Zolpidem ditujukan untuk insomnia dan tidak mengobati gangguan depresi mayor.","SSRI seperti sertraline/escitalopram adalah lini pertama depresi mayor; pada suicidal behavior perlu safety planning, monitoring ketat, dan evaluasi psikiatri."],"komponenStatistik":"Pharmacology"},{"soal":"91. Tangan tungkai kanan tidak bergerak. CT Scan: ada lesi hipodens (gelap) di thalamus sinistra. Mengapa?","opsi":["A. Infark (Iskemik serebri)","B. Tumor intra cerebral","C. Stroke hemoragik","D. Perdarahan subdural","E. Meningitis"],"jawabanBenar":0,"pembahasan":"Bentukan lesi hipodens (menghitam) menandai infark atau kurangnya perfusi darah (stroke non-hemoragik).","pembahasanPilihan":["Lesi hipodens pada CT dalam konteks defisit fokal paling sesuai dengan infark iskemik; lesi thalamus kiri dapat menyebabkan gangguan motorik/sensorik kontralateral.","Tumor dapat tampak hipodens, tetapi biasanya merupakan proses massa/subakut dan tidak langsung menjelaskan gambaran stroke akut.","Perdarahan akut biasanya hiperdens pada CT, sehingga kurang sesuai dengan lesi hipodens.","Subdural hematoma biasanya berupa koleksi crescent sepanjang permukaan hemisfer, bukan fokus di thalamus.","Meningitis dapat menyebabkan komplikasi neurologis tetapi bukan diagnosis utama dari lesi hipodens thalamus pada kasus ini."],"komponenStatistik":"Anatomy"},{"soal":"92. Sering meringkuk tengah malam, ketakutan derap kaki, flashback 6 bulan lalu hampir diperkosa. Diagnosis?","opsi":["A. Reaksi stress akut","B. Gangguan stress pasca trauma (PTSD)","C. Fobia social","D. Agorafobia","E. Depresi mayor"],"jawabanBenar":1,"pembahasan":"Trauma mengancam eksistensi tubuh diikuti kilas balik yang menetap lebih dari sebulan.","pembahasanPilihan":["Serangan panik adalah episode mendadak berupa takut intens dengan gejala otonom; pada kasus ini ada konteks trauma dan gejala PTSD.","PTSD dapat muncul setelah trauma seksual dengan re-experiencing/flashback, avoidance, hyperarousal, dan respons takut.","Fobia spesifik adalah takut terhadap objek/situasi tertentu; kasus lebih sesuai dengan respons trauma kompleks.","Gangguan cemas menyeluruh ditandai kekhawatiran berlebihan menetap terhadap banyak hal, bukan terutama terikat trauma.","Depresi dominan dengan mood rendah/anhedonia dan gejala neurovegetatif; riwayat trauma saja tidak cukup."],"komponenStatistik":"Diagnostics"},{"soal":"93. Kejang tetanus (trismus) dari paku kotor. Yang TIDAK TEPAT dari tatalaksana di bawah ini?","opsi":["A. Penisilin G dan metronidazol","B. Debridement dan penjahitan ulang rapat-rapat","C. Pemberian antikejang diazepam","D. Pemberian HTIG 500 IU","E. Observasi ruang redup"],"jawabanBenar":1,"pembahasan":"Luka gigitan kotor, tusuk paku berkarat, tidak boleh dijahit rapat primer untuk mencegah bakteri anaerob berkembang.","pembahasanPilihan":["Metronidazol adalah pilihan antimikroba yang baik; penisilin G juga secara historis digunakan.","Luka tetanus harus dibersihkan dan didebridement; luka tusuk kotor tidak dianjurkan dijahit rapat primer karena menjebak kondisi anaerob.","Diazepam/benzodiazepin membantu mengontrol spasme dan kekakuan.","HTIG menetralkan toksin yang masih bebas; dosis mengikuti pedoman lokal, sehingga angka dosis harus disesuaikan protokol.","Pasien tetanus berat memerlukan monitoring intensif karena spasme dapat mengganggu napas dan otonom."],"komponenStatistik":"Pharmacology"},{"soal":"94. Penjaga kantin mengeluarkan kemaluannya terutama ke siswi. Diagnosis paraphilia?","opsi":["A. Voyeurisme","B. Transvestisme","C. Fethisme","D. Pedofilia","E. Eksibionisme"],"jawabanBenar":4,"pembahasan":"Dorongan paksaan menampilkan alat kelamin ke publik (ekshibisionisme).","pembahasanPilihan":["Voyeurisme adalah memperoleh rangsangan dengan mengintip orang lain tanpa sepengetahuan mereka, terutama saat telanjang atau aktivitas seksual.","Transvestic disorder berkaitan dengan rangsangan seksual dari cross-dressing, bukan mempertontonkan genital kepada orang lain.","Fetishistic disorder melibatkan objek mati atau bagian tubuh tertentu sebagai fokus rangsangan seksual.","Pedofilia adalah ketertarikan seksual persisten terhadap anak prepubertas; tidak identik dengan tindakan memamerkan genital.","Exhibitionistic disorder adalah mempertontonkan genital kepada orang yang tidak mengharapkannya; pola soal paling sesuai."],"komponenStatistik":"Diagnostics"},{"soal":"95. Seseorang gangguan sulit tidur murni (insomnia primer) 5 bulan. Tatalaksana pereda singkat?","opsi":["A. Sertralin","B. Carbamazepin","C. Asam valproa","D. Etosuksimide","E. Diazepam / Gol. Sedatif Hipnotik"],"jawabanBenar":4,"pembahasan":"Obat golongan sedatif hipnotik (benzodiazepine like drug) dapat merangsang induksi kantuk.","pembahasanPilihan":["Sertraline adalah antidepresan SSRI dan bukan hipnotik untuk pereda insomnia jangka pendek.","Carbamazepine adalah antikejang/stabilisator mood, bukan obat utama insomnia.","Asam valproat adalah antikejang/stabilisator mood, bukan hipnotik.","Etosuksimid adalah terapi absence seizure, bukan terapi insomnia.","Benzodiazepin seperti diazepam dapat mempercepat tidur dalam jangka pendek, tetapi berisiko toleransi, ketergantungan, dan gangguan kognitif; untuk insomnia kronis CBT-I lebih diutamakan."],"catatanKlinis":"⚠️ Catatan: CBT-I adalah terapi lini pertama insomnia kronis. Benzodiazepin bukan pilihan ideal untuk penggunaan rutin; pada opsi arsip, golongan sedatif-hipnotik adalah jawaban yang dimaksud untuk pereda singkat.","komponenStatistik":"Pharmacology"},{"soal":"96. Mikroskopis bentuk jamur polisakarida kapsul, vektor kotoran merpati, pasien demam kejang (meningitis). Patogen?","opsi":["A. Histoplasma capsulatum","B. Blastomyces dermatitidis","C. Coccidiodes Immitis","D. Aspergillus Fumigatus","E. Cryptococcus neoformans"],"jawabanBenar":4,"pembahasan":"Vektor merpati + jamur berkapsul (tinta india) khas = C. neoformans.","pembahasanPilihan":["Histoplasma dapat terkait paparan kotoran burung/kelelawar dan menyebabkan penyakit paru/diseminata; bukan gambaran tinta India positif.","Blastomyces adalah jamur dimorfik dengan broad-based budding dan dapat menyebabkan penyakit paru/kulit, bukan meningitis berkapsul khas.","Coccidioides membentuk spherules berisi endospora dan terutama menyebabkan infeksi paru; bukan jamur berkapsul dengan India ink.","Aspergillus memiliki hifa bersepta dengan acute-angle branching dan dapat menyebabkan penyakit invasif pada imunokompromais; bukan jamur berkapsul klasik.","Cryptococcus neoformans memiliki kapsul polisakarida tebal, dapat positif India ink, dan berkaitan dengan paparan kotoran merpati serta meningitis."],"komponenStatistik":"Diagnostics"},{"soal":"97. Analgesik opioid campuran pentazocin dipilih karena toleransi respirasi baik, apa kekurangan obat ini dibandingkan morfin?","opsi":["A. Lebih mudah timbul depresi nafas pada agonis murni","B. Lebih cepat timbulnya gejala putus obat (withdrawal precipitator)","C. Tidak digunakan pada asma","D. Dosis terapi lebih besar","E. Menyebabkan retensi urin"],"jawabanBenar":1,"pembahasan":"Agonis-antagonis parsial dapat memicu gejala withdrawal drastis jika digunakan bersamaan dengan opioid murni.","pembahasanPilihan":["Pentazocine adalah agonis-antagonis opioid; depresi napas cenderung memiliki ceiling effect dibanding agonis μ murni.","Gejala withdrawal dapat dipicu pada pasien yang sudah bergantung pada agonis μ karena efek antagonis parsial pentazocine.","Pentazocine tetap dapat menyebabkan depresi napas dan bukan otomatis kontraindikasi hanya karena pasien asma.","Pentazocine umumnya memiliki potensi analgesik lebih rendah daripada morfin; tetapi 'dosis terapi lebih besar' bukan kekurangan utama yang ditanyakan.","Retensi urin memang dapat terjadi pada opioid, termasuk pentazocine, sehingga bukan kekurangan khas dibanding morfin."],"komponenStatistik":"Pharmacology"},{"soal":"98. Penyakit Parkinson, gerak otot tertahan dan tak terkontrol. Neurotransmitter gerakan ekstrapiramidal apa yang turun?","opsi":["A. Histamin","B. Dopamin","C. GABA","D. Serotonin","E. Glisin"],"jawabanBenar":1,"pembahasan":"Neurotransmiter dopamin dari pars kompakta nigra ke striatum melemah.","pembahasanPilihan":["Histamin berperan pada alergi, inflamasi, dan regulasi tidur, bukan defisit utama Parkinson.","Dopamin nigrostriatal dari substantia nigra pars compacta menurun pada Parkinson sehingga aktivitas jalur motorik basal ganglia terganggu.","GABA penting dalam sirkuit basal ganglia, tetapi bukan neurotransmiter yang terutama mengalami defisit pada Parkinson.","Serotonin berperan pada mood dan fungsi otonom, bukan neurotransmiter utama yang turun pada Parkinson.","Glisin adalah inhibitorik utama di medula spinalis/batang otak, bukan neurotransmiter nigrostriatal utama."],"komponenStatistik":"Physiology"},{"soal":"99. Stroke yang menjepit area gyrus frontalis inferior (area Broca). Area fungsional ini berada di lobus mana?","opsi":["A. Lobus Occipitalis","B. Lobus Frontalis","C. Lobus Parietalis","D. Lobus Limbicus","E. Lobus Temporalis"],"jawabanBenar":1,"pembahasan":"Area Broca untuk memproduksi gerakan wicara terletak di Lobus Frontal.","pembahasanPilihan":["Lobus oksipital terutama memproses penglihatan.","Area Broca berada pada gyrus frontalis inferior hemisfer dominan, sehingga termasuk lobus frontalis.","Lobus parietalis terutama berperan pada sensasi somatik dan integrasi spasial.","Lobus limbik mencakup jaringan yang terkait emosi dan memori; bukan lokasi utama Broca.","Lobus temporalis penting untuk pendengaran dan pemahaman bahasa, terutama area Wernicke."],"komponenStatistik":"Anatomy"},{"soal":"100. Pemeriksaan panel biokimia Cairan LCS","opsi":["A. Pemeriksaan Warna fisik","B. Pemeriksaan hitung jenis leukosit","C. Pemeriksaan jumlah sel (sitologi)","D. Pemeriksaan protein albumin dan glukosa","E. Pemeriksaan kultur kuman"],"jawabanBenar":3,"pembahasan":"Biokimia (Kimia Klinik) standar cairan otak digunakan untuk mengecek rasio Glukosa dan Total Protein/Albumin.","pembahasanPilihan":["Warna dan kejernihan adalah pemeriksaan makroskopik/fisik.","Hitung jenis sel termasuk analisis sitologi/hematologi LCS, bukan panel kimia.","Jumlah sel total termasuk pemeriksaan sitologi/seluler.","Protein dan glukosa merupakan parameter biokimia utama LCS bersama beberapa analit lain; keduanya membantu membedakan infeksi tertentu.","Kultur kuman adalah pemeriksaan mikrobiologi."],"komponenStatistik":"Diagnostics"}];const $=id=>document.getElementById(id);const APP_VERSION="v35.0-bank-engine";const KEY={theme:"gaster_v8_theme",book:"gaster_v8_bookmarks",hist:"gaster_v8_history",session:"gaster_v8_quiz_session",sound:"gaster_v8_sound",wrong:"gaster_v8_wrong_stats",goal:"gaster_v9_daily_goal",qstats:"gaster_v22_question_performance",abilityMap:"gaster_v22_question_ability_map",xp:"gaster_v11_xp",navVisible:"medical_rpg_nav_visible_v21",navPos:"medicalRpgNavPos_v21",dailyStreak:"gaster_daily_streak_v1"};let selectedCount=20,selectedBank="utama",quiz=[],pos=0,score=0,answered=false;let soundEnabled=true;let selectedAnswer=null,streak=0,sessionStart=0,timerSeconds=0,timerDuration=0,timerDeadline=0,timerId=null;let quizMode="study",flagged=new Set();let sessionXP=0,lastXPGain=0;let playerHP=100,wrongCombo=0,enemyHP=100;const get=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}};const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){console.warn("CLINED storage write failed",e);return false}};const del=k=>{try{localStorage.removeItem(k)}catch{}};function showToast(message,isError){let t=document.getElementById('clinedToast');if(!t){t=document.createElement('div');t.id='clinedToast';t.className='clined-toast';document.body.appendChild(t);}t.textContent=message;t.classList.toggle('is-error',!!isError);t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),isError?3600:1800);}const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const letter=i=>String.fromCharCode(65+i);
const qid=(bank,i,q)=>q.id || `${bank}-${q.no||i+1}`;
// RPG progression: 100 levels, 100 XP per level.
function xpLevel(xp){
  return Math.min(100, Math.floor(Math.max(0, Number(xp)||0) / 100) + 1);
}
function xpInfo(xp){
  const total=Math.max(0, Number(xp)||0);
  const level=xpLevel(total);
  if(level>=100) return {level,current:100,need:100,next:10000,total};
  const current=total % 100;
  return {level,current,need:100,next:level*100,total};
}
function xpTitle(level){
  if(level>=90) return "Clinical Master";
  if(level>=75) return "Konsulen";
  if(level>=60) return "Dokter Spesialis";
  if(level>=45) return "Dokter";
  if(level>=30) return "Dokter Muda";
  if(level>=20) return "Koas Senior";
  if(level>=10) return "Koas";
  if(level>=5) return "Mahasiswa Klinik";
  return "Mahasiswa Pre-Klinik";
}
function addXP(amount,reason=""){
  const before=Number(get(KEY.xp,0))||0;
  const gained=Math.max(0,Math.round(amount));
  const after=before+gained;
  set(KEY.xp,after);
  lastXPGain=gained;sessionXP+=gained;
  renderXP();
  showXPPopup(gained,reason, xpLevel(after)>xpLevel(before));
  return {before,after,gained,leveledUp:xpLevel(after)>xpLevel(before)};
}
function renderXP(){
  const info=xpInfo(Number(get(KEY.xp,0))||0);
  const pct=Math.min(100,Math.round(info.current/info.need*100));
  if($("levelBadge"))$("levelBadge").textContent=`Lv. ${info.level}`;
  if($("xpTitle"))$("xpTitle").textContent=xpTitle(info.level);
  if($("xpTotal"))$("xpTotal").textContent=`${info.total} XP`;
  setProgress($("xpBar"),pct);
  if($("xpProgressText"))$("xpProgressText").textContent=`${info.current} / ${info.need} XP`;
  if($("xpNextText"))$("xpNextText").textContent=info.level>=100?"MAX LEVEL":`${info.need-info.current} XP ke Level ${info.level+1}`;
  if($("xpLive"))$("xpLive").textContent=`⚡ ${info.total} XP`;
  if($("playerBadges")){
    const badges=[];
    if(info.level>=2)badges.push("🔥Pejuang");
    if(info.level>=4)badges.push("🎯Konsisten");
    if(info.level>=6)badges.push("🧠Tajam");
    if(info.level>=10)badges.push("🏆Master");
    $("playerBadges").innerHTML=badges.map(x=>`<span>${x}</span>`).join("");
  }
}
function showXPPopup(gained,reason,levelUp=false){
  if(!gained)return;
  const layer=document.createElement("div");layer.className="xp-popup-layer";
  layer.innerHTML=`<div class="xp-popup ${levelUp?"level-up":""}"><b>+${gained} XP</b><span>${levelUp?"🎉LEVEL UP!":esc(reason||"Progress bertambah")}</span></div>`;
  document.body.appendChild(layer);
  requestAnimationFrame(()=>layer.classList.add("show"));
  setTimeout(()=>layer.remove(),1200);
  if(levelUp){vibrate([30,45,30,45,60]);beep("level");}
}
const BANKS={
  utama:{name:"SSP GASTER 2023",data:dataKuis},
  pulmonis:{name:"SSP PULMONIS 2022",data:dataKuisPulmonis},
  arsip2021:{name:"SSP 2021",data:dataKuis2021},
  kedkel2022:{name:"KEDKEL Juni 2022",data:dataKuisKedkel2022,block:"KEDKEL"},
  kedkel2021:{name:"KEDKEL 2021",data:dataKuisKedkel2021,block:"KEDKEL"},
  kedkel2020:{name:"KEDKEL 2020",data:dataKuisKedkel2020,block:"KEDKEL"}
};
let __spaHistoryLock=false;
let __spaCurrentView="home";
let __spaNavFrame=0;
let __spaLastNavigationAt=0;
function show(id, options={}){
  const target=$(id); if(!target)return;
  if(!options.allowGuest && typeof authCurrentUser==='function' && !authCurrentUser()){
    window.CLINED_AUTH_GATE?.lock?.();
    authOpenModal?.('login');
    return;
  }
  if(__spaNavFrame) cancelAnimationFrame(__spaNavFrame);
  const previous=__spaCurrentView;
  if(previous===id && !options.force){
    window.scrollTo({top:0,behavior:'auto'});
    return;
  }
  __spaCurrentView=id;
  document.querySelectorAll(".view.active").forEach(v=>v.classList.remove("active"));
  target.classList.add("active");
  document.querySelectorAll(".view.motion-page-enter").forEach(v=>v.classList.remove("motion-page-enter"));
  document.body.classList.toggle("quiz-context", id === "quiz");
  document.body.classList.toggle("home-context", id === "home");

  if(!options.fromHistory && !__spaHistoryLock){
    try{
      const state={clinedView:id};
      if(location.hash!=="#"+id) history.pushState(state,"", "#"+id);
    }catch{}
  }

  if(id==="home") renderHomeClinicalDashboard();
  if(id==="blokSspPage"){setCurrentBlockId("SSP"); if(blockForBank(selectedBank)!=='SSP'){const sspIds=Object.keys(BANKS).filter(bid=>blockForBank(bid)==='SSP');if(sspIds.length)selectedBank=sspIds[0];} try{renderBanks();renderCounts();renderModes();}catch(e){console.error("SSP render error",e);}}
  if(id==="blokKedkomPage"){setCurrentBlockId("KEDKOM"); renderEmptyBlockControls("kedkom");}
  if(id==="blokKedkelPage"){setCurrentBlockId("KEDKEL"); renderAvailableBlockControls("kedkel");}
  if(id==="blokMulsisPage"){setCurrentBlockId("MULSIS"); renderEmptyBlockControls("mulsis");}

  const navKey=id==="clinicalDashboard"?"dashboard":id==="accountPage"?"account":id==="home"?"home":null;
  if(navKey && typeof window.setFloatingNavActive==='function') window.setFloatingNavActive(navKey);

  // Stable navigation: transform-only on normal pages. Dashboard gets a tiny,
  // bounded blur trail; opacity is never animated, preventing WebView flicker.
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!reduced && previous!==id){
    requestAnimationFrame(()=>target.classList.add("motion-page-enter"));
  }
  document.querySelectorAll(".view.motion-enter").forEach(v=>v.classList.remove("motion-enter"));
  document.querySelectorAll(".dashboard-motion").forEach(v=>v.classList.remove("dashboard-motion"));
  const dashboardPanel=document.getElementById("homeClinicalDashboard");
  if(!reduced && previous!==id){
    if(id==="clinicalDashboard") target.classList.add("motion-enter");
    if(id==="home" && dashboardPanel && !dashboardPanel.hidden) dashboardPanel.classList.add("dashboard-motion");
    __spaNavFrame=requestAnimationFrame(()=>{
      const delay=id==="clinicalDashboard"?360:300;
      window.setTimeout(()=>{
        target.classList.remove("motion-enter");
        dashboardPanel?.classList.remove("dashboard-motion");
      },delay);
    });
  }
  window.scrollTo({top:0,behavior:'auto'});
  __spaLastNavigationAt=performance.now();
}
function initSPAHistory(){
  try{
    const initial=(location.hash||"#home").slice(1);
    const valid=document.getElementById(initial);
    history.replaceState({clinedView:valid?initial:"home"},"",valid?"#"+initial:"#home");
    window.addEventListener("popstate",e=>{
      const id=e.state?.clinedView || (location.hash||"#home").slice(1) || "home";
      if(document.getElementById(id)) show(id,{fromHistory:true,instant:true});
    });
  }catch{}
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function vibrate(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern)}catch{}}

// Keep the Duolingo-inspired HUD synchronized with the existing progress state.
// This is additive: it never replaces or mutates the existing storage model.
(function initMotionHud(){
  function sync(){
    try{
      const xpEl=document.getElementById("xpTotal");
      const streakEl=document.getElementById("duoStreakValue");
      const dailyEl=document.getElementById("dailyStreakCount");
      const hudXp=document.getElementById("duoHudXp");
      const hudStreak=document.getElementById("duoHudStreak");
      const hudGoal=document.getElementById("duoHudGoal");
      if(hudXp && xpEl) hudXp.textContent=(xpEl.textContent||"0").replace(/\\s*XP/i,"");
      if(hudStreak && streakEl) hudStreak.textContent=streakEl.textContent||"0";
      if(hudGoal && dailyEl) hudGoal.textContent=dailyEl.textContent||"0/5";
    }catch(e){}
  }
  document.addEventListener("click",()=>requestAnimationFrame(sync),{passive:true});
  window.addEventListener("load",()=>{sync();setTimeout(sync,500);setTimeout(sync,1500)});
  window.clinedSyncMotionHud=sync;
})();

/* Transform-driven progress updates avoid layout work during gameplay. */
function setProgress(element, percent){
  if(!element)return;
  const value=Math.max(0,Math.min(100,Number(percent)||0));
  element.style.setProperty('--motion-progress',String(value/100));
  element.setAttribute('aria-valuenow',String(Math.round(value)));
}

// Tiny tactile motion on important controls; never interferes with click handling.
document.addEventListener("pointerdown",(e)=>{
  const el=e.target.closest("button,.answer,.choice,.exam-launch-card,.block-card,.menu-item,.feedback-card,.materi-button");
  if(!el || el.disabled) return;
  el.classList.add("motion-pressed");
  window.setTimeout(()=>el.classList.remove("motion-pressed"),180);
},{passive:true});

function beep(type="correct"){
  if(!soundEnabled)return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    const now=ctx.currentTime;
    if(type==="correct"){
      o.frequency.setValueAtTime(520,now);o.frequency.exponentialRampToValueAtTime(760,now+.11);
    }else if(type==="level"){
      o.frequency.setValueAtTime(520,now);o.frequency.exponentialRampToValueAtTime(1040,now+.18);
    }else{
      o.frequency.setValueAtTime(220,now);o.frequency.exponentialRampToValueAtTime(140,now+.14);
    }
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.055,now+.012);
    g.gain.exponentialRampToValueAtTime(.0001,now+.17);
    o.start(now);o.stop(now+.18);
  }catch{}
}

function combatFx(type,damageInfo=null){
  const card=document.querySelector("#quiz.quiz-card");
  if(!card)return;
  const lowMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || Number(navigator.hardwareConcurrency||8)<=4 || Number(navigator.deviceMemory||8)<=4;
  const rect=card.getBoundingClientRect();
  const layer=document.createElement("div");
  layer.className=`combat-fx ${type}`;
  // Put the effect on top of the whole card so it is always visible,
  // even when the quiz content is scrolled or another element has a z-index.
  Object.assign(layer.style,{position:"fixed",left:rect.left+"px",top:rect.top+"px",width:rect.width+"px",height:rect.height+"px",zIndex:"99999",pointerEvents:"none",overflow:"hidden",borderRadius:getComputedStyle(card).borderRadius||"18px"});
  if(type==="hit"){
    layer.innerHTML=`
      <div class="battle-whiteout"></div>
      <div class="battle-impact"><span></span></div>
      <div class="battle-slash s1"></div><div class="battle-slash s2"></div><div class="battle-slash s3"></div>
      <div class="battle-label">🩺 CLINICAL STRIKE!</div><div class="battle-sub">DIAGNOSTIC IMPACT</div>`;
    for(let i=0;i<(lowMotion?12:24);i++){
      const p=document.createElement("i");p.className="battle-particle";
      p.style.setProperty("--a",(Math.random()*360)+"deg");
      p.style.setProperty("--d",(70+Math.random()*170)+"px");
      p.style.setProperty("--s",(.45+Math.random()*1.25).toFixed(2));
      p.style.setProperty("--delay",(Math.random()*.16).toFixed(2)+"s");
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    requestAnimationFrame(()=>layer.classList.add("show"));
    vibrate([18,25,45,15,70]); beep("correct");
    setTimeout(()=>layer.remove(),1050);
  }else{
    layer.innerHTML=`
      <div class="battle-redout"></div>
      <div class="battle-damage-ring"></div>
      <div class="battle-crack c1"></div><div class="battle-crack c2"></div><div class="battle-crack c3"></div>
      <div class="battle-label damage">🚨 CLINICAL ERROR!</div><div class="battle-sub damage-sub">-${damageInfo?.damage||1} VITALITY • ERROR COMBO ${damageInfo?.combo||1}x</div>`;
    for(let i=0;i<(lowMotion?8:12);i++){
      const p=document.createElement("i");p.className="damage-particle";
      p.style.setProperty("--a",(Math.random()*360)+"deg");
      p.style.setProperty("--d",(35+Math.random()*100)+"px");
      p.style.setProperty("--delay",(Math.random()*.1).toFixed(2)+"s");
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    requestAnimationFrame(()=>layer.classList.add("show"));
    card.classList.remove("damage-shake");
    requestAnimationFrame(()=>card.classList.add("damage-shake"));
    vibrate([70,35,100]); beep("wrong");
    setTimeout(()=>{layer.remove();card.classList.remove("damage-shake")},900);
  }
}
function answerReward(button){
  if(!button||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||window.innerWidth<700)return;
  const colors=['#34c759','#67e8f9','#facc15','#a7f3d0','#ffffff'];
  for(let n=0;n<18;n++){
    const particle=document.createElement('i');particle.className='clined-reward-particle';
    const angle=Math.random()*Math.PI*2,distance=45+Math.random()*100;
    particle.style.setProperty('--x',`${Math.cos(angle)*distance}px`);particle.style.setProperty('--y',`${Math.sin(angle)*distance}px`);
    particle.style.setProperty('--r',`${Math.round(Math.random()*540-270)}deg`);particle.style.setProperty('--particle-color',colors[n%colors.length]);
    button.appendChild(particle);setTimeout(()=>particle.remove(),850);
  }
}
function celebrate(){
  const lowMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || Number(navigator.hardwareConcurrency||8)<=4 || Number(navigator.deviceMemory||8)<=4;
  combatFx("hit");
  const layer=document.createElement("div");layer.className="pop-celebration";
  layer.innerHTML=`<div class="pop-burst"><span>✓</span></div><div class="pop-text">Benar!</div>`;
  document.body.appendChild(layer);
  for(let i=0;i<(lowMotion?8:14);i++){
    const p=document.createElement("i");p.className="confetti";
    p.style.setProperty("--x",(Math.random()*180-90)+"px");
    p.style.setProperty("--r",(Math.random()*540-270)+"deg");
    p.style.setProperty("--d",(.25+Math.random()*.3)+"s");
    layer.appendChild(p);
  }
  requestAnimationFrame(()=>layer.classList.add("show"));
  setTimeout(()=>layer.remove(),900);
  vibrate([18,35,18]);beep("correct");
}
function wrongFx(){
  $("quiz")?.classList.add("shake");
  setTimeout(()=>$("quiz")?.classList.remove("shake"),430);
  vibrate(28);beep("wrong");
}

function initTheme(){
  if(get(KEY.theme,"light")==="dark")document.documentElement.classList.add("dark");
  soundEnabled=get(KEY.sound,true);updateThemeIcon();updateSoundIcon();
}
function updateThemeIcon(){
  const d=document.documentElement.classList.contains("dark");
  $("themeBtn").textContent=d?"☀︎":"☾";
}
function updateSoundIcon(){
  if($("soundBtn"))$("soundBtn").textContent=soundEnabled?"🔊":"🔇";
}
$("themeBtn").onclick=()=>{
  document.documentElement.classList.toggle("dark");
  set(KEY.theme,document.documentElement.classList.contains("dark")?"dark":"light");
  updateThemeIcon();
};
if($("soundBtn"))$("soundBtn").onclick=()=>{
  soundEnabled=!soundEnabled;set(KEY.sound,soundEnabled);updateSoundIcon();
};

function currentBank(){
  return BANKS[selectedBank].data;
}
function bankName(){return BANKS[selectedBank].name}

/* =========================================================
   Automatic competency analysis
   Every question in every bank is classified locally from
   its stem, options, explanation and clinical note.
   ========================================================= */
const ABILITIES=["Physiology","Anatomy","Diagnostics","Histology","Pharmacology","Recall"];
const ABILITY_RULES={
  Physiology:[
    [/\bhomeostasis|fisiologi|mekanisme fisiolog|fungsi normal|regulasi|feedback negatif|feedback positif\b/gi,5],
    [/\bpotensial aksi|depolarisasi|repolarisasi|kontraksi|curah jantung|preload|afterload|ventilasi|perfusi|filtrasi|reabsorpsi|sekresi|osmolaritas\b/gi,4],
    [/\bhormon|endokrin|ovulasi|menstruasi|metabolisme|enzim|asam basa|elektrolit|konduksi jantung|ekg\b/gi,3],
    [/\btekanan darah|denyut jantung|frekuensi napas|saturasi|gfr\b/gi,2]
  ],
  Anatomy:[
    [/\banatomi|struktur|lokasi|letak|hubungan anatomi|topografi|lapisan|kompartemen\b/gi,5],
    [/\botot|tulang|sendi|saraf|arteri|vena|vaskularisasi|innervasi|ligamen|tendon|foramen|kanalis|nervus\b/gi,4],
    [/\borgan|lobus|korteks|medula|papila|pelvis renalis|atrium|ventrikel|bronkus|alveolus|hepar|gaster|usus\b/gi,2]
  ],
  Diagnostics:[
    [/\bdiagnosis|diagnostik|diagnosa|diagnosis banding|ddx|pemeriksaan penunjang|interpretasi|temuan klinis\b/gi,5],
    [/\blaboratorium|lab\b|darah lengkap|hemoglobin|hematokrit|leukosit|trombosit|ferritin|tibc|kreatinin|ureum|urinalisis|bilirubin|transaminase|glukosa\b/gi,4],
    [/\bekg|ekokardiografi|rontgen|x-?ray|ct scan|mri|usg|spirometri|kultur|biopsi|serologi|coombs|retikulosit|apusan darah\b/gi,4],
    [/\bgejala|tanda|anamnesis|pemeriksaan fisik|kasus|pasien|keluhan utama|tatalaksana\b/gi,2]
  ],
  Histology:[
    [/\bhistologi|histopatologi|mikroskop|mikroskopis|jaringan|epitel|epithelium|stroma|parenkim|lamina propria\b/gi,6],
    [/\bsel|inti sel|sitoplasma|organel|fibroblas|makrofag|limfosit|neutrofil|osteosit|kondrosit|adiposit|hepatosit|glomerulus\b/gi,4],
    [/\bpewarnaan|h&e|hematoksilin|eosin|imunohistokimia|basofilik|eosinofilik|folikel|kriptus\b/gi,4]
  ],
  Pharmacology:[
    [/\bfarmakologi|farmakodinamik|farmakokinetik|obat|medikasi|antibiotik|antimikroba|analgesik|antihipertensi|antikoagulan|antiplatelet\b/gi,5],
    [/\bdosis|dosis terapi|mekanisme kerja|reseptor|agonis|antagonis|efek samping|kontraindikasi|interaksi obat|toksisitas|metabolisme obat|clearance|half[- ]life\b/gi,5],
    [/\bpenisilin|amoksisilin|metronidazol|ceftri|cipro|warfarin|heparin|aspirin|parasetamol|ibuprofen|insulin|steroid|beta blocker|ace inhibitor|statin\b/gi,4]
  ],
  Recall:[
    [/\bdefinisi|istilah|disebut|dikenal sebagai|nama|manakah yang merupakan|apa yang dimaksud|komponen utama|faktor|golongan\b/gi,2],
    [/\bberapa|berapa persen|berapa hari|berapa jam|nilai normal|normal\b/gi,2],
    [/\bmanakah|yang paling tepat|yang benar|yang paling sesuai|kecuali|tidak benar|tidak tepat|bukan\b/gi,1]
  ]
};

function questionAbilityProfile(q){
  // Setiap soal sudah diaudit dan diberi satu komponen utama di bank.
  // Metadata eksplisit diprioritaskan agar statistik tidak berubah hanya karena
  // kata tertentu muncul di opsi/pembahasan.
  const explicit=String(q?.komponenStatistik||"").trim();
  if(ABILITIES.includes(explicit)){
    return {primary:explicit,weights:{[explicit]:1},scores:{[explicit]:1}};
  }

  // Fallback untuk soal lama/eksternal yang belum memiliki metadata.
  // Analisis terutama memakai stem, bukan seluruh opsi, agar opsi pengecoh
  // dari domain lain tidak menggeser komponen soal.
  const stem=String(q?.soal||"").toLowerCase();
  const scores=Object.fromEntries(ABILITIES.map(a=>[a,0]));

  const score=(ability,patterns,weight=1)=>{
    patterns.forEach(rx=>{if(rx.test(stem))scores[ability]+=weight;});
  };
  score("Pharmacology",[
    /\bobat\b|\bmedikasi\b|\bdosis\b|\bterapi farmako\b|\bfarmakologi\b|\banestesi\b|\banalgesik\b|\bantibiotik\b|\bantikejang\b|\bantikonvulsan\b|\bantidepresan\b|\bantipsikotik\b|\bopioid\b|\bantitoksin\b|\bvasokonstriktor\b|\bpelumpuh otot\b|\bmekanisme kerja obat\b|\befek samping obat\b|\bkontraindikasi\b/
  ],5);
  score("Histology",[
    /\bhistologi\b|\bhistopatologi\b|\bmikroskop\b|\bmikroskopis\b|\bmikrotom\b|\bpewarnaan\b|\bsel\b.*\bbermorfologi\b|\btipe sel\b|\bjaringan\b|\bepitel\b|\bstroma\b|\bparenkim\b|\bmyelin\b.*\bselubung/
  ],5);
  score("Anatomy",[
    /\banatomi\b|\bstruktur\b|\blokasi\b|\bletak\b|\bnervus\b|\bsyaraf\b|\bsaraf\b|\barteri\b|\bvena\b|\bvaskularisasi\b|\binnervasi\b|\blobus\b|\bgyrus\b|\bhipokampus\b|\bthalamus\b|\bcerebellum\b|\bmedulla spinalis\b|\bkornu anterior\b|\bforamen\b|\bkanalis\b|\blapisan\b|\bkorteks\b|\bventrikel\b|\bmeningen\b|\borgan\b|\barea broca\b/
  ],4);
  score("Diagnostics",[
    /\bdiagnosis\b|\bdiagnostik\b|\bdiagnosa\b|\bpemeriksaan\b|\bpemeriksaan penunjang\b|\bct scan\b|\bmri\b|\bx-ray\b|\blab(?:oratorium)?\b|\bhasil\b.*\bscan\b|\bgejala\b|\bkeluhan\b|\bpasien\b|\bkasus\b|\btatalaksana\b|\bmenentukan\b|\bskor\b|\bgcs\b/
  ],3);
  score("Physiology",[
    /\bfisiologi\b|\bmekanisme\b|\bfungsi\b|\bregulasi\b|\bhomeostasis\b|\bneurotransmitter\b|\bpotensial membran\b|\bpotensial aksi\b|\bdepolarisasi\b|\brepolarisasi\b|\brefleks\b|\bventilasi\b|\bperfusi\b|\btekanan\b|\bsekresi\b|\bfeedback\b|\bkonduksi\b|\bmelatonin\b|\bparasimpatis\b|\bsimpatis\b/
  ],4);
  score("Recall",[
    /^\s*\d*\.?\s*(apa|apakah|intinya)\b|\bdisebut\b|\bistilah\b|\barti\b|\bnama\b|\bmanakah\b|\byang dimaksud\b|\bmerujuk kepada\b|\bdefinisi\b/
  ],2);

  const sorted=ABILITIES.slice().sort((a,b)=>scores[b]-scores[a]);
  const top=sorted[0],topScore=scores[top];
  if(topScore<=0)return {primary:"Recall",weights:{Recall:1},scores};
  return {primary:top,weights:{[top]:1},scores};
}
function syncAbilityCatalog(){
  const old=get(KEY.abilityMap,{});
  const next={};
  for(const [bankId,bankObj] of Object.entries(BANKS||{})){
    (bankObj.data||[]).forEach((q,i)=>{
      const id=qid(bankId,i,q), p=questionAbilityProfile(q);
      next[id]={bank:bankId,no:q.no||i+1,primary:p.primary,weights:p.weights,analyzedAt:new Date().toISOString()};
    });
  }
  set(KEY.abilityMap,{...old,...next});
  // Migrasikan statistik lama ke komponen audit terbaru supaya histori
  // yang sudah pernah dikerjakan ikut masuk ke komponen yang benar.
  const qstats=get(KEY.qstats,{});
  let changed=false;
  for(const [bankId,bankObj] of Object.entries(BANKS||{})){
    (bankObj.data||[]).forEach((q,i)=>{
      const id=qid(bankId,i,q);
      if(qstats[id]){
        const p=questionAbilityProfile(q);
        qstats[id].primary=p.primary;
        qstats[id].weights=p.weights;
        changed=true;
      }
    });
  }
  if(changed) set(KEY.qstats,qstats);
}

function recordQuestionPerformance(q,correct){
  if(!q || q.jawabanBenar==null || q.incomplete) return;
  const all=get(KEY.qstats,{});
  const id=q.id||qid(q.bank||selectedBank,q.no||0,q);
  const p=questionAbilityProfile(q);
  const prev=all[id]||{attempts:0,correct:0,wrong:0};
  prev.attempts=Number(prev.attempts||0)+1;
  if(correct) prev.correct=Number(prev.correct||0)+1;
  else prev.wrong=Number(prev.wrong||0)+1;
  prev.lastAnswered=new Date().toISOString(); prev.bank=q.bank||selectedBank; prev.no=q.no;
  prev.primary=p.primary; prev.weights=p.weights;
  all[id]=prev; set(KEY.qstats,all);
}

function abilityEvidence(){
  const qstats=get(KEY.qstats,{}), wrongList=get(KEY.wrong,[]);
  const wrongById={};
  (Array.isArray(wrongList)?wrongList:[]).forEach(w=>wrongById[w.id]=Number(w.wrong||0));
  const evidence={}; ABILITIES.forEach(a=>evidence[a]={attempts:0,correct:0,wrong:0,questions:0});
  for(const [id,st] of Object.entries(qstats||{})){
    const attempts=Number(st.attempts||0); if(!attempts) continue;
    const profile=st.weights||get(KEY.abilityMap,{})[id]?.weights||{Recall:1};
    const correct=Number(st.correct||0), wrong=Number(st.wrong||Math.max(0,attempts-correct));
    for(const ability of Object.keys(profile)){
      const w=Number(profile[ability])||0;
      evidence[ability].attempts+=attempts*w;
      evidence[ability].correct+=correct*w;
      evidence[ability].wrong+=wrong*w;
      evidence[ability].questions+=w;
    }
  }
  for(const [id,wrongCount] of Object.entries(wrongById)){
    if(qstats[id]) continue;
    const profile=get(KEY.abilityMap,{})[id]?.weights; if(!profile) continue;
    for(const ability of Object.keys(profile)){
      const w=Number(profile[ability])||0;
      evidence[ability].attempts+=wrongCount*w;
      evidence[ability].wrong+=wrongCount*w;
      evidence[ability].questions+=w;
    }
  }
  return evidence;
}
function renderBanks(){
  if(!$('bankChoices'))return;
  const banks=Object.fromEntries(Object.entries(BANKS||{}).filter(([id])=>blockForBank(id)==='SSP').map(([id,b])=>[id,{name:b.name,desc:`${(b.data||[]).length} soal`} ]));
  $('bankChoices').innerHTML=Object.entries(banks).map(([id,b])=>`<button class="bank-choice ${id===selectedBank?"selected":""}" data-bank="${id}"><span class="bank-name">${b.name}</span><span class="bank-desc">${b.desc}</span><i>${id===selectedBank?"✓":""}</i></button>`).join("");
  $('bankNote').textContent="";
  document.querySelectorAll('.bank-choice').forEach(b=>b.onclick=()=>{selectedBank=b.dataset.bank;selectedCount=10;renderBanks();renderCounts();});
}
function renderCounts(){
  const bank=currentBank(), max=bank.length;
  const choices=[10,20,50,100].filter(n=>n<=max);
  if(max>0)choices.push('all');
  if(selectedCount!==max && !choices.includes(selectedCount))selectedCount=choices[0]||max;
  $('countChoices').innerHTML=choices.map(n=>{const val=n==='all'?max:n;return `<button class="choice ${selectedCount===val?"selected":""}" data-n="${val}">${n==='all'?"Semua":n}<small>${n==='all'?` (${max})`:"soal"}</small></button>`}).join('');
  document.querySelectorAll('#countChoices .choice').forEach(b=>b.onclick=()=>{selectedCount=+b.dataset.n;renderCounts();});
  const books=get(KEY.book,[]),hist=get(KEY.hist,[]);
  if($('totalStat'))$('totalStat').textContent=max;
  if($('bookmarkStat'))$('bookmarkStat').textContent=books.length;
  if($('historyStat'))$('historyStat').textContent=hist.length;
  if($('bestStat'))$('bestStat').textContent=hist.length?Math.max(...hist.map(x=>x.pct))+"%":"0%";
  renderBanks();renderResume();
}
function buildQuiz(count){
  const bank=currentBank();
  return shuffle(bank).slice(0,count).map((q)=>{
    const originalIndex=bank.indexOf(q);
    const id=qid(selectedBank,originalIndex,q);
    const order=shuffle(q.opsi.map((_,i)=>i));
    const correct=q.jawabanBenar==null?null:order.indexOf(q.jawabanBenar);
    return {
      id, bank:selectedBank, source:q.source||bankName(), no:q.no||originalIndex+1,
      soal:q.soal, opsi:order.map(i=>q.opsi[i]), jawabanBenar:correct,
      pembahasan:q.pembahasan,
      pembahasanPilihan:order.map(i=>(q.pembahasanPilihan&&q.pembahasanPilihan[i])||q.pembahasan||"Belum ada pembahasan khusus untuk opsi ini."),
      catatanKlinis:q.catatanKlinis||"", incomplete:!!q.incomplete,
      abilityProfile:questionAbilityProfile(q)
    };
  });
}

function saveSession(){
  if(!quiz.length)return;
  if(timerDuration && timerDeadline){
    timerSeconds=Math.max(0,Math.ceil((timerDeadline-Date.now())/1000));
  }
  set(KEY.session,{
    quiz,pos,score,selectedCount,selectedBank,streak,sessionXP,playerHP,enemyHP,wrongCombo,
    answered,selectedAnswer,quizMode,timerSeconds,timerDuration,timerDeadline,
    flagged:[...flagged],savedAt:new Date().toISOString()
  });
  renderResume();
}
function clearSession(){stopTimer();del(KEY.session);renderResume()}
function renderResume(){
  const s=get(KEY.session,null);
  if(!s||!s.quiz?.length){$("resumeCard").hidden=true;return}
  $("resumeCard").hidden=false;
  $("resumeText").textContent=`${BANKS[s.selectedBank||"utama"]?.name||"Kuis"} • Soal ${Math.min((s.pos||0)+1,s.quiz.length)} dari ${s.quiz.length} • ${s.score||0} benar • ${new Date(s.savedAt).toLocaleString("id-ID")}`;
}
$("resumeBtn").onclick=()=>{
  const s=get(KEY.session,null);if(!s)return;
  quiz=s.quiz;pos=s.pos||0;score=s.score||0;selectedCount=s.selectedCount||quiz.length;
  selectedBank=s.selectedBank||"utama";streak=s.streak||0;sessionXP=Number(s.sessionXP||0);playerHP=Number.isFinite(Number(s.playerHP))?Math.max(0,Math.min(100,Number(s.playerHP))):100;enemyHP=Number.isFinite(Number(s.enemyHP))?Math.max(0,Math.min(100,Number(s.enemyHP))):100;wrongCombo=Number(s.wrongCombo||0);answered=!!s.answered;selectedAnswer=s.selectedAnswer??null;
  selectedBank=s.selectedBank||"utama";
  setLastWorkedBlock(blockForBank(selectedBank));
  renderDashboardBlockOptions();
  quizMode=s.quizMode||"study";
  timerDuration=Number(s.timerDuration||0);
  timerSeconds=Number.isFinite(s.timerSeconds)?s.timerSeconds:timerDuration;
  timerDeadline=Number(s.timerDeadline||0);
  if(timerDuration && !timerDeadline) timerDeadline=Date.now()+timerSeconds*1000;
  flagged=new Set(s.flagged||[]);
  show("quiz");renderQuestion(true);startTimer();
};
$("discardResumeBtn").onclick=()=>{if(confirm("Hapus progres kuis tersimpan?"))clearSession()};


function renderEmptyBlockControls(key){
  const block=String(key||'').toUpperCase();
  const countBox=$(key+"CountChoices"), modeBox=$(key+"ModeChoices"), timeBox=$(key+"TimeChoices");
  const page=document.querySelector(`[data-block-key="${key}"]`);
  if(!countBox||!modeBox||!timeBox)return;
  const entries=Object.entries(BANKS||{}).filter(([id,b])=>blockForBank(id)===block && (b.data||[]).length);
  const startBtn=page?.querySelector('.block-disabled-start');
  const note=page?.querySelector('.block-empty-note');
  const inline=page?.querySelector('.empty-bank-inline');
  if(!entries.length){
    const counts=[10,20,50,100];
    countBox.innerHTML=counts.map(n=>`<button type="button" class="choice disabled-choice" disabled>${n}<small> soal</small></button>`).join("");
    const modes=[["📖Belajar","Pembahasan langsung setelah menjawab"],["📝Ujian","Pembahasan dibuka setelah selesai"]];
    modeBox.innerHTML=modes.map(([title,desc])=>`<button type="button" class="choice mode-choice disabled-choice" disabled><b>${title}</b><small>${desc}</small></button>`).join("");
    const times=[["Tanpa batas",0],["30 menit",1800],["60 menit",3600],["90 menit",5400]];
    timeBox.innerHTML=times.map(([label])=>`<button type="button" class="choice time-choice disabled-choice" disabled>${label}</button>`).join("");
    if(startBtn){startBtn.disabled=true;startBtn.textContent='Mulai Kuis →';}
    if(note)note.textContent='Bank soal akan muncul setelah ditambahkan.';
    if(inline)inline.innerHTML='<span class="empty-bank-icon">🩺</span><div><b>Bank soal belum tersedia</b><small>Bank soal akan aktif otomatis saat ditambahkan.</small></div>';
    return;
  }
  if(!entries.some(([id])=>id===selectedBank)) selectedBank=entries[0][0];
  const bank=BANKS[selectedBank], max=bank.data.length;
  const choices=[10,20,50,100].filter(n=>n<=max); if(max>0)choices.push(max);
  const unique=[...new Set(choices)]; if(!unique.includes(selectedCount)||selectedCount>max)selectedCount=unique[0]||max;
  if(inline)inline.innerHTML=`<span class="empty-bank-icon">🩺</span><div><b>${esc(entries.length===1?bank.name:`${entries.length} bank tersedia`)}</b><small>${entries.map(([id,b])=>`<button type="button" class="block-bank-chip ${id===selectedBank?'selected':''}" data-block-bank="${esc(id)}">${esc(b.name)} · ${(b.data||[]).length} soal</button>`).join('')}</small></div>`;
  inline?.querySelectorAll('[data-block-bank]').forEach(btn=>btn.onclick=()=>{selectedBank=btn.dataset.blockBank;selectedCount=10;renderEmptyBlockControls(key);});
  countBox.innerHTML=unique.map(n=>`<button type="button" class="choice ${selectedCount===n?'selected':''}" data-block-count="${n}">${n===max?'Semua':n}<small>${n===max?` (${max})`:' soal'}</small></button>`).join('');
  countBox.querySelectorAll('[data-block-count]').forEach(btn=>btn.onclick=()=>{selectedCount=Number(btn.dataset.blockCount);renderEmptyBlockControls(key);});
  const modes=[["study","📖Belajar","Pembahasan langsung setelah menjawab"],["exam","📝Ujian","Pembahasan dibuka setelah selesai"]];
  modeBox.innerHTML=modes.map(([id,title,desc])=>`<button type="button" class="choice mode-choice ${quizMode===id?'selected':''}" data-block-mode="${id}"><b>${title}</b><small>${desc}</small></button>`).join('');
  modeBox.querySelectorAll('[data-block-mode]').forEach(btn=>btn.onclick=()=>{quizMode=btn.dataset.blockMode;renderEmptyBlockControls(key);});
  const times=[[0,'Tanpa batas'],[1800,'30 menit'],[3600,'60 menit'],[5400,'90 menit']];
  timeBox.innerHTML=times.map(([sec,label])=>`<button type="button" class="choice time-choice ${timerDuration===sec?'selected':''}" data-block-time="${sec}">${label}</button>`).join('');
  timeBox.querySelectorAll('[data-block-time]').forEach(btn=>btn.onclick=()=>{timerDuration=Number(btn.dataset.blockTime);renderEmptyBlockControls(key);});
  if(startBtn){startBtn.disabled=false;startBtn.textContent=`Mulai ${bank.name} →`;startBtn.onclick=()=>{timerSeconds=timerDuration;startQuiz();};}
  if(note)note.textContent=`${entries.length} bank aktif · ${max} soal tersedia.`;
}

function renderAvailableBlockControls(key){
  const block=String(key||'').toUpperCase();
  const countBox=$(key+"CountChoices"), modeBox=$(key+"ModeChoices"), timeBox=$(key+"TimeChoices");
  const page=document.querySelector(`[data-block-key="${key}"]`);
  if(!countBox||!modeBox||!timeBox)return;
  const entries=Object.entries(BANKS||{}).filter(([id,b])=>blockForBank(id)===block && (b.data||[]).length);
  const startBtn=page?.querySelector('.block-disabled-start');
  const note=page?.querySelector('.block-empty-note');
  const inline=page?.querySelector('.empty-bank-inline');
  if(!entries.length){ renderEmptyBlockControls(key); return; }

  const [firstId, firstBank]=entries[0];
  if(!entries.some(([id])=>id===selectedBank)) selectedBank=firstId;
  const bank=BANKS[selectedBank]||firstBank;
  const max=(bank.data||[]).length;
  const counts=[10,20,50,100].filter(n=>n<=max);
  if(max>0 && !counts.includes(max)) counts.push(max);
  if(!selectedCount || selectedCount>max) selectedCount=counts[0]||max;

  countBox.innerHTML=counts.map(n=>`<button type="button" class="choice ${selectedCount===n?"selected":""}" data-n="${n}">${n}<small> soal</small></button>`).join("");
  countBox.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{
    selectedCount=Number(b.dataset.n);
    renderAvailableBlockControls(key);
  });

  modeBox.innerHTML=[
    ["study","📖Belajar","Pembahasan langsung setelah menjawab"],
    ["exam","📝Ujian","Pembahasan dibuka setelah selesai"]
  ].map(([mode,title,desc])=>`<button type="button" class="choice mode-choice ${quizMode===mode?"selected":""}" data-mode="${mode}"><b>${title}</b><small>${desc}</small></button>`).join("");
  modeBox.querySelectorAll(".mode-choice").forEach(b=>b.onclick=()=>{
    quizMode=b.dataset.mode;
    renderAvailableBlockControls(key);
  });

  const times=[["Tanpa batas",0],["30 menit",1800],["60 menit",3600],["90 menit",5400]];
  timeBox.innerHTML=times.map(([label,sec])=>`<button type="button" class="choice time-choice ${Number(timerDuration||0)===sec?"selected":""}" data-sec="${sec}">${label}</button>`).join("");
  timeBox.querySelectorAll(".time-choice").forEach(b=>b.onclick=()=>{
    timerDuration=Number(b.dataset.sec);
    renderAvailableBlockControls(key);
  });

  if(startBtn){
    startBtn.disabled=false;
    startBtn.textContent="Mulai Kuis →";
    startBtn.onclick=()=>startQuiz();
  }
  if(note) note.textContent=`${bank.name}: ${max} soal tersedia.`;
  if(inline) inline.innerHTML=`<span class="empty-bank-icon">👨‍👩‍👧‍👦</span><div><b>Bank soal tersedia</b><small>${entries.length>1?entries.length+" bank KEDKEL tersedia. ":""}${max} soal siap digunakan.</small></div>`;
}

function renderModes(){
  const modeBox=$("modeChoices"), timeBox=$("timeChoices");
  if(!modeBox || !timeBox)return;
  const modes=[
    ["study","📖Belajar","Pembahasan langsung setelah menjawab"],
    ["exam","📝Ujian","Pembahasan dibuka setelah selesai"]
  ];
  modeBox.innerHTML=modes.map(([id,title,desc])=>
    `<button type="button" class="choice mode-choice ${quizMode===id?"selected":""}" data-mode="${id}">
      <b>${title}</b><small>${desc}</small>
    </button>`).join("");
  modeBox.querySelectorAll(".mode-choice").forEach(b=>b.onclick=()=>{
    quizMode=b.dataset.mode;
    renderModes();
  });

  const times=[
    [0,"Tanpa batas"],
    [1800,"30 menit"],
    [3600,"60 menit"],
    [5400,"90 menit"]
  ];
  timeBox.innerHTML=times.map(([sec,label])=>
    `<button type="button" class="choice time-choice ${timerDuration===sec?"selected":""}" data-sec="${sec}">${label}</button>`
  ).join("");
  timeBox.querySelectorAll(".time-choice").forEach(b=>b.onclick=()=>{
    timerDuration=Number(b.dataset.sec);
    renderModes();
  });
}
function getTimeSeconds(){
  const el=document.querySelector("#timeChoices .time-choice.selected");
  return el ? Number(el.dataset.sec||0) : Number(timerDuration||0);
}

function startQuiz(){
  if(!selectedCount || !currentBank().length){
    alert("Bank soal belum tersedia.");
    return;
  }
  clearSession();
  setLastWorkedBlock(blockForBank(selectedBank));
  renderDashboardBlockOptions();
  quiz=buildQuiz(selectedCount);
  if(!quiz.length){
    alert("Tidak ada soal yang dapat dimuat dari bank ini.");
    return;
  }
  pos=0;score=0;streak=0;sessionXP=0;lastXPGain=0;playerHP=100;enemyHP=100;wrongCombo=0;answered=false;selectedAnswer=null;
  flagged=new Set();sessionStart=Date.now();
  timerDuration=getTimeSeconds();timerSeconds=timerDuration;timerDeadline=timerDuration?Date.now()+timerDuration*1000:0;
  show("quiz");renderQuestion();startTimer();
}

function updateFlagUI(){
  const q=quiz[pos]; if(!q)return;
  const on=flagged.has(q.id);
  $("flagBtn").textContent=on?"⚑Ditandai":"⚑Tandai soal";
  $("flagState").textContent=on?"Akan masuk daftar review":"";
}
$("flagBtn").onclick=()=>{
  if(!quiz[pos])return;
  const id=quiz[pos].id;
  if(flagged.has(id))flagged.delete(id);else flagged.add(id);
  updateFlagUI();saveSession();
};
$("startBtn").onclick=startQuiz;
$("againBtn").onclick=startQuiz;

function medicalSystem(q){
  const text=String((q&&q.soal)||'').toLowerCase();
  if(/jantung|koroner|aritmia|ekg|miokard|gagal jantung/.test(text)) return 'KARDIOVASKULAR';
  if(/paru|asma|copd|pneumonia|tb |tuberkulosis|sesak|spirometri/.test(text)) return 'RESPIRASI';
  if(/otak|stroke|kejang|epilepsi|afasia|saraf|neurolog/.test(text)) return 'NEUROLOGI';
  if(/ginjal|urin|nefro|glomerul|kreatinin/.test(text)) return 'NEFROLOGI';
  if(/lambung|usus|hepar|hati|gaster|diare|abdomen/.test(text)) return 'GASTROHEPATO';
  if(/kulit|dermat|tinea|molluscum/.test(text)) return 'DERMATOLOGI';
  if(/mata|oftalm|retina|glaukoma|katarak/.test(text)) return 'MATA';
  if(/telinga|hidung|laring|tonsil|t h t|tht/.test(text)) return 'THT';
  if(/psikiatri|depresi|cemas|skizofrenia|obat psiki/.test(text)) return 'PSIKIATRI';
  if(/anak|neonatus|bayi|pediatri/.test(text)) return 'PEDIATRI';
  return 'KASUS KLINIS';
}
function renderMedicalBattle(q){
  const hud=document.getElementById('medicalBattle'); if(!hud)return;
  const system=medicalSystem(q);
  const eh=Math.max(0,Math.min(100,Math.round(enemyHP)));
  hud.innerHTML=`<div class="clinical-battle-head"><span>🧑‍⚕️ CLINICAL CASE</span><b>${esc(system)}</b></div>
    <div class="case-target"><span class="case-pulse">●</span><div><b>Patient Case</b><small>Gunakan reasoning klinis untuk menaklukkan kasus</small></div><strong>${eh}%</strong></div>
    <div class="enemy-track"><i class="motion-progress-fill" style="--motion-progress:${eh/100}" aria-valuenow="${eh}"></i></div>
    <div class="battle-hint">✓ Benar = <b>Clinical Strike</b> &nbsp;•&nbsp; ✕ Salah = <b>Clinical Error</b></div>`;
}
function dealClinicalStrike(q){
  const total=Math.max(1,quiz.length);
  const damage=Math.max(8,Math.min(35,Math.ceil(100/total)+8));
  enemyHP=Math.max(0,enemyHP-damage);
  return damage;
}
function renderHP(){
  const hp=Math.max(0,Math.min(100,Math.round(playerHP)));
  const total=Math.max(1,quiz.length);
  const base=Math.max(1,Math.ceil(100/total));
  $("hpText").textContent=`${hp} / 100`;
  setProgress($("hpBar"),hp);
  $("hpBar").classList.toggle("critical",hp<=25);
  $("hpBar").classList.toggle("warning",hp<=50 && hp>25);
  $("damageHint").textContent=wrongCombo>0?`Combo salah ${wrongCombo}x • Damage berikutnya ${Math.min(100,base*Math.pow(2,wrongCombo))}`:`Clinical Error: ${base} HP`;
}
function applyDamage(){
  const total=Math.max(1,quiz.length);
  const base=Math.max(1,Math.ceil(100/total));
  wrongCombo++;
  const damage=Math.min(100,base*Math.pow(2,wrongCombo-1));
  const before=playerHP;
  playerHP=Math.max(0,playerHP-damage);
  renderHP();
  return {damage,before,after:playerHP,combo:wrongCombo,base};
}

function renderQuestion(resume=false){
  const q=quiz[pos]; if(!q)return;
  // Set the current question's state from the question itself so Back/Next
  // navigation never loses an already selected answer.
  selectedAnswer=q.selectedAnswer ?? null;
  answered=selectedAnswer!==null || !!(resume && pos===Number(get(KEY.session,null)?.pos));
  $("info").textContent=`Soal ${pos+1} / ${quiz.length}`;
  if($("scoreLive"))$("scoreLive").textContent=`${score} benar`;
  renderXP();
  renderHP();
  $("streakLive").textContent=streak>1?`🔥 ${streak} beruntun`:"";
  setProgress($("progress"),(pos+1)/quiz.length*100);
  $("question").textContent=q.soal;
  $("answers").innerHTML=q.opsi.map((o,i)=>`<button class="answer" data-i="${i}">
    <span class="answer-letter">${letter(i)}</span><span>${esc(o)}</span>
  </button>`).join("");
  $("explain").style.display="none";
  $("nextBtn").style.display=answered?"block":"none";
  $("nextBtn").textContent=pos===quiz.length-1?"Lihat Hasil→":"Selanjutnya→";
  $("prevBtn").style.display=pos>0?"block":"none";
  const b=get(KEY.book,[]);
  $("bookmarkBtn").textContent=b.includes(q.id)?"★Tersimpan":"☆Simpan";
  $("bookmarkBtn").onclick=()=>toggleBookmark(q.id);
  updateFlagUI();
  document.querySelectorAll(".answer").forEach(x=>x.onclick=()=>answer(+x.dataset.i));
  if(answered) applyAnsweredState();
}
function applyAnsweredState(){
  const q=quiz[pos]; if(!q)return;
  const chosen=q.selectedAnswer ?? selectedAnswer;
  document.querySelectorAll(".answer").forEach((b,j)=>{
    b.disabled=true;
    if(q.jawabanBenar!=null && j===q.jawabanBenar)b.classList.add("correct");
    if(chosen!=null && j===chosen && chosen!==q.jawabanBenar)b.classList.add("wrong");
  });
  selectedAnswer=chosen;
  answered=chosen!==null;
  if(quizMode==="study"){
    $("explainText").innerHTML=allExplanations(q);
    $("explain").style.display="block";
  }
  $("nextBtn").style.display="block";
  $("nextBtn").textContent=pos===quiz.length-1?"Lihat Hasil→":"Selanjutnya→";
}
function isNegativeStem(stem){
  return /\b(tidak benar|tidak tepat|yang salah|manakah yang salah|mana yang salah|kecuali|bukan merupakan|bukan yang|tidak sesuai|tidak termasuk)\b/i.test(stem||"");
}
function stripTruthLabel(s){
  return String(s||"").replace(/^\s*(BENAR|SALAH)\s*[\.:—-]?\s*/i,"").trim();
}
function truthFromDetail(s){
  const m=String(s||"").match(/^\s*(BENAR|SALAH)\b/i);
  return m?m[1].toUpperCase():null;
}
function allExplanations(q){
  if(q.incomplete || q.jawabanBenar==null){
    return `<div class="explain-title">⚠️ Pembahasan Arsip</div><div class="option-review"><div class="option-review-text">${esc(q.pembahasan||"Soal ini tidak lengkap pada arsip asli.")}</div></div>`;
  }
  const negative=isNegativeStem(q.soal);
  const keyLabel=negative?"✓KUNCI—PERNYATAAN SALAH":"✓KUNCI—JAWABAN BENAR";
  return `<div class="explain-title">Pembahasan semua pilihan</div>
    <div class="main-explain"><b>🎯 Konsep inti:</b> ${esc(q.pembahasan||"Tidak ada pembahasan khusus.")}</div>`+
    (q.catatanKlinis?`<div class="clinical-note"><b>🩺 Catatan klinis:</b> ${esc(q.catatanKlinis)}</div>`:"")+
    q.opsi.map((o,i)=>{
      const good=i===q.jawabanBenar;
      let detail=(q.pembahasanPilihan&&q.pembahasanPilihan[i])||"";
      const truth = negative ? (good ? "SALAH" : "BENAR") : (good ? "BENAR" : "SALAH");
      detail=stripTruthLabel(detail);
      const truthLabel=`<span class="truth-badge ${truth==="BENAR"?"truth-true":"truth-false"}">Pernyataan ${truth==="BENAR"?"BENAR":"SALAH"}</span>`;
      const status=good?keyLabel:(negative?"✕BUKAN KUNCI":"✕SALAH—BUKAN JAWABAN");
      if(!detail){
        detail=good?(q.pembahasan||"Sesuai dengan konsep yang diuji."):`Opsi ini tidak paling sesuai dengan temuan pada stem.`;
      }
      return `<div class="option-review ${good?"is-correct":"is-wrong"}">
        <div class="option-review-head"><b>${letter(i)}. ${esc(o)}</b><span>${status}</span></div>
        <div class="option-truth">${truthLabel}</div>
        <div class="option-review-text">${esc(detail)}</div>
      </div>`;
    }).join("");
}
function answer(i){
  if(answered)return;
  answered=true;selectedAnswer=i;
  const q=quiz[pos];
  if(q.incomplete || q.jawabanBenar==null){
    recordDailyQuestion();
    q.selectedAnswer=i;
    document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
    if(quizMode==="study"){$("explainText").innerHTML=allExplanations(q);$("explain").style.display="block";}
    $("nextBtn").style.display="block";$("nextBtn").textContent=pos===quiz.length-1?"Lihat Hasil→":"Selanjutnya→";
    saveSession();return;
  }
  const good=i===q.jawabanBenar;
  recordDailyQuestion();
  recordQuestionPerformance(q,good);
  q.selectedAnswer=i;
  if(good){
    wrongCombo=0; renderHP();
    score++;streak++;const strike=dealClinicalStrike(q);celebrate();
    const gain=20 + Math.min(30,Math.max(0,(streak-1)*5));
    addXP(gain,streak>1?`Jawaban benar • streak ${streak} 🔥`:"Jawaban benar");
  }else{
    streak=0;
    const dmg=applyDamage();
      wrongFx();combatFx("damage",dmg);recordWrong(q);
    addXP(5,"Tetap semangat—jawaban salah");
  }
  document.querySelectorAll(".answer").forEach((b,j)=>{
    b.disabled=true;
    if(j===q.jawabanBenar)b.classList.add("correct");
    if(j===i&&!good)b.classList.add("wrong");
  });
  if(good)answerReward(document.querySelectorAll('.answer')[i]);
  $("scoreLive").textContent=`${score} benar`;
  $("streakLive").textContent=streak>1?`🔥 ${streak} beruntun`:"";
  if(quizMode==="study"){
    $("explainText").innerHTML=allExplanations(q);
    $("explain").style.display="block";
  }
  $("nextBtn").style.display="block";
  $("nextBtn").textContent=pos===quiz.length-1?"Lihat Hasil→":"Selanjutnya→";
  saveSession();
}
function goToQuestion(target){
  if(!quiz.length)return;
  const next=Math.max(0,Math.min(quiz.length-1,target));
  if(next===pos)return;
  pos=next;
  selectedAnswer=quiz[pos].selectedAnswer ?? null;
  answered=selectedAnswer!==null;
  renderQuestion();
  saveSession();
}

$("prevBtn").onclick=()=>goToQuestion(pos-1);
$("nextBtn").onclick=()=>{
  if(!answered){return;}
  if(pos<quiz.length-1)goToQuestion(pos+1);
  else finish();
};

function finish(reason="complete"){
  stopTimer();
  const validTotal=quiz.filter(q=>q.jawabanBenar!=null&&!q.incomplete).length;
  const total=quiz.length,pct=validTotal?Math.round(score/validTotal*100):0,h=get(KEY.hist,[]);
  h.unshift({
    date:new Date().toISOString(),score,total,pct,validTotal,
    bank:selectedBank,bankName:bankName(),mode:quizMode,
    duration:timerDuration?timerDuration-timerSeconds:null,reason
  });
  set(KEY.hist,h.slice(0,50));clearSession();
  $("resultScore").textContent=pct+"%";
  if($("resultXP"))$("resultXP").textContent=`+${sessionXP} XP`;
  if($("resultLevel"))$("resultLevel").textContent=`Lv. ${xpLevel(Number(get(KEY.xp,0))||0)}`;
  $("resultDetail").textContent=`${score} benar dari ${validTotal} soal dinilai${validTotal<total?` • ${total-validTotal} arsip tidak lengkap`:""}${reason==="timeout"?"•waktu habis":""}`;
  $("resultCorrect").textContent=score;
  $("resultWrong").textContent=Math.max(0,validTotal-score);
  $("resultTotal").textContent=total;
  setProgress($("resultBar"),pct);
  $("resultGrade").textContent=pct>=85?"🏆Sangat Baik":pct>=70?"✨Baik":pct>=60?"👍Cukup":"📚Perlu Belajar Lagi";
  $("reviewWrongBtn").style.display=quiz.some(q=>q.id && get(KEY.wrong,[]).some(x=>x.id===q.id))?"block":"none";
  $("reviewQuizBtn").style.display=quiz.length?"block":"none";
  show("result");renderCounts();
}
function formatTime(s){
  s=Math.max(0,Math.floor(s||0)); const m=Math.floor(s/60),sec=s%60;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function updateTimerUI(){
  const el=$("timerLive"); if(!el)return;
  if(!timerDuration){el.textContent="⏱∞";el.classList.remove("urgent");return}
  if(timerDeadline) timerSeconds=Math.max(0,Math.ceil((timerDeadline-Date.now())/1000));
  el.textContent=`⏱ ${formatTime(timerSeconds)}`;
  el.classList.toggle("urgent",timerSeconds<=60);
}
function startTimer(){
  stopTimer(); updateTimerUI();
  if(!timerDuration)return;
  if(!timerDeadline)timerDeadline=Date.now()+Math.max(0,timerSeconds)*1000;
  let lastSecond=timerSeconds;
  const tick=()=>{
    if(!timerId)return;
    const next=Math.max(0,Math.ceil((timerDeadline-Date.now())/1000));
    if(next!==lastSecond){
      timerSeconds=next;lastSecond=next;updateTimerUI();
      if(timerSeconds<=0){stopTimer();if(quiz.length && $("quiz").classList.contains("active"))finish("timeout");return;}
      if(timerSeconds%5===0)saveSession();
    }
    timerId=requestAnimationFrame(tick);
  };
  timerId=requestAnimationFrame(tick);
}
function stopTimer(){if(timerId){cancelAnimationFrame(timerId);timerId=null}}
function recordWrong(q){
  const w=get(KEY.wrong,[]);
  const idx=w.findIndex(x=>x.id===q.id);
  if(idx>=0){w[idx].wrong++;w[idx].lastWrong=new Date().toISOString();}
  else w.push({id:q.id,bank:q.bank||selectedBank,wrong:1,lastWrong:new Date().toISOString(),soal:q.soal,opsi:q.opsi,jawabanBenar:q.jawabanBenar,pembahasan:q.pembahasan,pembahasanPilihan:q.pembahasanPilihan,catatanKlinis:q.catatanKlinis});
  set(KEY.wrong,w);
}
function renderWrong(){
  const w=get(KEY.wrong,[]).sort((a,b)=>b.wrong-a.wrong),box=$("wrongList");
  $("wrongSummary").textContent=w.length?`${w.length} soal • Diurutkan dari yang paling sering salah`:"Belum ada soal yang salah.";
  if(!w.length){box.innerHTML='<div class="empty">Kerjakan kuis dulu. Soal yang kamu jawab salah akan muncul di sini.</div>';return}
  box.innerHTML=w.slice(0,50).map((q,i)=>`<div class="list-item wrong-item">
    <div><b>#${i+1} • ${BANKS[q.bank]?.name||q.bank} • salah ${q.wrong}×</b><br>${esc(q.soal)}</div>
    <span class="score">${letter(q.jawabanBenar)}</span>
  </div>`).join("");
}
$("wrongBtn").onclick=()=>{renderWrong();show("wrong")};

function renderReview(){
  $("reviewSummary").textContent=`${quiz.length} soal • ${score} benar`;
  $("reviewList").innerHTML=quiz.map((q,idx)=>{
    const negative=isNegativeStem(q.soal);
    const selected=q.selectedAnswer;
    const key=q.jawabanBenar;
    return `<article class="review-card">
      <div class="review-q"><b>Soal ${idx+1}</b><div>${esc(q.soal)}</div></div>
      <div class="review-options">${q.opsi.map((o,i)=>{
        const truth=negative ? (i===key?"SALAH":"BENAR") : (i===key?"BENAR":"SALAH");
        const cls=i===key?"review-key":(selected===i?"review-user-wrong":"");
        return `<div class="review-option ${cls}"><b>${letter(i)}.</b> ${esc(o)} ${i===key?'<span>✓ KUNCI</span>':selected===i?'<span>✕ Pilihanmu</span>':""}<small>Pernyataan ${truth==="BENAR"?"BENAR":"SALAH"} · ${esc(stripTruthLabel(q.pembahasanPilihan?.[i]||""))}</small></div>`;
      }).join("")}</div>
      <div class="review-concept"><b>🎯 Konsep inti:</b> ${esc(q.pembahasan||"")}</div>
    </article>`;
  }).join("");
}
$("reviewQuizBtn").onclick=()=>{renderReview();show("review")};
$("reviewWrongBtn").onclick=()=>{const w=get(KEY.wrong,[]); const ids=new Set(w.map(x=>x.id)); quiz=quiz.filter(q=>ids.has(q.id)).map(q=>({...q,selectedAnswer:null})); if(!quiz.length){show("home");return} pos=0;score=0;sessionXP=0;answered=false;selectedAnswer=null;streak=0;timerDuration=getTimeSeconds();timerSeconds=timerDuration;show("quiz");renderQuestion();startTimer()};

$("quizBack").onclick=()=>{
  if(confirm("Keluar dari kuis?Progres akan disimpan agar bisa dilanjutkan.")){
    saveSession();stopTimer();show("home");renderCounts();
  }
};
$("resultHome").onclick=()=>{show("home");renderCounts()};

function toggleBookmark(id){
  let b=get(KEY.book,[]);
  b=b.includes(id)?b.filter(x=>x!==id):[...b,id];set(KEY.book,b);
  $("bookmarkStat").textContent=b.length;
  if(quiz[pos])$("bookmarkBtn").textContent=b.includes(quiz[pos].id)?"★Tersimpan":"☆Simpan";
}
function renderBookmarksLegacy(){
  const b=get(KEY.book,[]),w=$("bookmarkList");
  if(!b.length){w.innerHTML='<div class="empty">Belum ada soal yang disimpan.</div>';return}
  w.innerHTML=b.map(id=>{
    const [bank,...rest]=String(id).split(":"); const wanted=rest.join(":");
    const arr=BANKS[bank]?.data||[];
    const idx=arr.findIndex((q,i)=>qid(bank,i,q)===id || qid(bank,i,q)===wanted);
    const q=idx>=0?arr[idx]:null;
    if(!q)return '';
    return `<div class="list-item"><div><b>${BANKS[bank].name} • Soal ${q.no||idx+1}</b><br>${esc(q.soal)}</div><button class="bookmark" data-id="${esc(id)}">★</button></div>`;
  }).join("");
  w.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>{toggleBookmark(x.dataset.id);renderBookmarks();renderCounts()});
}
function renderHistory(){
  const h=get(KEY.hist,[]),w=$("historyList");
  if(!h.length){$("historySummary").textContent="";w.innerHTML='<div class="empty">Belum ada riwayat kuis.</div>';return}
  const avg=Math.round(h.reduce((a,x)=>a+x.pct,0)/h.length),best=Math.max(...h.map(x=>x.pct));
  $("historySummary").textContent=`${h.length} percobaan • Rata-rata ${avg}% • Terbaik ${best}%`;
  w.innerHTML=h.map(x=>`<div class="list-item"><div><b>${x.pct}%</b><div class="date">${x.bankName||"Kuis"} • ${x.mode==="exam"?"Ujian":"Belajar"} • ${new Date(x.date).toLocaleString("id-ID")}</div></div><span class="score">${x.score}/${x.validTotal||x.total}</span></div>`).join("");
}
$("bookmarksBtn").onclick=()=>{renderBookmarks();show("bookmarks")};
$("historyBtn").onclick=()=>{renderHistory();show("history")};
document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>{show("home");renderCounts()});
$("clearHistory").onclick=()=>{if(confirm("Hapus semua riwayat skor?")){set(KEY.hist,[]);renderHistory();renderCounts()}};


function localDayKey(d=new Date()){
  const x=d instanceof Date?d:new Date(d);
  if(Number.isNaN(x.getTime()))return "";
  const y=x.getFullYear();
  const m=String(x.getMonth()+1).padStart(2,"0");
  const day=String(x.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function streakData(){
  const raw=get(KEY.dailyStreak,{counts:{},streak:0});
  const counts=raw&&typeof raw.counts==="object"?raw.counts:{};
  const cleaned={};
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-120);
  Object.entries(counts).forEach(([k,v])=>{
    const d=new Date(`${k}T12:00:00`);
    if(!Number.isNaN(d.getTime()) && d>=new Date(cutoff.getFullYear(),cutoff.getMonth(),cutoff.getDate())) cleaned[k]=Math.max(0,Number(v)||0);
  });
  return {counts:cleaned,streak:Math.max(0,Number(raw?.streak)||0)};
}
function calculateDailyStreak(counts){
  const today=localDayKey();
  const todayCount=Number(counts[today]||0);
  const qualifying=k=>Number(counts[k]||0)>=5;
  let anchor=new Date();
  if(!qualifying(today)) anchor.setDate(anchor.getDate()-1);
  const anchorKey=localDayKey(anchor);
  if(!qualifying(anchorKey))return 0;
  let n=0;
  for(let i=0;i<366;i++){
    const d=new Date(anchor);d.setDate(anchor.getDate()-i);
    if(qualifying(localDayKey(d)))n++;else break;
  }
  return n;
}
function renderDailyStreak(){
  const data=streakData(),today=localDayKey(),count=Math.min(5,Number(data.counts[today]||0));
  const streakDays=calculateDailyStreak(data.counts);
  data.streak=streakDays;
  set(KEY.dailyStreak,data);
  const bar=$("dailyStreakBar"), title=$("dailyStreakTitle"), sub=$("dailyStreakSub"), countEl=$("dailyStreakCount"), flame=$("streakFlame");
  if(!bar||!title||!sub||!countEl)return;
  setProgress(bar,count/5*100);
  countEl.textContent=`${count}/5`;
  title.textContent=`${streakDays} ${streakDays===1?"hari":"hari"} streak`;
  if(count>=5){
    sub.textContent="🔥Target hari ini tercapai!Besok lanjutkan lagi.";
    flame.textContent="🔥";
    $("dailyStreakCard")?.classList.add("complete");
  }else{
    const left=5-count;
    sub.textContent=`Tinggal ${left} soal lagi untuk mengaktifkan streak hari ini`;
    flame.textContent=streakDays>0?"🔥":"🕯️";
    $("dailyStreakCard")?.classList.remove("complete");
  }
}
function recordDailyQuestion(){
  const data=streakData(),day=localDayKey();
  data.counts[day]=Number(data.counts[day]||0)+1;
  const before=calculateDailyStreak(data.counts);
  data.streak=before;
  set(KEY.dailyStreak,data);
  renderDailyStreak();
  if(data.counts[day]===5) showStreakMilestone(before);
}
function showStreakMilestone(days){
  let layer=$("streakMilestoneLayer");
  if(!layer){
    layer=document.createElement("div");layer.id="streakMilestoneLayer";layer.className="streak-milestone-layer";
    document.body.appendChild(layer);
  }
  layer.innerHTML=`<div class="streak-milestone"><div class="streak-big-flame">🔥</div><b>${days} ${days===1?"Hari":"Hari"} Streak!</b><span>5 soal hari ini selesai</span></div>`;
  layer.classList.add("show");
  setTimeout(()=>layer.classList.remove("show"),1800);
}
function dateKey(iso){
  try{return new Date(iso).toLocaleDateString("en-CA")}catch{return ""}
}
function daysStudied(history){
  return new Set(history.map(x=>dateKey(x.date)).filter(Boolean));
}
function currentStudyStreak(history){
  const days=daysStudied(history), now=new Date();
  let streakDays=0;
  for(let i=0;i<366;i++){
    const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);
    const key=dateKey(d.toISOString());
    if(days.has(key)) streakDays++; else if(i>0) break;
  }
  return streakDays;
}
function renderAnalytics(){
  const h=get(KEY.hist,[]),w=get(KEY.wrong,[]),b=get(KEY.book,[]);
  const attempts=h.length, avg=attempts?Math.round(h.reduce((s,x)=>s+Number(x.pct||0),0)/attempts):0;
  const best=attempts?Math.max(...h.map(x=>Number(x.pct||0))):0;
  const answered=h.reduce((s,x)=>s+Number(x.validTotal||0),0);
  const correct=h.reduce((s,x)=>s+Number(x.score||0),0);
  const accuracy=answered?Math.round(correct/answered*100):0;
  const streakDays=calculateDailyStreak(streakData().counts);
  $("analyticsSummary").textContent=attempts?`${attempts} percobaan • Akurasi keseluruhan ${accuracy}% • ${streakDays} hari streak (≥5 soal/hari)`:`Belum ada data belajar. Mulai satu kuis untuk melihat analitik.`;
  $("analyticsCards").innerHTML=[
    [best+"%","Nilai terbaik"],[avg+"%","Rata-rata"],[w.length,"Soal perlu diulang"],[b.length,"Bookmark"]
  ].map(x=>`<div class="analytics-stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
  const byBank={};
  h.forEach(x=>{const k=x.bank||"lainnya";(byBank[k]??={name:x.bankName||k,n:0,sum:0,best:0});byBank[k].n++;byBank[k].sum+=Number(x.pct||0);byBank[k].best=Math.max(byBank[k].best,Number(x.pct||0));});
  const bankEntries=Object.values(byBank);
  $("analyticsBanks").innerHTML=bankEntries.length?bankEntries.map(x=>{
    const avgB=Math.round(x.sum/x.n);return `<div class="analytics-row"><div><b>${esc(x.name)}</b><small>${x.n} percobaan • terbaik ${x.best}%</small></div><strong>${avgB}%</strong></div>`;
  }).join(""):"<div class='empty'>Belum ada riwayat per bank.</div>";
  const focus=w.sort((x,y)=>y.wrong-x.wrong).slice(0,5);
  $("analyticsFocus").innerHTML=focus.length?focus.map((x,i)=>`<div class="analytics-row"><div><b>${i+1}. ${esc(x.soal)}</b><small>${BANKS[x.bank]?.name||x.bank||"Soal"} • salah ${x.wrong}×</small></div><strong>${letter(x.jawabanBenar)}</strong></div>`).join(""):"<div class='empty'>Belum ada pola kesalahan.Terus latihan.</div>";
}
$("analyticsBtn").onclick=()=>{renderAnalytics();show("analytics")};

function practiceWrong(){
  const w=get(KEY.wrong,[]).filter(q=>q.jawabanBenar!=null);
  if(!w.length){alert("Belum ada soal yang pernah dijawab salah.");return}
  quiz=shuffle(w).slice(0,Math.min(20,w.length)).map(q=>({
    id:q.id,bank:q.bank||selectedBank,source:BANKS[q.bank]?.name||q.bank,no:q.no,soal:q.soal,opsi:q.opsi,
    jawabanBenar:q.jawabanBenar,pembahasan:q.pembahasan,pembahasanPilihan:q.pembahasanPilihan||[],catatanKlinis:q.catatanKlinis||"",incomplete:false,selectedAnswer:null
  }));
  selectedBank=quiz[0]?.bank||selectedBank;selectedCount=quiz.length;pos=0;score=0;streak=0;sessionXP=0;lastXPGain=0;playerHP=100;enemyHP=100;wrongCombo=0;answered=false;selectedAnswer=null;flagged=new Set();timerDuration=0;timerSeconds=0;timerDeadline=0;
  clearSession();show("quiz");renderQuestion();startTimer();
}
$("quickWrongBtn").onclick=practiceWrong;

/* ===== v31 premium study engine: Smart Review / spaced repetition ===== */
function reviewPriority(item){
  const wrong=Number(item?.wrong||1);
  const last=new Date(item?.lastWrong||0).getTime();
  const ageDays=Number.isFinite(last)&&last>0 ? Math.max(0,(Date.now()-last)/86400000) : 30;
  // More errors = higher priority; older errors gradually rise again.
  return wrong*4 + Math.min(ageDays,14)*0.55;
}
function getSmartReviewRows(limit=10){
  return get(KEY.wrong,[])
    .filter(q=>q && q.jawabanBenar!=null && resolveQuestionRef(q.id))
    .sort((a,b)=>reviewPriority(b)-reviewPriority(a))
    .slice(0,limit);
}
function startSmartReview(){
  const rows=getSmartReviewRows(15);
  if(!rows.length){showToast('Belum ada soal yang perlu direview. Kerjakan kuis dulu.');return;}
  quiz=rows.map(q=>{
    const ref=resolveQuestionRef(q.id);
    return ref?rawToQuiz(ref.bankId,ref.idx):null;
  }).filter(Boolean);
  if(!quiz.length){showToast('Soal review tidak tersedia di bank saat ini.');return;}
  selectedBank=quiz[0]?.bank||selectedBank;selectedCount=quiz.length;pos=0;score=0;streak=0;sessionXP=0;lastXPGain=0;playerHP=100;enemyHP=100;wrongCombo=0;answered=false;selectedAnswer=null;flagged=new Set();timerDuration=0;timerSeconds=0;timerDeadline=0;
  clearSession();show('quiz');renderQuestion();startTimer();
}
function renderSmartReview(){
  const rows=getSmartReviewRows(6), box=$('smartReviewList'), summary=$('smartReviewSummary');
  if(!box)return;
  if(summary)summary.textContent=rows.length?`${rows.length} prioritas review • soal dengan error berulang muncul lebih dulu`:'Belum ada soal yang perlu direview.';
  box.innerHTML=rows.length?rows.map((q,i)=>`<div class="smart-review-row"><div><b>${i+1}. ${esc(q.soal)}</b><small>${esc(BANKS[q.bank]?.name||q.bank||'Soal')} • salah ${Number(q.wrong||1)}×</small></div><span>${Math.round(reviewPriority(q))}</span></div>`).join(''):`<div class="empty">Belum ada review prioritas. Latihan dulu, lalu CLINED akan menyusun antreannya otomatis.</div>`;
}

// Keyboard shortcuts make desktop study sessions faster without changing mobile behavior.
document.addEventListener("keydown",e=>{
  if(!$('quiz')?.classList.contains('active'))return;
  if(e.target?.matches("input,textarea,select"))return;
  const n=Number(e.key);
  if(!answered && n>=1 && n<=9 && n<=quiz[pos].opsi.length){e.preventDefault();answer(n-1);return;}
  if(e.key.toLowerCase()==="b"){e.preventDefault();toggleBookmark(quiz[pos].id);updateFlagUI();return;}
  if(e.key==="Enter" && answered){e.preventDefault();$("nextBtn").click();}
});

window.addEventListener("beforeunload",saveSession);
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"){
    saveSession();
    stopTimer();
  }else if($("quiz").classList.contains("active") && quiz.length && !answered){
    updateTimerUI();
    startTimer();
  }
});

/* ===== v17 additive study upgrades ===== */
const ENH={flash:[],flashPos:0,flashShown:false};
function todayKey(){
  const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dailyAnswered(){
  const key=todayKey(), h=get(KEY.hist,[]);
  return h.filter(x=>dateKey(x.date)===key).reduce((n,x)=>n+Number(x.validTotal||0),0);
}
function renderDailyMission(){
  const done=Math.min(20,dailyAnswered()), pct=Math.round(done/20*100);
  const markup=`<div class="mission-top"><b>🎯 Misi hari ini · 20 soal</b><span class="mission-count">${done}/20</span></div><div class="mission-track"><i style="width:${pct}%"></i></div><small class="muted">${done>=20?"Misi selesai!🔥":"Sedikit lagi.Konsistensi>maraton."}</small>`;
  if($("dailyMission"))$("dailyMission").innerHTML=markup;
  if($("dailyHomeCard"))$("dailyHomeCard").innerHTML=markup;
}
function rawToQuiz(bankId,idx){
  const bank=BANKS[bankId]?.data||[], q=bank[idx]; if(!q)return null;
  const order=shuffle(q.opsi.map((_,i)=>i));
  return {id:qid(bankId,idx,q),bank:bankId,source:q.source||BANKS[bankId].name,no:q.no||idx+1,soal:q.soal,
    opsi:order.map(i=>q.opsi[i]),jawabanBenar:q.jawabanBenar==null?null:order.indexOf(q.jawabanBenar),
    pembahasan:q.pembahasan,pembahasanPilihan:order.map(i=>(q.pembahasanPilihan&&q.pembahasanPilihan[i])||q.pembahasan||"Belum ada pembahasan khusus untuk opsi ini."),
    catatanKlinis:q.catatanKlinis||"",incomplete:!!q.incomplete,selectedAnswer:null};
}
function resolveQuestionRef(id){
  const raw=String(id||"");
  for(const [bankId,b] of Object.entries(BANKS)){
    const idx=b.data.findIndex((q,i)=>qid(bankId,i,q)===raw||q.id===raw||`${bankId}-${q.id||""}`===raw||`${bankId}-${q.no||i+1}`===raw);
    if(idx>=0)return {bankId,idx,q:b.data[idx]};
  }
  return null;
}
function startSingleQuestion(bankId,idx){
  const q=rawToQuiz(bankId,idx); if(!q)return;
  selectedBank=bankId;selectedCount=1;quiz=[q];pos=0;score=0;streak=0;sessionXP=0;lastXPGain=0;playerHP=100;enemyHP=100;wrongCombo=0;answered=false;selectedAnswer=null;flagged=new Set();timerDuration=0;timerSeconds=0;timerDeadline=0;
  clearSession();show("quiz");renderQuestion();startTimer();
}
function startBookmarkDrill(){
  const ids=get(KEY.book,[]),rows=[];
  ids.forEach(id=>{const ref=resolveQuestionRef(id);if(ref)rows.push(rawToQuiz(ref.bankId,ref.idx));});
  if(!rows.length){alert("Belum ada soal bookmark yang bisa ditemukan.Simpan beberapa soal dulu.");return;}
  quiz=shuffle(rows).slice(0,Math.min(20,rows.length));selectedCount=quiz.length;selectedBank=quiz[0].bank;pos=0;score=0;streak=0;sessionXP=0;playerHP=100;enemyHP=100;wrongCombo=0;answered=false;selectedAnswer=null;flagged=new Set();timerDuration=0;timerSeconds=0;timerDeadline=0;
  clearSession();show("quiz");renderQuestion();startTimer();
}

function renderBookmarks(){
  const ids=get(KEY.book,[]),w=$("bookmarkList");
  if(!ids.length){w.innerHTML='<div class="empty">Belum ada soal yang disimpan.</div>';return}
  w.innerHTML=ids.map(id=>{
    const ref=resolveQuestionRef(id); if(!ref)return "";
    const q=ref.q;
    return `<div class="list-item"><div><b>${esc(BANKS[ref.bankId].name)} • Soal ${q.no||ref.idx+1}</b><br>${esc(q.soal)}</div><button class="bookmark" data-id="${esc(id)}">★</button></div>`;
  }).join("");
  if(!w.innerHTML)w.innerHTML='<div class="empty">Bookmark lama tidak ditemukan di bank saat ini.</div>';
  w.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>{toggleBookmark(x.dataset.id);renderBookmarks();renderCounts()});
}
function startSmart10(){
  const candidates=[];
  Object.entries(BANKS).forEach(([bankId,b])=>b.data.forEach((q,i)=>{if(q?.opsi?.length>=2)candidates.push(rawToQuiz(bankId,i));}));
  quiz=shuffle(candidates).slice(0,10);selectedCount=quiz.length;selectedBank=quiz[0]?.bank||"utama";pos=0;score=0;streak=0;sessionXP=0;playerHP=100;enemyHP=100;wrongCombo=0;answered=false;selectedAnswer=null;flagged=new Set();timerDuration=0;timerSeconds=0;timerDeadline=0;
  clearSession();show("quiz");renderQuestion();startTimer();
}
function initFlashcards(){
  const source=(BANKS[selectedBank]?.data||[]).filter(q=>q?.soal&&q?.opsi?.length);
  ENH.flash=shuffle(source).slice(0,Math.min(30,source.length));ENH.flashPos=0;ENH.flashShown=false;renderFlashcard();show("flashcards");
}
function renderFlashcard(){
  const q=ENH.flash[ENH.flashPos];if(!q)return;
  $("flashProgress").textContent=`${ENH.flashPos+1}/${ENH.flash.length}`;
  $("flashQuestion").textContent=q.soal;
  $("flashBack").hidden=!ENH.flashShown;
  $("flashAnswer").innerHTML=ENH.flashShown
    ? `<strong>${letter(q.jawabanBenar)}. ${esc(q.opsi[q.jawabanBenar]||"Kunci belum tersedia")}</strong><br><br>${esc(q.pembahasan||"Belum ada pembahasan khusus.")}`
    : "";
  $("flashRevealBtn").textContent=ENH.flashShown?"Sembunyikan Jawaban":"Tampilkan Jawaban";
}
function renderLibrary(){
  const query=String($("librarySearch")?.value||"").trim().toLowerCase(), filter=$("libraryBank")?.value||"all";
  const pools=Object.entries(BANKS).filter(([id])=>filter==="all"||id===filter);
  const results=[];
  pools.forEach(([bankId,b])=>b.data.forEach((q,idx)=>{
    const hay=[q.soal,q.pembahasan,...(q.opsi||[])].join("").toLowerCase();
    if(!query||hay.includes(query))results.push({bankId,idx,q});
  }));
  const limited=results.slice(0,60);
  $("librarySummary").textContent=query?`${results.length} hasil • menampilkan ${limited.length}`:`${results.length} soal tersedia`;
  $("libraryResults").innerHTML=limited.length?limited.map(x=>`<article class="library-result"><div class="library-result-head"><b>${esc(BANKS[x.bankId].name)} • Soal ${x.q.no||x.idx+1}</b><small>Kunci ${x.q.jawabanBenar==null?"—":letter(x.q.jawabanBenar)}</small></div><p>${esc(x.q.soal)}</p><div class="library-answer">${esc(x.q.pembahasan||"Belum ada pembahasan khusus.")}</div><button class="secondary small-btn library-start" data-bank="${x.bankId}" data-idx="${x.idx}">▶ Latihan soal ini</button></article>`).join(""):'<div class="empty">Tidak ditemukan. Coba kata kunci lain.</div>';
  document.querySelectorAll(".library-start").forEach(b=>b.onclick=()=>startSingleQuestion(b.dataset.bank,Number(b.dataset.idx)));
}
function renderQuestionNav(){
  const box=$("questionNav");if(!box||!quiz.length)return;
  box.innerHTML=quiz.map((q,i)=>{
    const done=q.selectedAnswer!==undefined&&q.selectedAnswer!==null;
    const fl=flagged.has(q.id);
    return `<button class="qnav-btn ${i===pos?"current":""}${done?"done":""}${fl?"flagged":""}" data-pos="${i}" title="Soal ${i+1}">${i+1}</button>`;
  }).join("");
  box.querySelectorAll(".qnav-btn").forEach(b=>b.onclick=()=>goToQuestion(Number(b.dataset.pos)));
}
const _renderQuestionV17=renderQuestion;
renderQuestion=function(resume=false){_renderQuestionV17(resume);renderQuestionNav();syncNavVisibility();};
function setNavVisible(visible){
  const box=$("questionNav"),wrap=$("questionNavWrap");
  if(!box)return;
  // Saat ditutup, seluruh panel navigasi ikut hilang.
  // Tombol navigasi di header tetap ada untuk membukanya kembali.
  box.hidden=!visible;
  if(wrap){
    wrap.hidden=!visible;
    wrap.classList.toggle("nav-closed",!visible);
  }
  const t=$("questionNavToggle");
  if(t){
    const arrow=t.querySelector("span:last-child");
    if(arrow)arrow.textContent=visible?"⌃":"⌄";
  }
  const hb=$("headerNavBtn");
  if(hb){
    hb.textContent=visible?"☷":"☰";
    hb.setAttribute("aria-pressed",String(visible));
    hb.setAttribute("aria-label",visible?"Tutup navigasi soal":"Buka navigasi soal");
  }
  set(KEY.navVisible,!!visible);
}
function syncNavVisibility(){setNavVisible(get(KEY.navVisible,true)!==false)}
if($("questionNavToggle"))$("questionNavToggle").onclick=()=>setNavVisible($("questionNav")?.hidden===true);
if($("headerNavBtn"))$("headerNavBtn").onclick=()=>{
  if($("quiz")?.classList.contains("active")) setNavVisible($("questionNav")?.hidden===true);
};

const CURRENT_BLOCK_KEY = "alpha5_current_block_v1";
const LAST_WORKED_BLOCK_KEY = "alpha5_last_worked_block_v1";
const DASHBOARD_BLOCK_KEY = "alpha5_dashboard_block_v1";
function getCurrentBlockId(){ return localStorage.getItem(CURRENT_BLOCK_KEY) || "SSP"; }
function setCurrentBlockId(id){ localStorage.setItem(CURRENT_BLOCK_KEY, id || "SSP"); }
function getLastWorkedBlock(){ return localStorage.getItem(LAST_WORKED_BLOCK_KEY) || "SSP"; }
function setLastWorkedBlock(id){
  const block=id||"SSP";
  localStorage.setItem(LAST_WORKED_BLOCK_KEY,block);
  localStorage.setItem(DASHBOARD_BLOCK_KEY,block);
}
function blockForBank(bankId){
  const explicit=get('alpha5_bank_block_map_v1',{});
  if(explicit[bankId]) return explicit[bankId];
  const meta=BANKS?.[bankId]?.block;
  if(meta) return String(meta).replace(/^BLOK\s+/i,'').toUpperCase();
  if(['utama','pulmonis','arsip2021'].includes(bankId)) return 'SSP';
  const k=String(bankId||'').toLowerCase();
  if(k.includes('kedkom')) return 'KEDKOM';
  if(k.includes('kedkel')) return 'KEDKEL';
  if(k.includes('mulsis')) return 'MULSIS';
  return 'OTHER';
}
function blockLabel(block){ return String(block||'SSP').replace(/^BLOK\s+/i,'').toUpperCase(); }
function workedBlockIds(){
  const found=new Set();
  const hist=get(KEY.hist,[]);
  for(const h of hist){ const b=blockForBank(h?.bank); if(b && b!=='OTHER') found.add(b); }
  const qstats=get(KEY.qstats,{});
  for(const v of Object.values(qstats||{})){ const b=blockForBank(v?.bank); if(b && b!=='OTHER') found.add(b); }
  const last=getLastWorkedBlock(); if(last && last!=='OTHER') found.add(last);
  // Keep SSP available as the initial/default block for a fresh install.
  if(!found.size) found.add('SSP');
  const order=['SSP','KEDKOM','KEDKEL','MULSIS'];
  return [...found].sort((a,b)=>{
    const ia=order.indexOf(a),ib=order.indexOf(b);
    return (ia<0?999:ia)-(ib<0?999:ib) || a.localeCompare(b);
  });
}
function dashboardBlock(){
  const options=workedBlockIds();
  const saved=localStorage.getItem(DASHBOARD_BLOCK_KEY);
  if(saved && options.includes(saved)) return saved;
  const last=getLastWorkedBlock();
  return options.includes(last)?last:options[0];
}
function setDashboardBlock(id){
  const options=workedBlockIds();
  const block=options.includes(id)?id:(options.includes(getLastWorkedBlock())?getLastWorkedBlock():options[0]||'SSP');
  localStorage.setItem(DASHBOARD_BLOCK_KEY,block);
  return block;
}
function renderDashboardBlockOptions(){
  const options=workedBlockIds();
  const selected=setDashboardBlock(dashboardBlock());
  const html=options.map(block=>`<option value="${esc(block)}">${esc(blockLabel(block))}</option>`).join('');
  ['dashboardStatScope','dashboardDetailStatScope'].forEach(id=>{
    const el=$(id); if(!el)return;
    el.innerHTML=html;
    el.value=selected;
  });
}
function currentBlockStatsScope(){ return dashboardBlock(); }
function blockResetMap(){return get('alpha5_block_stat_reset_v1',{});}
function qstatsForScope(scope='current'){
  const all=get(KEY.qstats,{}), resets=blockResetMap();
  const block=scope==='all'?null:(scope||dashboardBlock()), since=Number(block?resets[block]||0:0);
  if(scope==='all') return all;
  const out={};
  for(const [id,v] of Object.entries(all)){
    if(blockForBank(v?.bank)===block && (!since || Date.parse(v.lastAnswered||'')>=since)) out[id]=v;
  }
  return out;
}
function resetCurrentBlockStatistics(){
  const block=currentBlockStatsScope();
  const resets=blockResetMap();
  resets[block]=Date.now();
  set('alpha5_block_stat_reset_v1',resets);
  renderHomeClinicalDashboard();
  if($('dashboardRadarChart')) renderClinicalDashboard();
  const btn=$('resetBlockStatsBtn');
  if(btn){const old=btn.textContent;btn.textContent=`${blockLabel(block)} direset ✓`;setTimeout(()=>btn.textContent=old,1400);}
}
function abilityQuestionTotals(scope="current"){
  const totals=Object.fromEntries(ABILITIES.map(a=>[a,0]));
  const block=scope==='all'?null:(scope||dashboardBlock());
  for(const [bankId,bankObj] of Object.entries(BANKS||{})){
    if(scope!=="all" && blockForBank(bankId)!==block) continue;
    for(const q of (bankObj.data||[])){
      const c=String(q?.komponenStatistik||"");
      if(ABILITIES.includes(c)) totals[c]++;
    }
  }
  return totals;
}

function clinicalAbilityStats(scope='current'){
  const qs=qstatsForScope(scope);
  const totals=abilityQuestionTotals(scope);
  const evidence=Object.fromEntries(ABILITIES.map(a=>[a,{attempts:0,correct:0,wrong:0}]));
  for(const v of Object.values(qs)){
    const attempts=Number(v?.attempts||0),correct=Number(v?.correct||0),wrong=Number(v?.wrong||0);
    const weights=v?.weights||{};
    for(const ability of ABILITIES){
      const w=Number(weights[ability]||0); if(!w) continue;
      evidence[ability].attempts+=attempts*w;
      evidence[ability].correct+=correct*w;
      evidence[ability].wrong+=wrong*w;
    }
  }
  return ABILITIES.map(ability=>{
    const e=evidence[ability], attempts=Number(e.attempts||0), total=Number(totals[ability]||0);
    if(!attempts) return [ability,0,0,total];
    const raw=100*Number(e.correct||0)/attempts;
    return [ability,Math.round(Math.max(0,Math.min(100,raw))),Math.round(attempts),total];
  });
}
function renderRadarChart(targetId='homeRadarChart',legendId='radarLegend',scope=null){
  const target=$(targetId); if(!target)return;
  const selectedScope=scope||$('dashboardStatScope')?.value||dashboardBlock();
  const stats=clinicalAbilityStats(selectedScope);
  const labels=stats.map(x=>x[0]), values=stats.map(x=>Math.max(0,Math.min(100,x[1])));
  const W=320,H=300,cx=160,cy=146,R=96,n=6;
  const pt=(r,i)=>{const a=(-Math.PI/2)+(i*2*Math.PI/n);return [cx+Math.cos(a)*r,cy+Math.sin(a)*r]};
  const poly=(r)=>Array.from({length:n},(_,i)=>pt(r,i).map(v=>v.toFixed(1)).join(',')).join(' ');
  const dataPoly=values.map((v,i)=>pt(R*v/100,i).map(x=>x.toFixed(1)).join(',')).join(' ');
  let svg=`<svg viewBox="0 0 ${W}${H}" role="img" aria-label="Grafik radar kemampuan klinis">`;
  [R,R*.75,R*.5,R*.25].forEach(r=>svg+=`<polygon points="${poly(r)}" class="radar-grid"></polygon>`);
  for(let i=0;i<n;i++){const [x,y]=pt(R,i),[lx,ly]=pt(R+22,i);svg+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="radar-axis"></line><text x="${lx}" y="${ly}" class="radar-label" text-anchor="middle" dominant-baseline="middle">${esc(labels[i])}</text>`;}
  svg+=`<polygon points="${dataPoly}" class="radar-data"></polygon>`;
  values.forEach((v,i)=>{const [x,y]=pt(R*v/100,i);svg+=`<circle cx="${x}" cy="${y}" r="4" class="radar-dot"></circle>`});
  svg+='</svg>';
  target.innerHTML=svg;
  const legend=$(legendId); if(legend) legend.innerHTML=stats.map(([name,val,attempts,total])=>`<div class="radar-score"><span>${esc(name)}<small>${attempts?attempts+"/"+total+"soal•"+val+"%akurasi":"0/"+total+"soal•Belum ada data"}</small></span><b>${attempts?val+"%":"—"}</b></div>`).join('');
}
function ensureHomeDashboardControls(){
  const panel=$("homeClinicalDashboard"); if(!panel)return;
  // Controls already exist in the home dashboard HTML. Do not inject a second copy.
  const controls=panel.querySelector('.dashboard-stat-controls');
  if(!controls)return;
  renderDashboardBlockOptions();
  if(!$('resetBlockStatsBtn'))return;
}

function renderHomeClinicalDashboard(){
  ensureHomeDashboardControls();
  renderDashboardBlockOptions();
  renderRadarChart('homeRadarChart','radarLegend',dashboardBlock());
}

function renderClinicalDashboard(){
  renderDashboardBlockOptions();
  const hist=get(KEY.hist,[]);
  const xp=Number(get(KEY.xp,0))||0;
  const wrong=get(KEY.wrong,{});
  const total=hist.reduce((a,h)=>a+(Number(h.total)||0),0);
  const correct=hist.reduce((a,h)=>a+(Number(h.correct)||0),0);
  const acc=total?Math.round(correct/total*100):0;
  const today=new Date().toISOString().slice(0,10);
  const todayCount=hist.filter(h=>String(h.date||h.timestamp||'').slice(0,10)===today).reduce((a,h)=>a+(Number(h.total)||0),0);
  const mission={target:20,done:todayCount};
  renderRadarChart('dashboardRadarChart','dashboardRadarLegend',dashboardBlock());
  if($('dashboardMission'))$('dashboardMission').innerHTML=`<div><b>🎯 Misi Hari Ini</b><span>${Math.min(mission.done,mission.target)}/${mission.target} soal</span></div><div class="mission-track"><i style="width:${Math.min(100,mission.done/mission.target*100)}%"></i></div><small>${mission.done>=mission.target?'Misi selesai. Pertahankan momentum!':`Kurang ${mission.target-mission.done} soal lagi.`}</small>`;
  if($('dashboardStats'))$('dashboardStats').innerHTML=[['⚡',xp+' XP','Clinical XP'],['📚',hist.length,'Sesi'],['🎯',acc+'%','Akurasi'],['📝',todayCount,'Soal hari ini']].map(x=>`<div class="dashboard-stat"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');
  const wrongEntries=Object.entries(wrong||{}).sort((a,b)=>(b[1]?.wrong||0)-(a[1]?.wrong||0)).slice(0,3);
  const rec=wrongEntries.length?wrongEntries.map(([id,v])=>`<div class="recommend-card"><b>🔁 Review soal ${esc(id)}</b><small>${Number(v?.wrong||0)}× salah • jadikan target review</small></div>`).join(''):`<div class="recommend-card"><b>🧠 Mulai Smart 10</b><small>Latihan campuran untuk membangun clinical recall.</small></div>`;
  if($('dashboardRecommendations'))$('dashboardRecommendations').innerHTML=rec+`<button class="primary" id="dashboardSmartBtn">⚡ Mulai Smart 10</button>`;
  $('dashboardSmartBtn')?.addEventListener('click',startSmart10);
}

if($("backFromGoogleDrive"))$("backFromGoogleDrive").onclick=()=>show("home");
function syncUabStats(){
  const streak=Number(localStorage.getItem("clined_streak")||localStorage.getItem("streak")||0);
  const xp=Number(localStorage.getItem("clined_xp")||localStorage.getItem("xp")||0);
  const gems=Number(localStorage.getItem("clined_gems")||localStorage.getItem("gems")||0);
  const a=document.getElementById("uabStreakStat"),b=document.getElementById("uabXpStat"),c=document.getElementById("uabGemStat");
  if(a)a.textContent=streak; if(b)b.textContent=xp; if(c)c.textContent=gems;
}

/* UPI Flash Card — per-block active recall + spaced repetition. */
const UPI_BLOCKS=[
  {id:'SSP',name:'SSP',icon:'🧠',desc:'Sistem saraf & perilaku'},
  {id:'KEDKOM',name:'Kedokteran Komunitas',icon:'🏥',desc:'Kesehatan masyarakat'},
  {id:'KEDKEL',name:'Kedokteran Keluarga',icon:'👨‍👩‍👧',desc:'Keluarga & layanan primer'},
  {id:'MULSIS',name:'Mulsis',icon:'🧩',desc:'Muskuloskeletal & sistemik'},
  {id:'MUSKULOSKELETAL',name:'Muskuloskeletal',icon:'🦴',desc:'Tulang, sendi & otot'},
  {id:'RESPIRATORY',name:'Respiratory',icon:'🫁',desc:'Sistem pernapasan'},
  {id:'KARDIOLOGI',name:'Kardiologi',icon:'❤️',desc:'Jantung & pembuluh darah'},
  {id:'HEMATOLOGI',name:'Hematologi',icon:'🩸',desc:'Darah & kelainan hematologi'},
  {id:'GIT',name:'Gastrointestinal',icon:'🫃',desc:'Saluran cerna & hati'}
];
const UPI_FLASHCARDS=[];
const UPI_CUSTOM_KEY='clined_upi_custom_cards_v1';
const UPI_BLOCK_KEY='clined_upi_selected_block_v2';
const UPI_REVIEW_PREFIX='clined_upi_flashcards_block_v2_';
let upiSelectedBlock=localStorage.getItem(UPI_BLOCK_KEY)||'SSP';
let upiCurrentCard=null;
let upiCardRevealed=false;
function upiGetCustomCards(){const raw=get(UPI_CUSTOM_KEY,[]);return Array.isArray(raw)?raw.filter(c=>c&&c.id&&c.block&&c.prompt&&c.answer&&c.image):[];}
function upiSaveCustomCards(cards){set(UPI_CUSTOM_KEY,Array.isArray(cards)?cards:[]);}
function upiCompressImage(file,max=1800,quality=.82){return new Promise((resolve,reject)=>{if(!file){resolve(null);return;}const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const scale=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',quality));};im.onerror=reject;im.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});}
function upiCustomCard(card){return !!card&&String(card.id||'').startsWith('upi-custom-');}
function upiOpenImageZoom(src,alt='Gambar flashcard'){const m=$('upiImageZoomModal'),im=$('upiZoomImage');if(!m||!im||!src)return;im.src=src;im.alt=alt;im.style.transform='translate3d(0,0,0) scale(1)';m.hidden=false;m.setAttribute('aria-hidden','false');upiZoomInit();if(typeof stageResetZoom==='function')stageResetZoom();}
function upiCloseImageZoom(){const m=$('upiImageZoomModal');if(m){m.hidden=true;m.setAttribute('aria-hidden','true');}}
let stageResetZoom=null;
function upiZoomInit(){
  const stage=$('upiZoomStage'), im=$('upiZoomImage');
  if(!stage||!im||stage._zoomBound)return;
  stage._zoomBound=true;
  let scale=1,x=0,y=0,drag=false,pinch=false,startDist=0,startScale=1,startX=0,startY=0,lastX=0,lastY=0;
  const baseSize=()=>{
    const w=im.offsetWidth||im.naturalWidth||1;
    const h=im.offsetHeight||im.naturalHeight||1;
    return {w,h};
  };
  const clamp=()=>{
    scale=Math.max(1,Math.min(4,scale));
    if(scale===1){x=0;y=0;return;}
    const b=baseSize();
    const maxX=Math.max(0,(b.w*scale-stage.clientWidth)/2-8);
    const maxY=Math.max(0,(b.h*scale-stage.clientHeight)/2-8);
    x=Math.max(-maxX,Math.min(maxX,x));
    y=Math.max(-maxY,Math.min(maxY,y));
  };
  const render=()=>{
    clamp();
    im.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale})`;
  };
  stageResetZoom=()=>{scale=1;x=0;y=0;drag=false;pinch=false;render();};
  const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  stage.addEventListener('wheel',e=>{e.preventDefault();scale+=e.deltaY<0?.2:-.2;render();},{passive:false});
  stage.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||scale<=1)return;
    drag=true;startX=e.clientX;startY=e.clientY;lastX=x;lastY=y;stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag||scale<=1)return;e.preventDefault();x=lastX+(e.clientX-startX);y=lastY+(e.clientY-startY);render();
  });
  ['pointerup','pointercancel','pointerleave'].forEach(t=>stage.addEventListener(t,()=>{drag=false;}));
  stage.addEventListener('dblclick',e=>{e.preventDefault();scale=scale>1?1:2.5;x=0;y=0;render();});
  stage.addEventListener('touchstart',e=>{
    if(e.touches.length===2){pinch=true;drag=false;startDist=dist(e.touches[0],e.touches[1]);startScale=scale;}
    else if(e.touches.length===1&&scale>1){drag=true;startX=e.touches[0].clientX;startY=e.touches[0].clientY;lastX=x;lastY=y;}
  },{passive:false});
  stage.addEventListener('touchmove',e=>{
    if(e.touches.length===2&&pinch){e.preventDefault();const d=dist(e.touches[0],e.touches[1]);scale=startScale*(d/(startDist||d));render();}
    else if(e.touches.length===1&&drag&&scale>1){e.preventDefault();x=lastX+(e.touches[0].clientX-startX);y=lastY+(e.touches[0].clientY-startY);render();}
  },{passive:false});
  stage.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=false;if(e.touches.length===0)drag=false;},{passive:true});
  stage.addEventListener('touchcancel',()=>{pinch=false;drag=false;},{passive:true});
  window.addEventListener('resize',render,{passive:true});
  im.addEventListener('load',()=>{scale=1;x=0;y=0;render();});
  render();
}
function upiOpenEditQuestion(id){const card=upiGetCustomCards().find(c=>c.id===id);const m=$('upiEditQuestionModal');if(!card||!m)return;$('upiEditId').value=card.id;$('upiEditBlock').value=card.block;$('upiEditMaterial').value=card.material||'Histology';$('upiEditQuestion').value=card.prompt;$('upiEditAnswer').value=card.answer;$('upiEditImage').value='';const pv=$('upiEditImagePreview');pv.hidden=true;pv.innerHTML='<img alt="Preview gambar">';m.hidden=false;m.setAttribute('aria-hidden','false');}
function upiCloseEditQuestion(){const m=$('upiEditQuestionModal');if(m){m.hidden=true;m.setAttribute('aria-hidden','true');}}
async function upiSaveEditedQuestion(){const id=$('upiEditId')?.value,question=$('upiEditQuestion')?.value.trim(),answer=$('upiEditAnswer')?.value.trim(),material=$('upiEditMaterial')?.value,file=$('upiEditImage')?.files?.[0];if(!id||!question||!answer){showToast('Question dan Answer wajib diisi.');return;}const cards=upiGetCustomCards(),i=cards.findIndex(c=>c.id===id);if(i<0){upiCloseEditQuestion();return;}const previous=cards[i];cards[i]={...cards[i],prompt:question,answer,material};if(file){try{cards[i].image=await upiCompressImage(file,900,.7);}catch(e){showToast('Gambar gagal diproses.',true);return;}}const saved=upiSaveCustomCards(cards);if(!saved){showToast('Gagal menyimpan perubahan: penyimpanan penuh di perangkat ini. Hapus beberapa Question lama lalu coba lagi.',true);return;}const verify=upiGetCustomCards().find(c=>c.id===id);if(!verify||verify.prompt!==question){showToast('Gagal menyimpan perubahan. Coba lagi.',true);return;}upiCloseEditQuestion();upiRenderBlockSelector();upiEnsureDetailPages();UPI_BLOCKS.forEach(b=>upiBuildDetailPage(b));if(typeof upiBuildMaterialPage==='function'){const b=cards[i].block;['Histology','Patologi Anatomi'].forEach(mat=>{try{upiBuildMaterialPage(b,mat);}catch(e){}});}showToast('Question berhasil diperbarui.');}
function upiDeleteQuestion(id){const card=upiGetCustomCards().find(c=>c.id===id);if(!card)return;if(!confirm(`Hapus question "${card.prompt.slice(0,70)}${card.prompt.length>70?'…':''}"?`))return;upiSaveCustomCards(upiGetCustomCards().filter(c=>c.id!==id));Object.keys(localStorage).filter(k=>k.includes(card.id)).forEach(k=>localStorage.removeItem(k));upiCloseEditQuestion();upiRenderBlockSelector();upiEnsureDetailPages();UPI_BLOCKS.forEach(b=>upiBuildDetailPage(b));showToast('Question dihapus.');}
function upiCustomManagerHTML(block){const cards=upiGetCustomCards().filter(c=>c.block===block);if(!cards.length)return`<section class="upi-custom-manager card"><div class="section-title">Question saya</div><p class="upi-review-copy">Belum ada question custom di blok ini.</p></section>`;return`<section class="upi-custom-manager card"><div class="section-title">Question saya</div><div class="upi-custom-list">${cards.map(c=>`<div class="upi-custom-item"><button type="button" class="upi-custom-item-main" data-upi-edit-id="${esc(c.id)}"><span class="upi-custom-thumb"><img src="${esc(c.image)}" alt=""></span><span><b>${esc(c.prompt)}</b><small>${esc(c.material||'Materi')}</small></span><span class="upi-block-arrow">›</span></button><button type="button" class="upi-custom-item-delete" data-upi-del-id="${esc(c.id)}" aria-label="Hapus question" title="Hapus question">🗑</button></div>`).join('')}</div></section>`;}
function upiCardsForBlock(block){return UPI_FLASHCARDS.filter(c=>c.block===block).concat(upiGetCustomCards().filter(c=>c.block===block));}
function upiReviewKey(){return UPI_REVIEW_PREFIX+upiSelectedBlock;}
function upiGetReviews(){const raw=get(upiReviewKey(),{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}
function upiSaveReviews(v){set(upiReviewKey(),v);}
function upiEnsureReviews(){const reviews=upiGetReviews();let changed=false;upiCardsForBlock(upiSelectedBlock).forEach(card=>{if(!reviews[card.id]){reviews[card.id]={reps:0,interval:0,ease:2.5,dueAt:0,lapses:0,lastRating:null};changed=true;}});if(changed)upiSaveReviews(reviews);return reviews;}
function upiDue(card,review,now=Date.now()){return !review||!review.dueAt||review.dueAt<=now;}
function upiPickNextCard(){const cards=upiCardsForBlock(upiSelectedBlock),reviews=upiEnsureReviews(),now=Date.now();const ranked=cards.map(card=>({card,r:reviews[card.id]||{}})).sort((a,b)=>{const ad=upiDue(a.card,a.r,now),bd=upiDue(b.card,b.r,now);if(ad!==bd)return ad?-1:1;if((a.r.dueAt||0)!==(b.r.dueAt||0))return (a.r.dueAt||0)-(b.r.dueAt||0);return (a.r.reps||0)-(b.r.reps||0);});return ranked[0]?.card||cards[0]||null;}
function upiFormatDue(ts){if(!ts)return'Siap diulang';const diff=ts-Date.now();if(diff<=0)return'Siap diulang';const min=Math.ceil(diff/60000);if(min<60)return`${min} menit lagi`;const hrs=Math.ceil(min/60);if(hrs<24)return`${hrs} jam lagi`;return`${Math.ceil(hrs/24)} hari lagi`;}
function upiDetailId(block){return 'upiBlockPage_'+block;}
function upiPageEl(block){return document.getElementById(upiDetailId(block));}
function upiRenderBlockSelector(){const grid=$('upiBlockGrid');if(!grid)return;grid.innerHTML=UPI_BLOCKS.map(b=>{const count=upiCardsForBlock(b.id).length;const reviews=(()=>{const raw=get(UPI_REVIEW_PREFIX+b.id,{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};})();const due=upiCardsForBlock(b.id).filter(c=>upiDue(c,reviews[c.id],Date.now())).length;return`<article class="upi-block-choice duo-upi-block" data-upi-block="${b.id}" role="listitem" tabindex="0" aria-label="Buka blok ${esc(b.name)}"><span class="upi-block-icon">${b.icon}</span><span class="upi-block-copy"><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><em>${count} kartu${due?` • ${due} perlu diulang`:''}</em></span><span class="upi-block-arrow" aria-hidden="true">›</span></article>`;}).join('');grid.querySelectorAll('[data-upi-block]').forEach(card=>{const open=()=>upiOpenBlock(card.dataset.upiBlock);card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});}
function upiEnsureDetailPages(){if(document.querySelector('.upi-block-detail-pages'))return;const host=document.createElement('div');host.className='upi-block-detail-pages';host.setAttribute('aria-hidden','true');host.innerHTML=UPI_BLOCKS.map(b=>`<section id="${upiDetailId(b.id)}" class="view exam-page-view upi-page upi-block-detail" data-upi-detail-block="${b.id}"></section>`).join('');document.querySelector('main.app')?.appendChild(host);UPI_BLOCKS.forEach(b=>upiBuildDetailPage(b));}
function upiBuildDetailPage(b){const root=upiPageEl(b.id);if(!root)return;const cards=upiCardsForBlock(b.id),reviews=(()=>{const raw=get(UPI_REVIEW_PREFIX+b.id,{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};})();const due=cards.filter(c=>upiDue(c,reviews[c.id],Date.now())).length;root.innerHTML=`<div class="exam-page-header upi-header"><button class="back-link" type="button" data-upi-back>‹ UPI</button><div><div class="eyebrow">UPI • ${esc(b.name.toUpperCase())}</div><h2>${esc(b.name)}</h2><p>Pilih jenis materi yang ingin kamu pelajari.</p></div></div><section class="upi-owned-block card"><div class="upi-owned-head"><span class="upi-block-icon">${b.icon}</span><div><b>${esc(b.name)}</b><small>${cards.length} kartu • ${due} perlu diulang</small></div></div><div class="upi-owned-content"><button class="upi-owned-create" type="button" data-upi-create-question="${esc(b.id)}">＋ Create Question</button><div class="upi-owned-questions" data-upi-owned-list="${esc(b.id)}"></div></div></section><section class="upi-material-section"><div class="section-title">Pilih materi</div><p class="upi-review-copy">Setiap materi memiliki deck flash card dan progres repetisi sendiri.</p><div class="upi-material-grid"><article class="upi-material-node" data-upi-material="Histology" data-upi-block="${esc(b.id)}" data-upi-material-start="1" data-upi-material-start="1" role="button" tabindex="0"><span class="upi-material-icon">🔬</span><span><b>Histology</b><small>Gambaran mikroskopik jaringan</small></span><span class="upi-block-arrow">›</span></article><article class="upi-material-node" data-upi-material="Patologi Anatomi" data-upi-block="${esc(b.id)}" data-upi-material-start="1" data-upi-material-start="1" role="button" tabindex="0"><span class="upi-material-icon">🧬</span><span><b>Patologi Anatomi</b><small>Gambaran patologis jaringan dan organ</small></span><span class="upi-block-arrow">›</span></article></div></section>${upiCustomManagerHTML(b.id)}`;root.querySelector('[data-upi-back]')?.addEventListener('click',()=>show('upiPage'));root.querySelector('[data-upi-create-question]')?.addEventListener('click',()=>upiOpenCreateQuestion(b.id));root.querySelectorAll('[data-upi-material]').forEach(el=>{const open=()=>upiOpenMaterial(b.id,el.dataset.upiMaterial);el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});}
function upiMaterialPageId(block,material){return `upiMaterialPage_${String(block)}_${String(material).replace(/[^a-zA-Z0-9_-]/g,'-')}`;}
function upiEnsureMaterialPagesHost(){let host=document.querySelector('.upi-material-pages');if(!host){host=document.createElement('div');host.className='upi-material-pages';host.setAttribute('aria-hidden','true');document.querySelector('main.app')?.appendChild(host);}return host;}
function upiOpenMaterial(block,material){if(!UPI_BLOCKS.some(b=>b.id===block)||!material)return false;try{upiSelectedBlock=block;localStorage.setItem(UPI_BLOCK_KEY,block);upiEnsureDetailPages();const host=upiEnsureMaterialPagesHost();if(!host)return false;upiBuildMaterialPage(block,material);const id=upiMaterialPageId(block,material);if(!document.getElementById(id))return false;show(id);return true;}catch(e){console.error('UPI open material failed',e);showToast('UPI gagal dibuka. Coba buka ulang UPI.');return false;}}
function upiOpenFlashCard(block,material){return upiOpenMaterial(block,material);}
function upiOpenFlashcards(block,material){return upiOpenMaterial(block,material);}
function upiBuildMaterialPage(block,material){const id=upiMaterialPageId(block,material);let root=document.getElementById(id);if(!root){root=document.createElement('section');root.id=id;root.className='view exam-page-view upi-page upi-material-page';upiEnsureMaterialPagesHost().appendChild(root);}const b=UPI_BLOCKS.find(x=>x.id===block);const all=upiCardsForBlock(block);const cards=all.filter(c=>(c.material||'Histology')===material);const reviews=(()=>{const raw=get(UPI_REVIEW_PREFIX+block+'_'+material,{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};})();const due=cards.filter(c=>upiDue(c,reviews[c.id],Date.now())).length;root.innerHTML=`<div class="exam-page-header upi-header"><button class="back-link" type="button" data-upi-material-back>‹ ${esc(b.name)}</button><div><div class="eyebrow">UPI • ${esc(b.name.toUpperCase())} • ${esc(material.toUpperCase())}</div><h2>${esc(material)}</h2><p>Tebak gambar, buka jawaban, lalu nilai tingkat ingatanmu.</p></div></div><section class="upi-memory-overview card"><div class="upi-memory-head"><div><span class="upi-kicker">SPACED REPETITION</span><b>${esc(material)} • ${esc(b.name)}</b><small>Progres dan jadwal repetisi hanya berlaku untuk deck ini.</small></div><div class="upi-due-badge"><b data-upi-due>${due}</b><span>perlu diulang</span></div></div><div class="upi-memory-bars" data-upi-bars></div></section><section class="upi-flashcard card" aria-live="polite"><div class="upi-card-topline"><span data-upi-index>Kartu 1</span><span data-upi-topic>—</span></div><div class="upi-image-frame"><img data-upi-image src="assets/flashcards/heart.svg" alt="Ilustrasi medis untuk ditebak"><span class="upi-image-hint" data-upi-hint>TEBAK DULU</span></div><div class="upi-prompt"><span class="eyebrow">PERTANYAAN</span><h3 data-upi-prompt>—</h3></div><div class="upi-answer-wrap" data-upi-answer-wrap hidden><div class="upi-answer-label">JAWABAN</div><b data-upi-answer>—</b><p data-upi-explanation>—</p></div><div class="upi-reveal-link" data-upi-reveal tabindex="0" role="button">Buka jawaban <span>↗</span></div><div class="upi-rating" data-upi-rating hidden><div class="upi-rating-title">Seberapa kuat kamu mengingatnya?</div><div class="upi-rating-grid"><div class="upi-rate again" data-rating="again" role="button" tabindex="0"><b>Salah</b><small>ulang 10 menit</small></div><div class="upi-rate hard" data-rating="hard" role="button" tabindex="0"><b>Sulit</b><small>ulang lebih cepat</small></div><div class="upi-rate good" data-rating="good" role="button" tabindex="0"><b>Ingat</b><small>jeda bertambah</small></div><div class="upi-rate easy" data-rating="easy" role="button" tabindex="0"><b>Mudah</b><small>jeda panjang</small></div></div></div></section><section class="upi-review-panel card"><div class="section-title">🧠 Prioritas repetisi</div><p class="upi-review-copy">Kartu yang sering salah atau sudah jatuh tempo akan diprioritaskan.</p><div data-upi-review-list class="upi-review-list"></div></section>`;root.querySelector('[data-upi-material-back]')?.addEventListener('click',()=>show(upiDetailId(block)));root.querySelector('[data-upi-reveal]')?.addEventListener('click',()=>upiRevealMaterial(block,material));root.querySelector('[data-upi-reveal]')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();upiRevealMaterial(block,material);}});root.querySelectorAll('.upi-rate').forEach(el=>{const act=()=>upiRateMaterial(block,material,el.dataset.rating);el.addEventListener('click',act);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}});});upiRenderMaterial(block,material,upiPickMaterial(block,material));}
function upiEnsureMaterialReviews(block,material){const key=UPI_REVIEW_PREFIX+block+'_'+material,raw=get(key,{}),reviews=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};return reviews;}
function upiMaterialCards(block,material){return upiCardsForBlock(block).filter(c=>(c.material||'Histology')===material);}
function upiPickMaterial(block,material){const cards=upiMaterialCards(block,material),reviews=upiEnsureMaterialReviews(block,material),now=Date.now();return cards.map(card=>({card,r:reviews[card.id]||{}})).sort((a,b)=>{const ad=upiDue(a.card,a.r,now),bd=upiDue(b.card,b.r,now);if(ad!==bd)return ad?-1:1;return(a.r.dueAt||0)-(b.r.dueAt||0);})[0]?.card||cards[0]||null;}
function upiRenderMaterial(block,material,card){const root=document.getElementById(upiMaterialPageId(block,material));if(!root)return;const cards=upiMaterialCards(block,material),reviews=upiEnsureMaterialReviews(block,material),current=card||upiPickMaterial(block,material);root._upiCurrent=current;root._upiRevealed=false;const idx=Math.max(1,cards.findIndex(c=>c.id===current?.id)+1),setText=(sel,v)=>{const el=root.querySelector(sel);if(el)el.textContent=v;};setText('[data-upi-index]',current?`Kartu ${idx} / ${cards.length}`:'Belum ada kartu');setText('[data-upi-topic]',current?.topic||material);setText('[data-upi-prompt]',current?.prompt||`Belum ada kartu ${material} untuk blok ${block}.`);setText('[data-upi-answer]',current?.answer||'—');setText('[data-upi-explanation]',current?.explanation||'Tambahkan bank flash card untuk deck ini.');const img=root.querySelector('[data-upi-image]');if(img){img.src=current?.image||'assets/flashcards/heart.svg';img.alt=current?`Ilustrasi ${current.topic}`:'Belum ada kartu';img.style.cursor=current?'zoom-in':'default';img.onclick=()=>current&&upiOpenImageZoom(current.image,current.topic||'Gambar flashcard');}root.querySelector('[data-upi-answer-wrap]')?.setAttribute('hidden','');root.querySelector('[data-upi-rating]')?.setAttribute('hidden','');const reveal=root.querySelector('[data-upi-reveal]');if(reveal){reveal.hidden=!current;reveal.innerHTML='Buka jawaban <span>↗</span>';}setText('[data-upi-hint]',current?'TEBAK DULU':'BELUM ADA KARTU');const due=cards.filter(c=>upiDue(c,reviews[c.id],Date.now())).length;setText('[data-upi-due]',String(due));}
function upiRevealMaterial(block,material){const root=document.getElementById(upiMaterialPageId(block,material));if(!root||!root._upiCurrent)return;root._upiRevealed=true;root.querySelector('[data-upi-answer-wrap]')?.removeAttribute('hidden');root.querySelector('[data-upi-rating]')?.removeAttribute('hidden');root.querySelector('[data-upi-reveal]')?.setAttribute('hidden','');}
function upiRateMaterial(block,material,rating){const root=document.getElementById(upiMaterialPageId(block,material));if(!root||!root._upiCurrent||!root._upiRevealed)return;const card=root._upiCurrent,reviews=upiEnsureMaterialReviews(block,material),old=reviews[card.id]||{reps:0,interval:0,ease:2.5,lapses:0};const next={...old,lastRating:rating},day=86400000;if(rating==='again'){next.lapses=(old.lapses||0)+1;next.reps=0;next.interval=0;next.ease=Math.max(1.3,(old.ease||2.5)-0.2);next.dueAt=Date.now()+10*60000;}else if(rating==='hard'){next.reps=(old.reps||0)+1;next.ease=Math.max(1.5,(old.ease||2.5)-0.15);next.interval=Math.max(1,old.interval?Math.round(old.interval*1.2):1);next.dueAt=Date.now()+next.interval*day;}else if(rating==='good'){next.reps=(old.reps||0)+1;next.ease=Math.min(3.3,(old.ease||2.5)+0.05);next.interval=old.interval?Math.max(2,Math.round(old.interval*next.ease)):3;next.dueAt=Date.now()+next.interval*day;}else{next.reps=(old.reps||0)+1;next.ease=Math.min(3.5,(old.ease||2.5)+0.15);next.interval=old.interval?Math.max(4,Math.round(old.interval*next.ease*1.3)):7;next.dueAt=Date.now()+next.interval*day;}reviews[card.id]=next;set(UPI_REVIEW_PREFIX+block+'_'+material,reviews);showToast(rating==='again'?'Kartu akan diulang 10 menit lagi':`Kartu dijadwalkan ${next.interval} hari lagi`);upiRenderMaterial(block,material,upiPickMaterial(block,material));}
function upiPickNextCardForBlock(block){const cards=upiCardsForBlock(block),raw=get(UPI_REVIEW_PREFIX+block,{}),reviews=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},now=Date.now();return cards.map(card=>({card,r:reviews[card.id]||{}})).sort((a,b)=>{const ad=upiDue(a.card,a.r,now),bd=upiDue(b.card,b.r,now);if(ad!==bd)return ad?-1:1;if((a.r.dueAt||0)!==(b.r.dueAt||0))return(a.r.dueAt||0)-(b.r.dueAt||0);return(a.r.reps||0)-(b.r.reps||0);})[0]?.card||cards[0]||null;}
function upiRenderScoped(block,card){const root=upiPageEl(block);if(!root)return;upiEnsureReviewsForBlock(block);const cards=upiCardsForBlock(block),reviews=(()=>{const raw=get(UPI_REVIEW_PREFIX+block,{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};})();const current=card||upiPickNextCardForBlock(block);root._upiCurrent=current;root._upiRevealed=false;const idx=Math.max(1,cards.findIndex(c=>c.id===current?.id)+1);const setText=(sel,v)=>{const el=root.querySelector(sel);if(el)el.textContent=v;};setText('[data-upi-index]',current?`Kartu ${idx} / ${cards.length}`:'Belum ada kartu');setText('[data-upi-topic]',current?.topic||'Belum tersedia');setText('[data-upi-prompt]',current?.prompt||'Belum ada kartu untuk blok ini.');setText('[data-upi-answer]',current?.answer||'—');setText('[data-upi-explanation]',current?.explanation||'Tambahkan bank flash card untuk blok ini.');const img=root.querySelector('[data-upi-image]');if(img){img.src=current?.image||'assets/flashcards/heart.svg';img.alt=current?`Ilustrasi ${current.topic}`:'Belum ada kartu';img.style.cursor=current?'zoom-in':'default';img.onclick=()=>current&&upiOpenImageZoom(current.image,current.topic||'Gambar flashcard');}root.querySelector('[data-upi-answer-wrap]')?.setAttribute('hidden','');root.querySelector('[data-upi-rating]')?.setAttribute('hidden','');const reveal=root.querySelector('[data-upi-reveal]');if(reveal){reveal.hidden=!current;reveal.textContent='';reveal.innerHTML='Buka jawaban <span>↗</span>';}setText('[data-upi-hint]',current?'TEBAK DULU':'BELUM ADA KARTU');upiRenderScopedMemory(block);}
function upiEnsureReviewsForBlock(block){const raw=get(UPI_REVIEW_PREFIX+block,{}),reviews=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};let changed=false;upiCardsForBlock(block).forEach(card=>{if(!reviews[card.id]){reviews[card.id]={reps:0,interval:0,ease:2.5,dueAt:0,lapses:0,lastRating:null};changed=true;}});if(changed)set(UPI_REVIEW_PREFIX+block,reviews);return reviews;}
function upiRenderScopedMemory(block){const root=upiPageEl(block),cards=upiCardsForBlock(block),reviews=upiEnsureReviewsForBlock(block),now=Date.now();const counts={again:0,hard:0,good:0,easy:0};cards.forEach(c=>{const r=reviews[c.id];if(r?.lastRating&&counts[r.lastRating]!==undefined)counts[r.lastRating]++;});const due=cards.filter(c=>upiDue(c,reviews[c.id],now)).length;const dueEl=root?.querySelector('[data-upi-due]');if(dueEl)dueEl.textContent=due;const bars=root?.querySelector('[data-upi-bars]');if(bars)bars.innerHTML=[['again',counts.again,'Salah'],['hard',counts.hard,'Sulit'],['good',counts.good,'Ingat'],['easy',counts.easy,'Mudah']].map(x=>`<div class="upi-memory-bar"><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');const list=root?.querySelector('[data-upi-review-list]');if(!list)return;const ranked=cards.map(card=>({card,r:reviews[card.id]})).sort((a,b)=>{const ad=upiDue(a.card,a.r,now),bd=upiDue(b.card,b.r,now);if(ad!==bd)return ad?-1:1;return(a.r.dueAt||0)-(b.r.dueAt||0);});list.innerHTML=ranked.map(({card,r})=>`<div class="upi-review-item"><div class="mini-thumb"><img src="${card.image}" alt=""></div><div><b>${esc(card.answer)}</b><small>${esc(card.topic)} • ${r.reps||0}× direview</small></div><span class="upi-review-due">${upiDue(card,r,now)?'ULANG SEKARANG':upiFormatDue(r.dueAt)}</span></div>`).join('');}
function upiRevealScoped(block){const root=upiPageEl(block);if(!root||!root._upiCurrent||root._upiRevealed)return;root._upiRevealed=true;root.querySelector('[data-upi-answer-wrap]')?.removeAttribute('hidden');root.querySelector('[data-upi-rating]')?.removeAttribute('hidden');const reveal=root.querySelector('[data-upi-reveal]');if(reveal)reveal.hidden=true;const hint=root.querySelector('[data-upi-hint]');if(hint)hint.textContent='JAWABAN TERBUKA';}
function upiRateScoped(block,rating){const root=upiPageEl(block);if(!root||!root._upiCurrent||!root._upiRevealed)return;const card=root._upiCurrent,reviews=upiEnsureReviewsForBlock(block),old=reviews[card.id]||{reps:0,interval:0,ease:2.5,lapses:0};const next={...old,lastRating:rating},day=86400000;if(rating==='again'){next.lapses=(old.lapses||0)+1;next.reps=0;next.interval=0;next.ease=Math.max(1.3,(old.ease||2.5)-0.2);next.dueAt=Date.now()+10*60000;}else if(rating==='hard'){next.reps=(old.reps||0)+1;next.ease=Math.max(1.5,(old.ease||2.5)-0.15);next.interval=Math.max(1,old.interval?Math.round(old.interval*1.2):1);next.dueAt=Date.now()+next.interval*day;}else if(rating==='good'){next.reps=(old.reps||0)+1;next.ease=Math.min(3.3,(old.ease||2.5)+0.05);next.interval=old.interval?Math.max(2,Math.round(old.interval*next.ease)):3;next.dueAt=Date.now()+next.interval*day;}else{next.reps=(old.reps||0)+1;next.ease=Math.min(3.5,(old.ease||2.5)+0.15);next.interval=old.interval?Math.max(4,Math.round(old.interval*next.ease*1.3)):7;next.dueAt=Date.now()+next.interval*day;}reviews[card.id]=next;set(UPI_REVIEW_PREFIX+block,reviews);showToast(rating==='again'?'Kartu akan diulang 10 menit lagi':`Kartu dijadwalkan ${next.interval} hari lagi`);upiRenderScoped(block,upiPickNextCardForBlock(block));}
function upiOpenBlock(block){if(!UPI_BLOCKS.some(b=>b.id===block))return;upiSelectedBlock=block;localStorage.setItem(UPI_BLOCK_KEY,block);upiEnsureDetailPages();show(upiDetailId(block));}

function upiRenderMemory(){const cards=upiCardsForBlock(upiSelectedBlock),reviews=upiEnsureReviews(),now=Date.now();const counts={again:0,hard:0,good:0,easy:0},due=cards.filter(c=>upiDue(c,reviews[c.id],now)).length;Object.values(reviews).forEach(r=>{if(r.lastRating&&counts[r.lastRating]!==undefined)counts[r.lastRating]++;});const dueEl=$('upiDueCount');if(dueEl)dueEl.textContent=due;const bars=$('upiMemoryBars');if(bars)bars.innerHTML=[['again',counts.again,'Salah'],['hard',counts.hard,'Sulit'],['good',counts.good,'Ingat'],['easy',counts.easy,'Mudah']].map(x=>`<div class="upi-memory-bar"><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');const list=$('upiReviewList');if(!list)return;const ranked=cards.map(card=>({card,r:reviews[card.id]})).sort((a,b)=>{const ad=upiDue(a.card,a.r,now),bd=upiDue(b.card,b.r,now);if(ad!==bd)return ad?-1:1;return(a.r.dueAt||0)-(b.r.dueAt||0);});list.innerHTML=ranked.map(({card,r})=>`<div class="upi-review-item"><div class="mini-thumb"><img src="${card.image}" alt=""></div><div><b>${esc(card.answer)}</b><small>${esc(card.topic)} • ${r.reps||0}× direview</small></div><span class="upi-review-due">${upiDue(card,r,now)?'ULANG SEKARANG':upiFormatDue(r.dueAt)}</span></div>`).join('');}
function upiRenderCard(card){upiCurrentCard=card||upiPickNextCard();upiCardRevealed=false;const cards=upiCardsForBlock(upiSelectedBlock);const idx=Math.max(1,cards.findIndex(c=>c.id===upiCurrentCard?.id)+1);if($('upiCardIndex'))$('upiCardIndex').textContent=upiCurrentCard?`Kartu ${idx} / ${cards.length}`:'Belum ada kartu';if($('upiCardTopic'))$('upiCardTopic').textContent=upiCurrentCard?upiCurrentCard.topic:'Belum tersedia';if($('upiFlashImage')){$('upiFlashImage').src=upiCurrentCard?.image||'assets/flashcards/heart.svg';$('upiFlashImage').alt=upiCurrentCard?`Ilustrasi ${upiCurrentCard.topic}`:'Belum ada kartu';}if($('upiFlashPrompt'))$('upiFlashPrompt').textContent=upiCurrentCard?.prompt||'Belum ada kartu untuk blok ini.';if($('upiFlashAnswer'))$('upiFlashAnswer').textContent=upiCurrentCard?.answer||'—';if($('upiFlashExplanation'))$('upiFlashExplanation').textContent=upiCurrentCard?.explanation||'Tambahkan bank flash card untuk blok ini.';if($('upiAnswerWrap'))$('upiAnswerWrap').hidden=true;if($('upiRating'))$('upiRating').hidden=!upiCurrentCard;const reveal=$('upiRevealBtn');if(reveal){reveal.hidden=!upiCurrentCard;reveal.disabled=!upiCurrentCard;reveal.textContent='Buka jawaban';}const hint=document.querySelector('.upi-image-hint');if(hint)hint.textContent=upiCurrentCard?'TEBAK DULU':'BELUM ADA KARTU';upiRenderMemory();}
function upiReveal(){if(!upiCurrentCard||upiCardRevealed)return;upiCardRevealed=true;if($('upiAnswerWrap'))$('upiAnswerWrap').hidden=false;if($('upiRating'))$('upiRating').hidden=false;const reveal=$('upiRevealBtn');if(reveal)reveal.hidden=true;const hint=document.querySelector('.upi-image-hint');if(hint)hint.textContent='JAWABAN TERBUKA';}
function upiRate(rating){if(!upiCurrentCard||!upiCardRevealed)return;const reviews=upiEnsureReviews(),old=reviews[upiCurrentCard.id]||{reps:0,interval:0,ease:2.5,lapses:0};const next={...old,lastRating:rating};const day=86400000;if(rating==='again'){next.lapses=(old.lapses||0)+1;next.reps=0;next.interval=0;next.ease=Math.max(1.3,(old.ease||2.5)-0.2);next.dueAt=Date.now()+10*60000;}else if(rating==='hard'){next.reps=(old.reps||0)+1;next.ease=Math.max(1.5,(old.ease||2.5)-0.15);next.interval=Math.max(1,old.interval?Math.round(old.interval*1.2):1);next.dueAt=Date.now()+next.interval*day;}else if(rating==='good'){next.reps=(old.reps||0)+1;next.ease=Math.min(3.3,(old.ease||2.5)+0.05);next.interval=old.interval?Math.max(2,Math.round(old.interval*next.ease)):3;next.dueAt=Date.now()+next.interval*day;}else{next.reps=(old.reps||0)+1;next.ease=Math.min(3.5,(old.ease||2.5)+0.15);next.interval=old.interval?Math.max(4,Math.round(old.interval*next.ease*1.3)):7;next.dueAt=Date.now()+next.interval*day;}reviews[upiCurrentCard.id]=next;upiSaveReviews(reviews);showToast(rating==='again'?'Kartu akan diulang 10 menit lagi':`Kartu dijadwalkan ${next.interval} hari lagi`);upiRenderCard(upiPickNextCard());}

const CLINED_UAB_BLOCKS=[
  ['BM1','🦴'],['BM2','🧬'],['HNC','👂'],['MP1','🩺'],['MP2','💊'],['MPT','🧪'],
  ['MUSKULOSKELETAL','🦿'],['RESPIRATORY','🫁'],['KARDIOLOGI','❤️'],['HEMATOLOGI','🩸'],['GIT','🫃'],['FORENSIK','🔎'],
  ['GINJAL','🫘'],['ENDOKRINE','🧪'],['REPRODUKSI','🧬'],['SSP','🧠'],['PANCA INDRA','👁️'],['KEDKOM','🩺'],['KEDKEL','👨‍👩‍👧‍👦'],['MULSIS','🧬']
];
const CLINED_MATERIAL_URLS={
  'MUSKULOSKELETAL':'https://app.notion.com/p/MUSKULOSKELETAL-20e6dad3e9468010acd0e9083337e13e?pvs=39',
  'RESPIRATORY':'https://app.notion.com/p/RESPIRATORY-2a16dad3e94680e6824fd1aa0e6b4ee2?pvs=39',
  'KARDIOLOGI':'https://app.notion.com/p/KARDIOVASKULAR-2706dad3e94680719f45cf8c6c32dec9?pvs=39',
  'HEMATOLOGI':'https://app.notion.com/p/HEMATOLOGI-3046dad3e946807f9eabf61028a13e0c?pvs=39',
  'GIT':'https://app.notion.com/p/GIT-1d96dad3e946806084f0d01b78e2d2ab?pvs=39',
  'SSP':'https://app.notion.com/p/NEUROPSIKIATRI-3846dad3e94680bba27bdfa0450088d4?pvs=39'
};
function renderMaterialsPage(){
  const grid=document.getElementById('materialsBlockGrid'); if(!grid)return;
  const semesterGroups=[[1,0,3],[2,3,6],[3,6,9],[4,9,12],[5,12,15],[6,15,17],[7,17,20]];
  grid.innerHTML=semesterGroups.map(([semester,start,end])=>{
    const cards=CLINED_UAB_BLOCKS.slice(start,end).map(([name,icon],offset)=>{
      const i=start+offset,url=CLINED_MATERIAL_URLS[name];
      return `<button type="button" class="material-block-card${url?' has-material':''}" data-material-block="${esc(name)}" ${url?'':'aria-disabled="true"'}>
        <span class="material-block-number">${String(i+1).padStart(2,'0')}</span><span class="material-block-icon">${icon}</span>
        <span class="material-block-copy"><b>${esc(name)}</b><small>${url?'Materi tersedia':'Materi belum tersedia'}</small></span><span class="material-block-arrow">›</span>
      </button>`;
    }).join('');
    return `<section class="materials-semester" aria-labelledby="materialsSemester${semester}"><div class="materials-semester-divider" id="materialsSemester${semester}"><span>SEMESTER ${semester}</span></div><div class="materials-semester-track">${cards}</div></section>`;
  }).join('');
  document.getElementById('materialsBlockCount')?.replaceChildren(document.createTextNode(`${CLINED_UAB_BLOCKS.length} Blok`));
  grid.querySelectorAll('[data-material-block]').forEach(btn=>btn.addEventListener('click',()=>{
    const name=btn.dataset.materialBlock,url=CLINED_MATERIAL_URLS[name];
    if(url){window.open(url,'_blank','noopener,noreferrer');return;}
    showToast(`Materi ${name} belum tersedia.`);
  }));
}

function upiOpenCreateQuestion(defaultBlock){
  const modal=$('upiCreateQuestionModal'),form=$('upiCreateQuestionForm'); if(!modal||!form)return;
  const blockSelect=$('upiCreateBlock');
  if(blockSelect){blockSelect.value=UPI_BLOCKS.some(b=>b.id===defaultBlock)?defaultBlock:(upiSelectedBlock||'SSP');}
  form.reset();
  if(blockSelect)blockSelect.value=UPI_BLOCKS.some(b=>b.id===defaultBlock)?defaultBlock:(upiSelectedBlock||'SSP');
  const preview=$('upiCreateImagePreview');if(preview){preview.hidden=true;preview.innerHTML='<img alt="Preview gambar soal">';}
  modal.hidden=false;modal.setAttribute('aria-hidden','false');
}
function upiCloseCreateQuestion(){const modal=$('upiCreateQuestionModal');if(modal){modal.hidden=true;modal.setAttribute('aria-hidden','true');}}
function upiReadImageAsDataUrl(file){return new Promise((resolve,reject)=>{if(!file)return reject(new Error('Pilih gambar terlebih dahulu.'));if(!file.type.startsWith('image/'))return reject(new Error('File harus berupa gambar.'));if(file.size>8*1024*1024)return reject(new Error('Ukuran gambar maksimal 8 MB.'));const reader=new FileReader();reader.onerror=()=>reject(new Error('Gagal membaca gambar.'));reader.onload=()=>{const img=new Image();img.onload=()=>{const max=900,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);resolve(canvas.toDataURL('image/jpeg',.7));};img.onerror=()=>reject(new Error('Gambar tidak valid.'));img.src=reader.result;};reader.readAsDataURL(file);});}
function upiSaveCreatedQuestion(){
  const block=$('upiCreateBlock')?.value,material=$('upiCreateMaterial')?.value,imageFile=$('upiCreateImage')?.files?.[0],prompt=$('upiCreateQuestion')?.value.trim(),answer=$('upiCreateAnswer')?.value.trim();
  if(!block||!material||!imageFile||!prompt||!answer){showToast('Lengkapi gambar, question, dan answer.');return;}
  upiReadImageAsDataUrl(imageFile).then(image=>{
    const card={id:`upi-custom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,block,material,topic:'Custom Question',image,prompt,answer,explanation:'Pertanyaan buatan pengguna.'};
    const cards=upiGetCustomCards();cards.push(card);
    const saved=upiSaveCustomCards(cards);
    if(!saved){showToast('Gagal menyimpan: penyimpanan penuh di perangkat ini. Hapus beberapa Question lama lalu coba lagi.',true);return;}
    const verify=upiGetCustomCards().some(c=>c.id===card.id);
    if(!verify){showToast('Gagal menyimpan question. Coba lagi atau hapus question lama.',true);return;}
    upiCloseCreateQuestion();upiRenderBlockSelector();upiEnsureDetailPages();UPI_BLOCKS.forEach(b=>{const root=upiPageEl(b.id);if(root)upiBuildDetailPage(b);});if(upiSelectedBlock===block){const m=material;upiEnsureMaterialPagesHost();upiBuildMaterialPage(block,m);showToast('Question berhasil disimpan dan masuk ke deck '+m+'.');}else showToast('Question berhasil disimpan.');
  }).catch(err=>showToast(err?.message||'Gagal menyimpan gambar.'));
}
function initUpiFlashcards(){if(!$('upiPage'))return;upiRenderBlockSelector();upiEnsureDetailPages();}

if($("openUabPage"))$("openUabPage").onclick=()=>{syncUabStats();show("uabPage");if(typeof window.setFloatingNavActive==="function")window.setFloatingNavActive("uab");};
if($("openMaterialsPage"))$("openMaterialsPage").onclick=()=>{renderMaterialsPage();show("materialsPage");};
if($("backFromMaterials"))$("backFromMaterials").onclick=()=>show("home");
if($("openUpiPage"))$("openUpiPage").onclick=()=>{initUpiFlashcards();show("upiPage");};
if($("closeUpiCreateQuestion"))$("closeUpiCreateQuestion").onclick=upiCloseCreateQuestion;
if($("closeUpiZoom"))$("closeUpiZoom").onclick=upiCloseImageZoom;document.querySelector('[data-close-upi-zoom]')?.addEventListener('click',upiCloseImageZoom);
if($("closeUpiEditQuestion"))$("closeUpiEditQuestion").onclick=upiCloseEditQuestion;document.querySelector('[data-close-upi-edit]')?.addEventListener('click',upiCloseEditQuestion);
if($("upiEditQuestionForm"))$("upiEditQuestionForm").addEventListener('submit',e=>{e.preventDefault();upiSaveEditedQuestion();});
if($("deleteUpiQuestion"))$("deleteUpiQuestion").onclick=()=>upiDeleteQuestion($("upiEditId")?.value);
if($("upiEditImage"))$("upiEditImage").addEventListener('change',()=>{const f=$("upiEditImage").files?.[0],pv=$("upiEditImagePreview");if(!f){pv.hidden=true;return;}pv.innerHTML=`<img alt="Preview gambar" src="${URL.createObjectURL(f)}">`;pv.hidden=false;});
document.querySelector('[data-close-upi-question-modal]')?.addEventListener('click',upiCloseCreateQuestion);
if($("upiCreateQuestionForm"))$("upiCreateQuestionForm").addEventListener('submit',e=>{e.preventDefault();upiSaveCreatedQuestion();});
if($("upiCreateImage"))$("upiCreateImage").addEventListener('change',()=>{const file=$("upiCreateImage").files?.[0],preview=$("upiCreateImagePreview");if(!preview)return;if(!file){preview.hidden=true;return;}const url=URL.createObjectURL(file);preview.innerHTML=`<img src="${url}" alt="Preview gambar soal">`;preview.hidden=false;});
if($("backFromUab"))$("backFromUab").onclick=()=>show("home");
if($("backFromUpi"))$("backFromUpi").onclick=()=>show("home");
if($("openBlokMuskuloskeletal"))$("openBlokMuskuloskeletal").onclick=()=>{setCurrentBlockId("MUSKULOSKELETAL");show("blokMuskuloskeletalPage");};
if($("backFromMuskuloskeletal"))$("backFromMuskuloskeletal").onclick=()=>show("uabPage");
if($("openBlokRespiratory"))$("openBlokRespiratory").onclick=()=>{setCurrentBlockId("RESPIRATORY");show("blokRespiratoryPage");};
if($("backFromRespiratory"))$("backFromRespiratory").onclick=()=>show("uabPage");
if($("openBlokKardiologi"))$("openBlokKardiologi").onclick=()=>{setCurrentBlockId("KARDIOLOGI");show("blokKardiologiPage");};
if($("backFromKardiologi"))$("backFromKardiologi").onclick=()=>show("uabPage");
if($("openBlokHematologi"))$("openBlokHematologi").onclick=()=>{setCurrentBlockId("HEMATOLOGI");show("blokHematologiPage");};
if($("backFromHematologi"))$("backFromHematologi").onclick=()=>show("uabPage");
if($("openBlokGit"))$("openBlokGit").onclick=()=>{setCurrentBlockId("GIT");show("blokGitPage");};
if($("backFromGit"))$("backFromGit").onclick=()=>show("uabPage");
if($("openBlokSsp"))$("openBlokSsp").onclick=()=>{setCurrentBlockId("SSP");show("blokSspPage");};
if($("backFromSsp"))$("backFromSsp").onclick=()=>show("uabPage");
if($("openBlokKedkom"))$("openBlokKedkom").onclick=()=>{setCurrentBlockId("KEDKOM");show("blokKedkomPage");};
if($("backFromKedkom"))$("backFromKedkom").onclick=()=>show("uabPage");
if($("openBlokKedkel"))$("openBlokKedkel").onclick=()=>{setCurrentBlockId("KEDKEL");show("blokKedkelPage");};
if($("backFromKedkel"))$("backFromKedkel").onclick=()=>show("uabPage");
if($("openBlokMulsis"))$("openBlokMulsis").onclick=()=>{setCurrentBlockId("MULSIS");show("blokMulsisPage");};
document.querySelectorAll(".uab-node.locked-node").forEach(node=>node.addEventListener("click",()=>showToast(`${node.querySelector("b")?.textContent||"Blok"} belum tersedia. Segera hadir.`)));
if($("backFromMulsis"))$("backFromMulsis").onclick=()=>show("uabPage");
if($("studyToolsBtn"))$("studyToolsBtn").onclick=()=>{renderDailyMission();show("studyTools")};
if($("smartReviewBtn"))$("smartReviewBtn").onclick=()=>{renderSmartReview();show("smartReview")};
if($("smartReviewToolBtn"))$("smartReviewToolBtn").onclick=()=>{renderSmartReview();show("smartReview")};
if($("smartReviewStartBtn"))$("smartReviewStartBtn").onclick=startSmartReview;
if($("dashboardStatScope"))$("dashboardStatScope").addEventListener("change",()=>{
  setDashboardBlock($("dashboardStatScope").value);
  renderDashboardBlockOptions();
  renderHomeClinicalDashboard();renderClinicalDashboard();
});
if($("dashboardDetailStatScope"))$("dashboardDetailStatScope").addEventListener("change",()=>{
  setDashboardBlock($("dashboardDetailStatScope").value);
  renderDashboardBlockOptions();
  renderHomeClinicalDashboard();renderClinicalDashboard();
});
function confirmResetBlock(){
  const block=currentBlockStatsScope();
  if(confirm(`Reset statistik grafik untuk ${blockLabel(block)}? Statistik BLOK lain tidak akan berubah.`)) resetCurrentBlockStatistics();
}
if($("resetBlockStatsBtn"))$("resetBlockStatsBtn").onclick=confirmResetBlock;
if($("resetDetailBlockStatsBtn"))$("resetDetailBlockStatsBtn").onclick=confirmResetBlock;
if($("clinicalDashboardBtn"))$("clinicalDashboardBtn").onclick=()=>{
  if($("homeClinicalDashboard"))$("homeClinicalDashboard").hidden=false;
  setDashboardBlock(getLastWorkedBlock());
  renderHomeClinicalDashboard();
  renderClinicalDashboard();
  show("clinicalDashboard");
};
if($("openClinicalDashboard"))$("openClinicalDashboard").onclick=()=>{renderClinicalDashboard();show("clinicalDashboard")};
if($("minimizeClinicalDashboard"))$("minimizeClinicalDashboard").onclick=()=>{
  const body=$("homeClinicalDashboardBody"),btn=$("minimizeClinicalDashboard");
  if(!body)return;
  const collapsed=!body.hidden;
  body.hidden=collapsed;
  btn.textContent=collapsed?"+":"−";
  btn.title=collapsed?"Besarkan dashboard":"Kecilkan dashboard";
  btn.setAttribute("aria-label",btn.title);
};
if($("closeClinicalDashboard"))$("closeClinicalDashboard").onclick=()=>{
  const card=$("homeClinicalDashboard");
  if(card)card.hidden=true;
};
if($("flashcardsBtn"))$("flashcardsBtn").onclick=initFlashcards;
if($("bookmarkDrillBtn"))$("bookmarkDrillBtn").onclick=startBookmarkDrill;
if($("smart10Btn"))$("smart10Btn").onclick=startSmart10;
if($("libraryBtn"))$("libraryBtn").onclick=()=>{renderLibrary();show("library");setTimeout(()=>$("librarySearch")?.focus(),120)};
if($("librarySearch"))$("librarySearch").addEventListener("input",renderLibrary);
if($("libraryBank"))$("libraryBank").addEventListener("change",renderLibrary);
if($("flashRevealBtn"))$("flashRevealBtn").onclick=()=>{ENH.flashShown=!ENH.flashShown;renderFlashcard()};
if($("flashNextBtn"))$("flashNextBtn").onclick=()=>{if(!ENH.flash.length)return;ENH.flashPos=(ENH.flashPos+1)%ENH.flash.length;ENH.flashShown=false;renderFlashcard()};
if($("flashPrevBtn"))$("flashPrevBtn").onclick=()=>{if(!ENH.flash.length)return;ENH.flashPos=(ENH.flashPos-1+ENH.flash.length)%ENH.flash.length;ENH.flashShown=false;renderFlashcard()};
document.querySelectorAll("[data-study-home]").forEach(b=>b.onclick=()=>show("studyTools"));
syncAbilityCatalog();
renderDailyStreak();
renderDailyMission();
renderHomeClinicalDashboard();

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

syncNavVisibility();


function componentProgress(component){
  const qstats=get(KEY.qstats,{}), totals=abilityQuestionTotals('all');
  let answered=0, correct=0;
  for(const st of Object.values(qstats||{})){
    if(st?.primary!==component) continue;
    answered+=Number(st.attempts||0);
    correct+=Number(st.correct||0);
  }
  return {answered,correct,total:Number(totals[component]||0),accuracy:answered?Math.round(correct/answered*100):0};
}


/* Server-backed account security. Legacy device-only auth keys are retained only for safe migration/export filtering. */
const CLINED_AUTH_CONFIG={mode:'online',apiBaseUrl:'',endpoints:{}};
const AUTH_USERS_KEY='clined_auth_users_v1';
const AUTH_SESSION_KEY='clined_auth_session_v1';
let authBusy=false;

const ACCOUNT_KEY='clined_account_profile';
const ACCOUNT_AVATARS=['R','C','🧑‍⚕️','🩺','🧠','✚','A','M'];
function getAccount(){
  const name=get(KEY.characterName,'')||'';
  const saved=get(ACCOUNT_KEY,null);
  if(saved && typeof saved==='object') return {...saved,name:saved.name||name};
  const username=name?name.replace(/\s+/g,'').slice(0,24):'';
  return {name,username,avatar:name?name.trim().charAt(0).toUpperCase():'R'};
}
function renderLegacyAccountFields(){
  const a=getAccount();
  const nameEl=$('accountName'),userEl=$('accountUsername'),avatar=$('accountAvatar');
  if(nameEl)nameEl.value=a.name||''; if(userEl)userEl.value=a.username||''; if(avatar)avatar.textContent=a.avatar||'R';
}
async function saveAccount(){
  const name=String($('accountName')?.value||'').trim().slice(0,40);
  const username=String($('accountUsername')?.value||'').trim().slice(0,24);
  if(name.length<2){showToast('Nama minimal 2 karakter');return;}
  try{
    const data=await authApi('/profile',{method:'PATCH',body:JSON.stringify({name,username})});
    authServerUser=data.user;authSyncProfile(authServerUser);renderAccount();
    if(typeof beep==='function')beep('correct');showToast('Profil berhasil disimpan.');
  }catch(error){showToast(error?.message||'Profil tidak dapat disimpan.');}
}
function cycleAccountAvatar(){
  const a=getAccount(); const i=Math.max(0,ACCOUNT_AVATARS.indexOf(a.avatar)); const avatar=ACCOUNT_AVATARS[(i+1)%ACCOUNT_AVATARS.length];
  set(ACCOUNT_KEY,{...a,avatar}); renderAccount();
}
function exportAccountData(){
  const safeStorage={}; Object.keys(localStorage).filter(k=>k!==AUTH_USERS_KEY && k!==AUTH_SESSION_KEY).forEach(k=>safeStorage[k]=localStorage.getItem(k));
  const payload={exportedAt:new Date().toISOString(),profile:getAccount(),localStorage:safeStorage,formatVersion:2};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='clined-my-data.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function restoreAccountData(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const payload=JSON.parse(String(reader.result||''));
      const safe=payload?.localStorage;
      if(!safe || typeof safe!=='object' || Array.isArray(safe)) throw Error('File backup tidak valid.');
      const blocked=new Set([AUTH_USERS_KEY,AUTH_SESSION_KEY]);
      const owned=/^(gaster_|clined_|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_|clined_menu)/;
      const keys=Object.keys(safe).filter(k=>!blocked.has(k) && owned.test(k) && typeof safe[k]==='string');
      if(!keys.length) throw Error('Tidak ada data aplikasi yang bisa dipulihkan.');
      if(!confirm(`Pulihkan ${keys.length} data aplikasi dari backup ini? Data lokal yang sama akan diperbarui.`)) return;
      keys.forEach(k=>localStorage.setItem(k,safe[k]));
      const profile=payload.profile;
      if(profile && typeof profile==='object'){
        const current=getAccount();
        set(ACCOUNT_KEY,{...current,name:String(profile.name||current.name||'').slice(0,40),username:String(profile.username||current.username||'').slice(0,24),avatar:profile.avatar||current.avatar});
      }
      renderAccount();
      if(typeof renderHomeClinicalDashboard==='function')renderHomeClinicalDashboard();
      if(typeof renderXP==='function')renderXP();
      showToast('Backup berhasil dipulihkan.');
    }catch(err){showToast(err?.message||'Backup tidak dapat dipulihkan.');}
    finally{const input=$('importAccountFile');if(input)input.value='';}
  };
  reader.onerror=()=>showToast('Gagal membaca file backup.');
  reader.readAsText(file);
}

async function deleteAccount(){
  const user=authCurrentUser();
  if(!user){showToast('Masuk dulu untuk menghapus akun');return;}
  if(!confirm('Hapus akun CLINED ini? Akun tidak dapat dipulihkan. Data belajar yang tersimpan di browser tidak akan ikut terhapus.'))return;
  try{await authApi('/account',{method:'DELETE',body:'{}'});authServerUser=null;try{window.CLINED_ONLINE_SYNC?.switchUser?.('');}catch{} renderAccount();showToast('Akun berhasil dihapus.');}
  catch(error){showToast(error?.message||'Akun tidak dapat dihapus.');}
}
if($('saveAccountBtn'))$('saveAccountBtn').onclick=saveAccount;
if($('changeAvatarBtn'))$('changeAvatarBtn').onclick=cycleAccountAvatar;
if($('accountAvatar'))$('accountAvatar').onclick=cycleAccountAvatar;
if($('exportAccountBtn'))$('exportAccountBtn').onclick=exportAccountData;
if($('backFromAccount'))$('backFromAccount').onclick=()=>show('home');

/* Server-backed account layer. Passwords remain on the server; the browser only
   receives an HttpOnly signed session cookie. */
let authServerUser=null;
async function authApi(path,options={}){
  const response=await fetch(`/api/auth${path}`,{
    credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(payload.error||'Permintaan akun gagal. Coba lagi.');
  return payload;
}
function authCurrentUser(){return authServerUser;}
function authSyncProfile(user){
  if(!user)return;
  const existing=getAccount();
  set(ACCOUNT_KEY,{...existing,name:user.name,username:user.username,avatar:existing.avatar||user.name.charAt(0).toUpperCase()||'C',authUserId:user.id});
}
function authScopeUser(user){
  if(!user)return;
  // Setiap akun punya ruang data belajar sendiri. Saat user berbeda, data lokal
  // akun sebelumnya dibuang sebelum /api/sync mengambil state milik akun baru.
  try{window.CLINED_ONLINE_SYNC?.switchUser?.(user.id);}catch(error){console.warn('CLINED account scope skipped',error);}
}
async function authRestoreSession(){
  try{const data=await authApi('/me',{method:'GET',headers:{}});authServerUser=data.user||null;authScopeUser(authServerUser);authSyncProfile(authServerUser);}
  catch{authServerUser=null;}
  renderAccount();renderAccountAuthState();
  if(authServerUser){window.CLINED_AUTH_GATE?.unlock?.();show('home',{force:true});}
  else{window.CLINED_AUTH_GATE?.lock?.();authOpenModal('login');}
}
function authSetError(id,message){const el=$(id);if(!el)return;el.textContent=message;el.hidden=!message;}
function authOpenModal(mode='signup'){
  const modal=$('accountAuthModal');if(!modal)return;
  const signup=mode==='signup';
  $('accountAuthForm').reset();$('accountAuthForm').dataset.mode=mode;
  $('accountModalTitle').textContent=signup?'Buat akun':'Masuk';
  $('accountModalSubtitle').textContent=signup?'Cukup username dan password, tanpa perlu email.':'Masuk dengan username dan password kamu.';
  $('signupFields').hidden=!signup;$('authLoginIdentifier').hidden=signup;$('authLoginIdentifierLabel').hidden=signup;
  $('authPasswordConfirmField').hidden=!signup;$('authPasswordConfirmLabel').hidden=!signup;
  $('authPasswordConfirm').required=signup;
  $('authPassword').autocomplete=signup?'new-password':'current-password';
  $('submitAccountAuth').textContent=signup?'BUAT AKUN':'MASUK';
  $('switchAccountAuth').textContent=signup?'Sudah punya akun? Masuk':'Belum punya akun? Buat akun';
  authSetError('accountFormError','');modal.hidden=false;modal.setAttribute('aria-hidden','false');
  setTimeout(()=>$(signup?'authName':'authLoginIdentifier')?.focus(),30);
}
function authCloseModal(){const modal=$('accountAuthModal');if(modal){modal.hidden=true;modal.setAttribute('aria-hidden','true');}}
async function authCreateAccount(){
  const name=String($('authName').value||'').trim();
  const username=String($('authUsername').value||'').trim().toLowerCase();
  const password=String($('authPassword').value||''),confirm=String($('authPasswordConfirm').value||'');
  if(password!==confirm)throw Error('Konfirmasi password tidak sama.');
  const data=await authApi('/register',{method:'POST',body:JSON.stringify({name,username,password})});
  authServerUser=data.user;authScopeUser(authServerUser);authSyncProfile(authServerUser);
}
async function authLogin(){
  const identifier=String($('authLoginIdentifier').value||'').trim();
  const password=String($('authPassword').value||'');
  const data=await authApi('/login',{method:'POST',body:JSON.stringify({identifier,password})});
  authServerUser=data.user;authScopeUser(authServerUser);authSyncProfile(authServerUser);
}
async function authSubmit(event){
  event.preventDefault();if(authBusy)return;authBusy=true;authSetError('accountFormError','');
  try{if(event.currentTarget.dataset.mode==='signup')await authCreateAccount();else await authLogin();authCloseModal();window.CLINED_AUTH_GATE?.unlock?.();renderAccount();renderAccountAuthState();show('home',{force:true});showToast('Akun siap digunakan.');}
  catch(error){authSetError('accountFormError',error?.message||'Akun tidak dapat diproses.');}
  finally{authBusy=false;}
}
async function authLogout(){
  try{await authApi('/logout',{method:'POST',body:'{}'});}catch{}
  authServerUser=null;try{window.CLINED_ONLINE_SYNC?.switchUser?.('');}catch(error){console.warn('CLINED account cleanup skipped',error);}window.CLINED_AUTH_GATE?.lock?.();renderAccount();renderAccountAuthState();authOpenModal('login');showToast('Kamu sudah keluar dari akun.');
}
function renderAccountAuthState(){
  const user=authCurrentUser(),title=$('accountAuthTitle'),sub=$('accountAuthSubtitle'),badge=$('accountSecurityBadge'),actions=$('accountAuthActions'),secure=$('accountSecurityActions');
  if(!title)return;
  if(user){title.textContent=`Akun aktif • ${user.name}`;sub.textContent=`@${user.username}${user.role==='admin'?' • ADMIN':''}`;badge.textContent='AMAN';badge.classList.add('secure');actions.hidden=true;secure.hidden=false;}
  else{title.textContent='Masuk ke akun CLINED';sub.textContent='Buat akun atau masuk untuk memakai profil yang terlindungi di website ini.';badge.textContent='LOGIN';badge.classList.remove('secure');actions.hidden=false;secure.hidden=true;}
}
function renderAccount(){
  const user=authCurrentUser(),account=getAccount(),nameEl=$('accountName'),usernameEl=$('accountUsername'),avatar=$('accountAvatar'),profileFields=$('accountProfileFields');
  if(nameEl)nameEl.value=user?.name||account.name||'';if(usernameEl)usernameEl.value=user?.username||account.username||'';
  if(avatar)avatar.textContent=account.avatar||user?.name?.charAt(0).toUpperCase()||'C';
  [nameEl,usernameEl].forEach(el=>{if(el)el.disabled=!user;});
  if(profileFields)profileFields.hidden=!user;
  ['saveAccountBtn','exportAccountBtn','changeAvatarBtn','accountAvatar'].forEach(id=>{const el=$(id);if(el)el.disabled=!user;});
  renderAccountAuthState();
}
async function authChangePassword(event){
  event.preventDefault();authSetError('changePasswordError','');
  try{
    const currentPassword=String($('currentPassword').value||''),newPassword=String($('newPassword').value||''),confirmPassword=String($('newPasswordConfirm').value||'');
    if(newPassword!==confirmPassword)throw Error('Konfirmasi password tidak sama.');
    await authApi('/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});
    event.currentTarget.reset();closeChangePassword();showToast('Password berhasil diperbarui.');
  }catch(error){authSetError('changePasswordError',error?.message||'Password tidak dapat diperbarui.');}
}
function openChangePassword(){if(!authCurrentUser())return;const modal=$('changePasswordModal');if(modal){modal.hidden=false;modal.setAttribute('aria-hidden','false');$('currentPassword').focus();}}
function closeChangePassword(){const modal=$('changePasswordModal');if(modal){modal.hidden=true;modal.setAttribute('aria-hidden','true');}}
function setupAuthSecurity(){
  $('createAccountBtn')?.addEventListener('click',()=>authOpenModal('signup'));
  $('loginAccountBtn')?.addEventListener('click',()=>authOpenModal('login'));
  $('accountAuthForm')?.addEventListener('submit',authSubmit);
  $('switchAccountAuth')?.addEventListener('click',()=>authOpenModal($('accountAuthForm').dataset.mode==='signup'?'login':'signup'));
  $('closeAccountModal')?.addEventListener('click',authCloseModal);document.querySelectorAll('[data-close-account-modal]').forEach(el=>el.addEventListener('click',authCloseModal));
  $('changePasswordBtn')?.addEventListener('click',openChangePassword);$('closePasswordModal')?.addEventListener('click',closeChangePassword);document.querySelectorAll('[data-close-password-modal]').forEach(el=>el.addEventListener('click',closeChangePassword));
  $('changePasswordForm')?.addEventListener('submit',authChangePassword);$('logoutAccountBtn')?.addEventListener('click',authLogout);$('deleteAccountBtn')?.addEventListener('click',deleteAccount);
  $('importAccountBtn')?.addEventListener('click',()=>$('importAccountFile')?.click());$('importAccountFile')?.addEventListener('change',event=>restoreAccountData(event.target.files?.[0]));
  document.querySelectorAll('[data-password-toggle]').forEach(button=>button.addEventListener('click',()=>{const input=$(button.dataset.passwordToggle);if(!input)return;const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Lihat':'Sembunyikan';}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){authCloseModal();closeChangePassword();}});
}
// Legacy local developer-account bootstrap removed: authentication is server-backed.
setupAuthSecurity();
renderAccount();
authRestoreSession();

function achievementData(){
  const hist=get(KEY.hist,[]), xp=Number(get(KEY.xp,0))||0;
  const answered=hist.reduce((a,h)=>a+Number(h.total||0),0);
  const best=hist.length?Math.max(...hist.map(h=>Number(h.pct||0))):0;
  const streakData=get(KEY.dailyStreak,{current:0,best:0});
  return [
    ['🎓','First Step','Menyelesaikan sesi pertama',hist.length>=1],
    ['🔥','Hot Streak','Mencapai 7 hari streak',Number(streakData.best||streakData.current||0)>=7],
    ['📚','100 Questions','Mengerjakan 100 soal',answered>=100],
    ['🎯','Perfect Session','Mencapai akurasi 100% dalam satu sesi',best>=100],
    ['⚡','Clinical XP','Mengumpulkan 1.000 XP',xp>=1000],
    ['🏆','Clinical Master','Mencapai Level 10',xpLevel(xp)>=10],
    ['🔬','Histology Starter','Menjawab 5 soal Histology',componentProgress('Histology').answered>=5],
    ['🧠','Physiology Core','Menjawab 10 soal Physiology',componentProgress('Physiology').answered>=10],
    ['💊','Pharm Ready','Menjawab 10 soal Pharmacology',componentProgress('Pharmacology').answered>=10],
    ['🫀','Anatomy Explorer','Menjawab 10 soal Anatomy',componentProgress('Anatomy').answered>=10],
    ['🩺','Diagnostics Ready','Menjawab 10 soal Diagnostics',componentProgress('Diagnostics').answered>=10]
  ];
}
function renderAchievements(){
  const root=$('achievementList'); if(!root)return;
  root.innerHTML=achievementData().map(a=>`<div class="achievement-item ${a[3]?'unlocked':'locked'}"><span class="achievement-icon">${a[0]}</span><div><b>${a[1]}</b><small>${a[2]}</small></div><strong>${a[3]?'✓':'🔒'}</strong></div>`).join('');
}
if($('achievementBtn'))$('achievementBtn').onclick=()=>{renderAchievements();show('achievementsPage');};
if($('backFromAchievements'))$('backFromAchievements').onclick=()=>show('home');

initSPAHistory();initTheme();renderBanks();renderCounts();renderModes();updateTimerUI();renderResume();renderXP();

document.addEventListener('click', function(e){
  const el = e.target.closest('[data-answer], .answer, .answer-btn, .option, .choice, .answer-option');
  if(!el) return;
  setTimeout(function(){
    try{
      const explicit = el.dataset && (el.dataset.correct === 'true' || el.dataset.correct === 'false');
      if(explicit){
        recordBlockQuestion(getCurrentBlockId(), el.dataset.correct === 'true');
      }
    }catch(_){}
  }, 0);
});

/* Navigation ownership is handled by each button's single onclick handler.
   A previous delegated handler caused double navigation/taps. */
/* Normal Values quick reference — image reference */
function openNormalValues(){
  const m=$("normalValuesModal");
  if(!m)return;
  m.hidden=false;
}
function closeNormalValues(){
  const m=$("normalValuesModal");
  if(m)m.hidden=true;
}
if($("normalValuesHeaderBtn"))$("normalValuesHeaderBtn").onclick=openNormalValues;
if($("normalValuesBtn"))$("normalValuesBtn").onclick=openNormalValues;
if($("closeNormalValues"))$("closeNormalValues").onclick=closeNormalValues;
if($("normalValuesModal"))$("normalValuesModal").addEventListener('click',e=>{if(e.target.id==='normalValuesModal')closeNormalValues()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$("normalValuesModal")?.hidden)closeNormalValues()});


/* A13 — Pause decorative home motion during scroll to prevent iOS visual jitter. */
(function initScrollMotionGuard(){
  let timer=0;
  const onScroll=()=>{
    document.body.classList.add('is-scrolling');
    clearTimeout(timer);
    timer=setTimeout(()=>document.body.classList.remove('is-scrolling'),120);
  };
  window.addEventListener('scroll',onScroll,{passive:true});
})();

/* Collapsible Menu Section */
(function initMenuSectionCollapse(){
  const section=document.getElementById('menuSection');
  const toggle=document.getElementById('menuSectionToggle');
  if(!section||!toggle)return;
  const KEY_MENU='clined_menu_section_collapsed_v1';
  let collapsed=false;
  try{collapsed=localStorage.getItem(KEY_MENU)==='1';}catch(e){}
  const apply=()=>{
    section.classList.toggle('is-collapsed',collapsed);
    toggle.setAttribute('aria-expanded',String(!collapsed));
    const arrow=toggle.querySelector('.menu-section-arrow .ui-arrow-caret') || toggle.querySelector('.menu-section-arrow');
    if(arrow)arrow.textContent=collapsed?'⌄':'⌃';
  };
  toggle.addEventListener('click',()=>{
    const y=window.scrollY || window.pageYOffset || 0;
    collapsed=!collapsed;
    try{localStorage.setItem(KEY_MENU,collapsed?'1':'0');}catch(e){}
    apply();
    // Preserve the user's scroll position when the section height changes.
    requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'}));
    setTimeout(()=>window.scrollTo({top:y,left:0,behavior:'auto'}),40);
  });
  apply();
})();



/* Floating dashboard navigation — 4 destinations */
(function initFloatingDashboardNav(){
  const nav=document.getElementById('floatingDashboardNav');
  if(!nav) return;
  const items=[...nav.querySelectorAll('[data-floating-nav]')];
  const slider=nav.querySelector('.floating-nav-slider');
  const setActive=(key)=>{
    const index=items.findIndex(btn=>btn.dataset.floatingNav===key);
    items.forEach(btn=>btn.classList.toggle('active',btn.dataset.floatingNav===key));
    if(slider && index>=0) { slider.style.transform='none'; nav.style.setProperty('--floating-index',String(index)); }
  };
  window.setFloatingNavActive=setActive;
  items.forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.floatingNav;
    // Re-trigger the tactile pop animation on every tap, even when the tab is already active.
    btn.classList.remove('nav-pop');
    void btn.offsetWidth;
    btn.classList.add('nav-pop');
    window.setTimeout(()=>btn.classList.remove('nav-pop'),520);
    if(key==='home'){show('home');if(typeof renderCounts==='function')renderCounts();setActive('home');window.scrollTo({top:0,behavior:'auto'});return;}
    if(key==='dashboard'){show('clinicalDashboard');if(typeof renderClinicalDashboard==='function')renderClinicalDashboard();setActive('dashboard');window.scrollTo({top:0,behavior:'auto'});return;}
    if(key==='uab'){const b=document.getElementById('openUabPage');if(b){b.click();}else{show('uabPage');setActive('uab');}window.scrollTo({top:0,behavior:'auto'});return;}
    if(key==='account'){show('accountPage');renderAccount();setActive('account');window.scrollTo({top:0,behavior:'auto'});return;}
  }));
  setActive('home');
})();


/* FINAL V2 — robust UPI flash-card navigation fallback */
(function(){
  function openFlashcard(el){
    try{
      const block =
        el?.closest('[data-upi-block]')?.dataset?.upiBlock ||
        el?.dataset?.upiBlock ||
        el?.getAttribute?.('data-block');

      const material =
        el?.closest('[data-upi-material]')?.dataset?.upiMaterial ||
        el?.dataset?.upiMaterial ||
        'Flash Card';

      if (!block) return false;

      if (typeof upiOpenFlashcards === 'function') {
        upiOpenFlashcards(block, material);
        return true;
      }
      if (typeof upiOpenFlashCard === 'function') {
        upiOpenFlashCard(block, material);
        return true;
      }
      if (typeof upiOpenMaterial === 'function') {
        upiOpenMaterial(block, material);
        return true;
      }
    } catch (err) {
      console.warn('UPI flash-card navigation:', err);
    }
    return false;
  }

  document.addEventListener('click', function(e){
    const target = e.target.closest?.(
      '[data-upi-flashcard], [data-flashcard], .upi-flashcard-btn, .flashcard-start'
    );
    if (!target) return;
    if (openFlashcard(target)) e.preventDefault();
  }, true);
})();


/* FINAL V3 — UPI Histology / Patologi Anatomi flashcard launch */
(function(){
  function launch(el){
    const block = el.closest('[data-upi-material]')?.dataset?.upiBlock ||
                  el.dataset?.upiBlock ||
                  document.querySelector('.upi-page [data-upi-current-block]')?.dataset?.upiCurrentBlock;
    const material = el.closest('[data-upi-material]')?.dataset?.upiMaterial || el.dataset?.upiMaterial;
    if(!block || !material) return false;

    try {
      if(typeof upiOpenFlashcards === 'function'){ upiOpenFlashcards(block, material); return true; }
      if(typeof upiOpenFlashCard === 'function'){ upiOpenFlashCard(block, material); return true; }
      if(typeof upiOpenMaterial === 'function'){ upiOpenMaterial(block, material); return true; }
      if(typeof show === 'function'){
        const pageId = `upi-${block}-${material}`.replace(/[^a-zA-Z0-9_-]/g,'-');
        const page = document.getElementById(pageId);
        if(page){ show(pageId); return true; }
      }
    } catch(err){ console.warn('Flash Card launch:',err); }
    return false;
  }

  document.addEventListener('click', function(e){
    const el=e.target.closest?.(
      '[data-upi-material-start], [data-upi-material] .flashcard-start, [data-upi-material] [data-flashcard-start], .upi-material-node'
    );
    if(!el) return;
    const material=el.dataset?.upiMaterial || el.closest('[data-upi-material]')?.dataset?.upiMaterial;
    if(!material) return;
    if(launch(el)) e.preventDefault();
  }, true);
})();


/* FINAL V4 — UPI interaction stability */
(function(){
  function fn(names,args){
    for(const n of names){
      if(typeof window[n]==='function'){
        try{ window[n](...args); return true; }catch(e){ console.warn(n,e); }
      }
    }
    return false;
  }
  function blockFrom(el){
    return el?.dataset?.upiBlock ||
      el?.closest?.('[data-upi-block]')?.dataset?.upiBlock ||
      document.querySelector('[data-upi-current-block]')?.dataset?.upiCurrentBlock ||
      window.currentUPIBlock || null;
  }
  document.addEventListener('click',function(e){
    let el=e.target.closest?.('[data-upi-material]');
    if(el){
      const block=blockFrom(el), material=el.dataset.upiMaterial;
      if(block && material){
        e.preventDefault(); e.stopPropagation();
        fn(['upiOpenMaterial','upiOpenFlashcards','upiOpenFlashCard'],[block,material]);
      }
      return;
    }
    el=e.target.closest?.('[data-upi-create-question],.upi-owned-create');
    if(el){
      const block=blockFrom(el);
      if(block){e.preventDefault();e.stopPropagation();fn(['upiOpenCreateQuestion'],[block]);}
      return;
    }
    el=e.target.closest?.('[data-upi-edit-id],[data-upi-edit]');
    if(el){
      const id=el.dataset.upiEditId||el.dataset.upiEdit;
      if(id){e.preventDefault();e.stopPropagation();fn(['upiOpenEditQuestion','upiEditQuestion'],[id]);}
      return;
    }
    el=e.target.closest?.('[data-upi-del-id],[data-upi-delete]');
    if(el){
      const id=el.dataset.upiDelId||el.dataset.upiDelete;
      if(id){e.preventDefault();e.stopPropagation();fn(['upiDeleteQuestion','upiRemoveQuestion'],[id]);}
    }
  },true);
})();

/* =========================================================
   CLINED A3 — UX safety layer
   ========================================================= */
(function initA3UX(){
  const $=id=>document.getElementById(id);
  function closeModal(id){const m=$(id);if(!m)return;m.hidden=true;m.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
  function openModal(id){const m=$(id);if(!m)return;m.hidden=false;m.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');}
  
function initHomeMaterials(){}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initHomeMaterials,{once:true}); else initHomeMaterials();

document.addEventListener('click',e=>{
    if(e.target.closest('[data-close-upi-zoom]')) closeModal('upiImageZoomModal');
    if(e.target.closest('[data-close-upi-edit]')) closeModal('upiEditQuestionModal');
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    ['upiImageZoomModal','upiEditQuestionModal','changePasswordModal','normalValuesModal'].forEach(id=>{
      const m=$(id); if(m && !m.hidden) closeModal(id);
    });
  });
  const stage=$('upiZoomStage');
  if(stage){
    stage.addEventListener('dblclick',e=>{e.preventDefault();if(typeof stageResetZoom==='function')stageResetZoom();});
  }
  // Keep the floating nav from covering focused inputs when the iOS keyboard opens.
  if(window.visualViewport){
    const adjust=()=>{document.documentElement.style.setProperty('--clined-vv-height',window.visualViewport.height+'px');};
    window.visualViewport.addEventListener('resize',adjust,{passive:true});
    window.visualViewport.addEventListener('scroll',adjust,{passive:true});
    adjust();
  }
  // Remove accidental empty/invalid header spacer nodes created by older revisions.
  document.querySelectorAll('.header>br').forEach(el=>el.remove());
})();


/* CLINED stability refresh: preserve UI, refresh persisted streak/stat widgets after resume. */
(function(){
  let day=typeof localDayKey==='function'?localDayKey():'';
  const refresh=()=>{try{if(typeof renderDailyStreak==='function')renderDailyStreak();if(typeof renderDailyMission==='function')renderDailyMission();if(typeof renderHomeClinicalDashboard==='function')renderHomeClinicalDashboard();}catch(e){console.warn('CLINED refresh',e)}};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){const now=typeof localDayKey==='function'?localDayKey():'';if(now!==day)day=now;refresh();}});
  window.addEventListener('pageshow',refresh);
  window.addEventListener('storage',e=>{if(e.key==='gaster_daily_streak_v1')refresh();});
})();
