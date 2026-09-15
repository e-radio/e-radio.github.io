# Croatia station audit — 2026-09-15
Examined 239 station records and 289 distinct default/alternative URLs. 282 URLs verified after direct retesting; 7 remain unresolved. Remaining records: 233.

Of the 32 failed Tunzilla-prefixed URLs, 30 worked after removing the prefix. Proxy failures are not classified as offline origin streams.

Live probes are point-in-time checks, not proof of permanent availability. Unresolved streams were retained. No stream schemes were rewritten. Existing station page URLs were retained except merged duplicate pages, which redirect.

## Applied corrections

- Merged bravo-rock-grad-zagreb into bravo-lounge; preserved UUID alias.
- Merged happy-fest into happy-fm-fest; preserved UUID alias.
- Merged laganini-fm-zagreb-slavonska-avenija-2-zagreb into laganini-fm; preserved UUID alias.
- Merged laganini-fm-zagreb-new into laganini-fm; preserved UUID alias.
- Merged laganini-fm-rijeka-primorska into laganini-fm-rijeka; preserved UUID alias.
- Merged radio-jaska-jastrebarsko into radio-jaska; preserved UUID alias.
- Audio antena-zagreb-live (http://live.antenazagreb.hr:8000/;): ('AAC+', 96) → ('AAC', 96)
- Audio antena-dance-legacy (http://live.antenazagreb.hr:8015/;): ('AAC+', 64) → ('AAC', 64)
- Audio antena-hit-legacy (http://live.antenazagreb.hr:8011/;): ('AAC+', 64) → ('AAC', 64)
- Audio antena-love-legacy (http://live.antenazagreb.hr:8007/;): ('AAC+', 64) → ('AAC', 64)
- Audio rock-antena-legacy (http://live.antenazagreb.hr:8019/;): ('AAC+', 64) → ('AAC', 64)
- Audio bravo (https://relay1.social3.hr/radio/8310/radio.mp3): ('AAC+', 96) → ('MP3', 96)
- Audio bravo-balade-grad-zagreb (http://c5.hostingcentar.com:8360/stream): ('AAC+', 128) → ('AAC', 128)
- Audio bravo-pop-grad-zagreb (https://relay1.social3.hr/radio/8330/radio.mp3): ('AAC+', 128) → ('MP3', 128)
- Corrected county for city-radio-88-6-zagreba-ka-upanija: Zagreb.
- Audio crash (https://live.radiocrash.net/;): ('AAC+', 256) → ('AAC', 256)
- Audio drama-radio-dubrovnik-dalmatia (https://listen.radioking.com/radio/626884/stream/689500): ('AAC+', 64) → ('AAC', 64)
- Audio dvb-digital (https://radio.dvb.digital/hls/dvb.digital/live.m3u8): ('AAC+', 320) → ('AAC', 320)
- Audio enter-zagreb-grad-zagreb (http://live.enterzagreb.hr:8023/;): ('AAC+', 96) → ('AAC', 96)
- Audio extra-fm (http://streams.extrafm.hr:8110/;): ('AAC+', 96) → ('AAC', 96)
- Audio extra-fm (http://streams.extrafm.hr:8110/stream): ('AAC+', 96) → ('AAC', 96)
- Corrected county for folkyton-radio-velika-mlaka: Zagreb.
- Corrected county for gold-velika-gorica: Zagreb.
- Audio gold-velika-gorica (http://live.goldfm.hr:8068/stream): ('AAC+', 96) → ('AAC', 96)
- Audio gold-fm-zagreba-ka-upanija (http://live.goldfm.hr:8068/;): ('AAC+', 96) → ('AAC', 96)
- Corrected county for happy-fm: Zagreb.
- Audio happy-fm (https://audio.social3.hr/listen/happy_aac/stream): ('AAC+', 96) → ('AAC', 64)
- Audio happy-fm (http://c5.hostingcentar.com:9543/stream): ('AAC+', 96) → ('AAC', 96)
- Renamed Happy FM Fest to Domovina, matching verified AzuraCast identity; retained page URL.
- Corrected county for happy-fm-fest: Zagreb.
- Audio happy-fm-fest (http://c5.hostingcentar.com:8372/): ('AAC+', 128) → ('AAC', 128)
- Corrected county for happy-fm-klape: Zagreb.
- Audio happy-fm-klape (https://audio.social3.hr/listen/happy_klape/stream): ('AAC+', 128) → ('MP3', 128)
- Audio happy-fm-klape (http://c5.hostingcentar.com:8384/stream): ('AAC+', 128) → ('AAC', 128)
- Corrected county for happy-fm-legenda: Zagreb.
- Audio happy-fm-legenda (https://audio.social3.hr/listen/happy_legenda/stream): ('AAC+', 128) → ('MP3', 128)
- Audio happy-fm-legenda (https://audio.social3.hr/listen/happy_legenda/stream): ('AAC+', 128) → ('MP3', 128)
- Audio happy-fm-legenda (http://c5.hostingcentar.com:8396/stream): ('AAC+', 128) → ('AAC', 128)
- Corrected county for happy-fm-tambura: Zagreb.
- Audio happy-fm-tambura (https://audio.social3.hr/listen/happy_tambure/stream): ('AAC+', 128) → ('MP3', 128)
- Audio happy-fm-tambura (http://c5.hostingcentar.com:8378/stream): ('AAC+', 128) → ('AAC', 128)
- Corrected county for happy-fm-party: Zagreb.
- Audio happy-fm-party (http://c5.hostingcentar.com:8390/stream): ('AAC+', 128) → ('AAC', 128)
- Audio happy-fm-party (http://c5.hostingcentar.com:8390/;): ('AAC+', 128) → ('AAC', 128)
- Audio hrt-drugi-program (https://25453.live.streamtheworld.com/PROGRAM2AAC.aac): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-glas-hrvatske (http://28033.live.streamtheworld.com:3690/VOICEOFCROATIAAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-hr-1-prvi-program (http://28503.live.streamtheworld.com/PROGRAM1AAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-hr-2-drugi-program (http://27863.live.streamtheworld.com/PROGRAM2AAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-hr-3-tre-i-program (http://25683.live.streamtheworld.com/PROGRAM3AAC_SC): ('AAC+', 128) → ('AAC', 128)
- Audio hrt-prvi-program (https://27743.live.streamtheworld.com/PROGRAM1AAC.aac): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-dubrovnik (http://23613.live.streamtheworld.com:3690/DUBROVNIKAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-knin (http://25633.live.streamtheworld.com:3690/KNINAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-osijek (http://28033.live.streamtheworld.com/OSIJEKAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-pula (http://25693.live.streamtheworld.com:3690/PULAAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-rijeka (http://28513.live.streamtheworld.com/RIJEKAAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-sljeme (http://23613.live.streamtheworld.com/SLJEMEAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-sljeme (http://23613.live.streamtheworld.com/SLJEMEAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-split (http://25693.live.streamtheworld.com:3690/SPLITAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrt-radio-zadar (http://25453.live.streamtheworld.com:3690/ZADARAAC_SC): ('AAC+', 64) → ('AAC', 64)
- Audio hrvatski-radio-klasik-hrt (http://25443.live.streamtheworld.com/HR_CLASSICSAAC_SC): ('AAC+', 128) → ('AAC', 128)
- Audio laganini-fm (https://cast5.asurahosting.com/proxy/soundset/stream): ('MP3', 128) → ('MP3', 192)
- Audio laganini-osijek (https://cast5.asurahosting.com/proxy/soundsetosijek/stream): ('MP3', 128) → ('MP3', 320)
- Corrected county for obiteljski-radio-ivani-park-stjepana-posezija-6-ivani-grad: Zagreb.
- Audio petrinjski-radio-petrinja (https://s8.iqstreaming.com:2020/stream/petrinjski_radio): ('AAC+', 64) → ('AAC', 64)
- Audio r-dalmacija (https://shoutcast.pondi.hr:9000/;stream/1): ('AAC+', 72) → ('AAC', 72)
- Audio radio-808 (http://stream.radio808.info/stream): ('AAC+', 64) → ('MP3', 320)
- Audio radio-baranja (https://s8.iqstreaming.com:2020/stream/radio_baranja/stream): ('AAC+', 64) → ('AAC', 64)
- Audio radio-baranja (http://s8.iqstreaming.com:8036/stream): ('AAC+', 64) → ('AAC', 64)
- Audio radio-centar-studio-pore (http://radiocentar.hr:8282/mp3): ('MP3', 192) → ('MP3', 205)
- Audio radio-istra (http://de4.streamingpulse.com:7117/stream): ('AAC+', 128) → ('AAC', 128)
- Audio radio-istra (http://de4.streamingpulse.com:7117/stream): ('AAC+', 128) → ('AAC', 128)
- Audio radio-istra (http://uk1.streamingpulse.com:7117/stream): ('AAC+', 128) → ('AAC', 128)
- Corrected county for radio-jaska: Zagreb.
- Audio radio-kaj (https://s8.iqstreaming.com:2020/stream/radio-kaj2/stream): ('AAC+', 64) → ('AAC', 64)
- Audio radio-kaj (http://s8.iqstreaming.com:8050/stream): ('AAC+', 64) → ('AAC', 64)
- Audio radio-koprivnica-koprivni-ko-kri-eva-ka-upanija (https://ec2s.crolive.com.hr/RadioKoprivnica): ('MP3', 192) → ('MP3', 128)
- Renamed Radio Krka to FENX FM, matching verified stream identity; location requires review.
- Audio radio-marija (https://dreamsiteradiocp2.com/proxy/rmcroatia?mp=/stream): ('AAC+', 96) → ('AAC', 64)
- Audio radio-marija (http://dreamsiteradiocp4.com:8080/;): ('AAC+', 64) → ('AAC', 64)
- Audio radio-marija (http://dreamsiteradiocp.com:8026/stream): ('AAC+', 64) → ('AAC', 64)
- Audio radio-marija (http://dreamsiteradiocp4.com:8080/stream): ('AAC+', 64) → ('AAC', 64)
- Audio radio-max (https://azuracast.novi-net.net/listen/radiomax/radiomax.mp3): ('MP3', 128) → ('AAC', 128)
- Corrected county for radio-samobor: Zagreb.
- Corrected county for radio-stubica: Krapina-Zagorje.
- Audio radio-stubica (http://radiostubica.hc.hr:7006/stream): ('AAC+', 128) → ('AAC', 128)
- Audio radio-student-100-5 (http://161.53.122.184:8000/AAC128.aac): ('AAC+', 128) → ('AAC', 128)
- Audio radio-student-100-5 (http://161.53.122.184:8000/AAC128.aac): ('AAC+', 128) → ('AAC', 128)
- Audio radio-student-100-5 (http://stream.radiostudent.hr/audio): ('AAC+', 128) → ('AAC', 128)
- Corrected county for radio-velika-gorica-zagreba-ka-upanija: Zagreb.
- Corrected county for radio-vrbovec-94-5-zagreba-ka-upanija: Zagreb.
- Corrected county for radio-zelina: Zagreb.
- Audio super-radio (https://mcp1.mydataknox.com:8010/stream): ('MP3', 128) → ('MP3', 320)
- Audio top-gold-grad-zagreb (http://116.202.235.114:8414/;): ('AAC+', 128) → ('AAC', 128)
- Audio top-pop-grad-zagreb (http://116.202.235.114:8420/;): ('AAC+', 128) → ('AAC', 128)
- Audio top-radio-grad-zagreb (http://c5.hostingcentar.com:8000/streams/topradio/): ('AAC+', 96) → ('AAC', 96)
- Audio top-radio (https://c5.hostingcentar.com/streams/topradio/): ('AAC+', 96) → ('AAC', 96)
- Audio top-rock-grad-zagreb (http://116.202.235.114:8408/;): ('AAC+', 128) → ('AAC', 128)
- Audio top-you-grad-zagreb (http://116.202.235.114:8402/;): ('AAC+', 128) → ('AAC', 128)
- Audio ultra-split (http://c5.hostingcentar.com:8061/;stream/1): ('AAC+', 96) → ('AAC', 96)
- Audio zabavni-radio (http://radiocentar.hr:8585/stream.aac): ('MP3', 61284) → ('MP3', 128)
- Audio zagorski-radio (https://s8.iqstreaming.com:2020/stream/zagorski/stream): ('AAC+', 64) → ('AAC', 64)
- Audio zagorski-radio (http://s8.iqstreaming.com:8054/stream): ('AAC+', 64) → ('AAC', 64)
- Corrected county for zfm: Zagreb.

## Requires review

- Prigorski Radio and Radio Križevci share https://s8.iqstreaming.com:8048/stream but have conflicting identities. Left separate pending broadcaster confirmation.
- FENX FM replaced Radio Krka on its stream; the previous Skradin location/icon remain unverified.
- Other mismatched broadcast names, station location claims, and historical feeds need broadcaster confirmation; stream titles alone are not definitive.

## Unresolved stream probes after direct retesting

Only these seven URLs remain unresolved. Timeout or probe failure does not prove permanent unavailability.

- `https://stream.ampupradio.com/tophits.mp3`: https://stream.ampupradio.com/tophits.mp3: Server returned 5XX Server Error reply 
- `https://stream.cvrai.com:8010/stream`: [tcp @ 0x7f6c10380] Connection to tcp://stream.cvrai.com:8010 failed: Operation timed out https://stream.cvrai.com:8010/stream: Operation timed out 
- `https://s20.reliastream.com/stream/8116`: https://s20.reliastream.com/stream/8116: Server returned 5XX Server Error reply 
- `http://144.76.39.214:6022/stream`: [tcp @ 0xa3ec4c000] Connection to tcp://144.76.39.214:6022 failed: Connection refused http://144.76.39.214:6022/stream: Connection refused 
- `http://s8.iqstreaming.com:8030/stream`: http://s8.iqstreaming.com:8030/stream: Server returned 401 Unauthorized (authorization failed) 
- `https://sonic1-rbx.cloud-center.ro:8026/stream`: [tcp @ 0xaacc48140] Connection to tcp://sonic1-rbx.cloud-center.ro:8026 failed: Operation timed out https://sonic1-rbx.cloud-center.ro:8026/stream: Operation timed out 
- `https://sonic1-rbx.cloud-center.ro/8026/stream`: [tcp @ 0xb9ac035c0] Connection to tcp://sonic1-rbx.cloud-center.ro:443 failed: Operation timed out https://sonic1-rbx.cloud-center.ro/8026/stream: Operation timed out 

## Missing geography

- ampupradio
- cro-international-dj-radio
- cvrai-com-thats-your-webradio
- dvb-digital
- gamerz-inn-jamz
- naxi-house-belgrade
- radio-2
- radio-daruvar
- radio-dj-grga
- radio-grubi-no-polje
- replay-news-hrvatski-radio-informacija-svakih-5-minuta-zagreb

## Location sources

- https://www.zagrebacka-zupanija.hr/zupanija/
- https://www.zagrebacka-zupanija.hr/radno-vrijeme/
- https://kzz.hr/gradovi-i-opcine/

## Stream identity differences to review

These are comparison flags, not automatic rename recommendations. Broadcaster tags can be generic or outdated.

- `057-radio-zadar-croatia-banana-state`: listing **057 Radio**, broadcast tag **No Name**.
- `antena-zagreb-live`: listing **Antena Zagreb Live (Legacy)**, broadcast tag **Antena Zagreb**.
- `antena-dance-legacy`: listing **Antena Zagreb Dance (Legacy)**, broadcast tag **80's MIX**.
- `antena-hit-legacy`: listing **Antena Zagreb Hit (Legacy)**, broadcast tag **ANTENA TOP 40**.
- `antena-love-legacy`: listing **Antena Zagreb Love (Legacy)**, broadcast tag **WE LOVE 90s**.
- `antena-zagreb-rock-grad-zagreb`: listing **Antena Zagreb Rock**, broadcast tag **Antena Rock**.
- `rock-antena-legacy`: listing **Rock Antena (Legacy)**, broadcast tag **ANTENA ROCK**.
- `antena-zagreb-u-ivo-grad-zagreb`: listing **Antena Zagreb Uživo**, broadcast tag **Antena AAC**.
- `banovina-light`: listing **Banovina Light**, broadcast tag **Light**.
- `banovina-turbo`: listing **Banovina Turbo**, broadcast tag **Turbo**.
- `bravo`: listing **bravo!**, broadcast tag **bravo AAC**.
- `bravo-balade-grad-zagreb`: listing **bravo! Balade**, broadcast tag **bravo Gym**.
- `bravo-pop-grad-zagreb`: listing **bravo! Pop**, broadcast tag **bravo Icons**.
- `city-radio-88-6-zagreba-ka-upanija`: listing **City Radio**, broadcast tag **No Name**.
- `club-music-radio-dance`: listing **Club Music Radio - Dance**, broadcast tag **Club Music Radio - POP & DANCE**.
- `cmc-dalmatina`: listing **CMC Dalmatina**, broadcast tag **dalmatina**.
- `cro-international-dj-radio`: listing **Cro International DJ Radio**, broadcast tag **DJ International Croatia**.
- `drama-radio-dubrovnik-dalmatia`: listing **Drama radio Dubrovnik**, broadcast tag **DRAMA RADIO**.
- `enter-zagreb-grad-zagreb`: listing **ENTER Zagreb**, broadcast tag **Enter MP3 256**.
- `extra-fm`: listing **Extra FM**, broadcast tag **Extra MP3**.
- `folkyton-radio-velika-mlaka`: listing **FolkyTon Radio**, broadcast tag **FolkyTon**.
- `gold-velika-gorica`: listing **Gold - Velika Gorica**, broadcast tag **HAPPY AAC**.
- `gold-fm-zagreba-ka-upanija`: listing **Gold FM**, broadcast tag **HAPPY AAC**.
- `happy-fm`: listing **Happy FM**, broadcast tag **Happy AAC**.
- `happy-fm-klape`: listing **Happy FM Klape**, broadcast tag **Happy Klape**.
- `happy-fm-legenda`: listing **Happy FM Legenda**, broadcast tag **Happy Legenda**.
- `happy-fm-tambura`: listing **Happy FM Tambura**, broadcast tag **Happy Tambure**.
- `happy-fm-party`: listing **Happy FM Party**, broadcast tag **Happy Party**.
- `hkr`: listing **HKR - Hrvatski Katolicki Radio**, broadcast tag **Hrvatski katolicki radio**.
- `hrt-drugi-program`: listing **HRT Drugi Program**, broadcast tag **PROGRAM2**.
- `hrt-glas-hrvatske`: listing **HRT Glas Hrvatske**, broadcast tag **VOICEOFCROATIA**.
- `hrt-hr-1-prvi-program`: listing **HRT HR 1 - Prvi program**, broadcast tag **PROGRAM1**.
- `hrt-hr-1-prvi-program-zagreb`: listing **HRT HR 1 - Prvi program**, broadcast tag **PROGRAM1**.
- `hrt-hr-2-zagreb`: listing **HRT HR 2**, broadcast tag **PROGRAM2**.
- `hrt-hr-2-drugi-program`: listing **HRT HR 2 - Drugi program**, broadcast tag **PROGRAM2**.
- `hrt-hr-3-tre-i-program`: listing **HRT HR 3 - Treći program**, broadcast tag **PROGRAM3**.
- `hrt-prvi-program`: listing **HRT Prvi program**, broadcast tag **PROGRAM1**.
- `hrt-radio-dubrovnik`: listing **HRT Radio Dubrovnik**, broadcast tag **DUBROVNIK**.
- `hrt-radio-knin`: listing **HRT Radio Knin**, broadcast tag **KNIN**.
- `hrt-radio-osijek`: listing **HRT Radio Osijek**, broadcast tag **OSIJEK**.
- `hrt-radio-pula`: listing **HRT Radio Pula**, broadcast tag **PULA**.
- `hrt-radio-rijeka`: listing **HRT Radio Rijeka**, broadcast tag **RIJEKA**.
- `hrt-radio-sljeme`: listing **HRT Radio Sljeme**, broadcast tag **SLJEME**.
- `hrt-radio-split`: listing **HRT Radio Split**, broadcast tag **SPLIT**.
- `hrt-radio-zadar`: listing **HRT Radio Zadar**, broadcast tag **ZADAR**.
- `hrvatski-radio-klasik`: listing **Hrvatski radio - Klasik**, broadcast tag **HR_CLASSICS**.
- `hrvatski-radio-klasik-hrt`: listing **Hrvatski radio - Klasik (HRT)**, broadcast tag **HR_CLASSICS**.
- `hrvatski-radio-pop-glazba`: listing **Hrvatski radio - Pop glazba**, broadcast tag **HR_POP**.
- `hrvatski-radio-rock`: listing **Hrvatski radio - Rock**, broadcast tag **HR_ROCK**.
- `hrvatski-radio-akovec-d-o-o-stream`: listing **Hrvatski Radio Čakovec d.o.o. Stream**, broadcast tag **Radio Hrcak**.
- `hrvatski-radio-valpov-tina-kralja-petra-kre-imira-iv-1-valpovo`: listing **HRVATSKI RADIO VALPOVŠTINA**, broadcast tag **HRV**.
- `laganini-fm`: listing **Laganini FM**, broadcast tag **MB RECASTER**.
- `laganini-fm-rijeka`: listing **Laganini FM - Rijeka**, broadcast tag **No Name**.
- `laganini-osijek`: listing **Laganini Osijek**, broadcast tag **No Name**.
- `laganini-po-ega`: listing **Laganini Požega**, broadcast tag **No Name**.
- `naxi-house-belgrade`: listing **Naxi House**, broadcast tag **NAXI HOUSE RADIO (NAXI,Belgrade,Serbia, NAXI,Beograd,Srbija) - 128k**.
- `obiteljski-radio-ivani-park-stjepana-posezija-6-ivani-grad`: listing **OBITELJSKI RADIO IVANIĆ**, broadcast tag **No Name**.
- `otvoreni-live`: listing **Otvoreni - Live**, broadcast tag **Otvoreni radio**.
- `otvoreni-live-grad-zagreb`: listing **Otvoreni Live**, broadcast tag **Otvoreni radio**.
- `otvoreni-radio-love-grad-zagreb`: listing **Otvoreni Radio - Love**, broadcast tag **Otvoreni Love**.
- `otvoreni-radio-chill`: listing **Otvoreni Radio Chill**, broadcast tag **Otvoreni Chill**.
- `petrinjski-radio-petrinja`: listing **Petrinjski radio**, broadcast tag **No Name**.
- `prigorski-radio-antuna-gustava-mato-a-3-kri-evci`: listing **Prigorski Radio**, broadcast tag **no name**.
- `prolaznik-evergreen-lepoglava-vara-dinska`: listing **Prolaznik Evergreen Lepoglava**, broadcast tag **Radio Prolaznik**.
- `r-dalmacija`: listing **R. Dalmacija**, broadcast tag **Radio Dalmacija**.
- `radio-101-rock`: listing **Radio 101 Rock**, broadcast tag **101 Soft Sound**.
- `radio-101-soft-sound`: listing **Radio 101 Soft Sound**, broadcast tag **Radio 101 ROCK**.
- `radio-105-selnica-hr-medjimurje`: listing **Radio 105 Selnica**, broadcast tag **Radio105**.
- `radio-2`: listing **Radio 2**, broadcast tag **Mitch FM Radio**.
- `radio-92-fm`: listing **Radio 92 FM**, broadcast tag **no name**.
- `radio-beli-e`: listing **Radio Belišće**, broadcast tag **GRB**.
- `radio-biograd-na-moru`: listing **Radio Biograd na Moru**, broadcast tag **No Name**.
- `radio-bnm-biograd-na-moru-chill-etali-te-kneza-branimira-2-i-biograd-na-moru`: listing **Radio BnM - Biograd na moru - CHILL**, broadcast tag **No Name**.
- `radio-bnm-biograd-na-moru-off-air-etali-te-kneza-branimira-2-i-biograd-na-moru`: listing **Radio BnM - Biograd na moru - Off Air**, broadcast tag **No Name**.
- `radio-bnm-biograd-na-moru-pop-etali-te-kneza-branimira-2-i-biograd-na-moru`: listing **Radio BnM - Biograd na moru - POP**, broadcast tag **No Name**.
- `radio-bnm-biograd-na-moru-rock-etali-te-kneza-branimira-2-i-biograd-na-moru`: listing **Radio BnM - Biograd na moru - ROCK**, broadcast tag **No Name**.
- `radio-bnm-biograd-na-moru-94-0-100-5-mhz-etali-te-kneza-branimira-2-i-biograd-na`: listing **Radio BnM - Biograd na moru 94,0; 100,5 MHz**, broadcast tag **No Name**.
- `radio-drni-89-0-mhz-kralja-zvonimira-8-drni`: listing **Radio Drniš 89,0 MHz**, broadcast tag **Radio Drniš**.
- `radio-akovo`: listing **Radio Đakovo**, broadcast tag **Radio Dakovo**.
- `radio-hrvatsko-zagorje-krapina`: listing **RADIO HRVATSKO ZAGORJE KRAPINA**, broadcast tag **No Name**.
- `radio-kampus`: listing **Radio Kampus**, broadcast tag **No Name**.
- `radio-kor-ula-107-5fm-kor-ula-island-kor-ula`: listing **Radio Korčula 107,5FM**, broadcast tag **Radio Korcula**.
- `radio-kri-evci`: listing **Radio Križevci**, broadcast tag **no name**.
- `radio-krka-krke`: listing **FENX FM**, broadcast tag **FENX FM - Glazba koja ostaje**.
- `radio-labin`: listing **Radio Labin**, broadcast tag **RADIO LABIN MP3 256**.
- `radio-maestral`: listing **Radio Maestral**, broadcast tag **Radio Maestral Pula**.
- `radio-marija`: listing **Radio Marija**, broadcast tag **RADIO MARIA CROATIA**.
- `radio-megaton`: listing **Radio Megaton**, broadcast tag **Radio Megaton LIVE**.
- `radio-nu`: listing **Radio NU**, broadcast tag **NU - IMOTSKI**.
- `radio-otok-krk`: listing **Radio Otok Krk**, broadcast tag **RADIO OK**.
- `radio-preporod`: listing **Radio Preporod**, broadcast tag **Radio Preporod Odzak 95,2**.
- `radio-prkos`: listing **Radio Prkos**, broadcast tag **No Name**.
- `radio-ritam-ibenik`: listing **Radio Ritam**, broadcast tag **Radio Ritam Sibenik**.
- `radio-slavonija`: listing **Radio Slavonija**, broadcast tag **none**.
- `radio-slunj-trg-dr-franje-tu-mana-14-slunj`: listing **Radio Slunj**, broadcast tag **No Name**.
- `radio-student-100-5`: listing **Radio Student 100.5**, broadcast tag **Radio Student stream**.
- `radio-techno-zagreb`: listing **Radio Techno Zagreb**, broadcast tag **Radio Techno Zagreb One**.
- `radio-velika-gorica-zagreba-ka-upanija`: listing **Radio Velika Gorica**, broadcast tag **No Name**.
- `radio-vinkovci`: listing **Radio Vinkovci**, broadcast tag **No Name**.
- `radio-vrbovec-94-5-zagreba-ka-upanija`: listing **Radio Vrbovec 94.5**, broadcast tag **Radio Vrbovec**.
- `radio-upanja`: listing **Radio Županja**, broadcast tag **No Name**.
- `replay-news-hrvatski-radio-informacija-svakih-5-minuta-zagreb`: listing **REPLAY NEWS - Hrvatski Radio informacija svakih 5 minuta**, broadcast tag **Replay News (Croatian) (MB STUDIO)**.
- `room-fm`: listing **Room FM**, broadcast tag **No Name**.
- `studentski-radio-unios`: listing **Studentski radio UNIOS**, broadcast tag **stream.mp3**.
- `super-radio`: listing **Super Radio**, broadcast tag **No Name**.
- `super-narodni`: listing **Super Narodni**, broadcast tag **no name**.
- `thompson-24-7-radio-nu-dalmatia`: listing **Thompson 24/7 - Radio NU**, broadcast tag **NU - IMOTSKI**.
- `top-radio-grad-zagreb`: listing **Top Radio**, broadcast tag **Antena Zagreb**.
- `top-radio`: listing **Top Radio**, broadcast tag **TOP RADIO AAC**.
- `top-radio-yugo-zagreb`: listing **Top Radio Yugo**, broadcast tag **Top YOU**.
- `tranzistor`: listing **Tranzistor**, broadcast tag **Tranzistor HR**.
- `enter-zagreb-club`: listing **Enter Zagreb Club**, broadcast tag **Enter Club**.

## URL variants to review

HTTP and HTTPS variants are only candidates; no automatic scheme rewriting or merging was performed.

- `prigorski-radio-antuna-gustava-mato-a-3-kri-evci`, `radio-kri-evci`

## Validation

- 56 tests passed, zero failures.
- Croatia production build passed.
- Localized SEO audit passed: 936 pages and 930 sitemap entries.

## Direct retry after removing Tunzilla prefix

32 of the 37 initial failures used a Tunzilla prefix. Retesting their original URLs succeeded for 30 and failed for 2. These 30 are reachable at origin; their initial failures do not establish that the stations are offline. Saved playback URLs were not changed. 282 of 289 URLs are now verified either through their configured URL or their direct origin. Seven remain unresolved.

- PASS: `http://s8.iqstreaming.com:8028/stream`
- PASS: `http://radiostream.optiklink.com:8200/live.mp3`
- FAIL: `http://144.76.39.214:6022/stream`
- PASS: `http://s8.iqstreaming.com:8002/;`
- PASS: `http://s8.iqstreaming.com:8006/stream`
- PASS: `http://s8.iqstreaming.com:8010/stream`
- FAIL: `http://s8.iqstreaming.com:8030/stream`
- PASS: `http://144.76.172.23:7043/;`
- PASS: `http://c5.hostingcentar.com:8360/;`
- PASS: `http://c5.hostingcentar.com:8354/;`
- PASS: `http://c5.hostingcentar.com:8348/;`
- PASS: `http://s8.iqstreaming.com:8066/stream`
- PASS: `http://c5.hostingcentar.com:8215/stream`
- PASS: `http://c5.hostingcentar.com:8221/stream`
- PASS: `http://c5.hostingcentar.com:8203/stream`
- PASS: `http://c5.hostingcentar.com:8275/stream`
- PASS: `http://c5.hostingcentar.com:8209/stream`
- PASS: `http://mcp1.mydataknox.com:8012/stream`
- PASS: `http://65.21.202.84:8356/stream`
- PASS: `http://proxima.shoutca.st:8559/stream`
- PASS: `http://patmos.cdnstream.com:8222/stream`
- PASS: `http://178.218.163.171:8024/stream`
- PASS: `http://live.mediaservis.hr:8084/stream`
- PASS: `http://comet.shoutca.st:8050/;`
- PASS: `http://s8.iqstreaming.com:8064/stream`
- PASS: `http://185.150.235.162:80/;`
- PASS: `http://144.76.219.22:8215/stream.mp3`
- PASS: `http://evcast.mediacp.eu:1960/stream`
- PASS: `http://shoutcast.pondi.hr:8002/;*.mp3`
- PASS: `http://144.76.172.23:7059/;`
- PASS: `http://rovinj.fm:8000/;`
- PASS: `http://c5.hostingcentar.com:8061/stream`

### Additional audio corrections from direct probes

- domoljubne-pjesme: ('AAC+', 128) → ('AAC', 128)
- narodni-aaaaaaa: ('AAC+', 128) → ('AAC', 128)
- narodni-ljubav-je-u-zraku: ('AAC+', 128) → ('AAC', 128)
- narodni-ne-pitaj-samo-sviraj: ('AAC+', 128) → ('AAC', 128)
- radio-dalmacija-fure-ta-splitsko-dalmatinska: ('AAC+', 96) → ('AAC', 96)
- radio-dalmacija-hajdu-ke-splitsko-dalmatinska: ('AAC+', 96) → ('AAC', 96)
- radio-dalmacija-fjaka: ('AAC+', 96) → ('AAC', 96)
- radio-dalmacija-oliver: ('AAC+', 96) → ('AAC', 96)
- radio-dalmacija-rokija-splitsko-dalmatinska: ('AAC+', 96) → ('AAC', 96)
- radio-sunce-splitsko-dalmatinska: ('AAC+', 96) → ('AAC', 87)
- radio-zlatar-krapinsko-zagorska-upanija: ('AAC+', 64) → ('AAC', 64)
- ultra-split: ('AAC+', 96) → ('AAC', 96)

## Country correction

Removed Radio Preporod (`7714e1fa-de27-42e9-83f6-d649d5aa4def`) from Croatia and added it to the import exclusion list: based in Bosnia and Herzegovina, per user correction.
