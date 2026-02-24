/* eslint-disable no-undef */

export async function up(pgm) {
  pgm.sql(`
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2203,90856,'Aldridge Saffron','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2204,90857,'Aldridge
001 212-879-7653
0207-22fg@aol.com','["212-879-7653","001 212-879","001 212-879-7653"]','[]','["0207-22fg@aol.com"]','From Black Book - 3 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2205,90858,'Alexander Pam
31215514 37588
mail: palexander@alexanderrog','["215514 3758"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2206,90859,'Agra bit Giacomo','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2207,90860,'Papike Si','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2208,22273,'London, W','[]','["London, W"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2209,10281,'Allan Paul
001 206 355 5777
Email: paul@vulcan.com','["206 355 5777","001 206 355","001 206 355 5777"]','[]','["paul@vulcan.com"]','From Black Book - 3 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2210,90861,'Allan, Nick & Sarah','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2211,90862,'Sallymarle, Rufus &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2212,90863,'Althorp, Charlie
6207-229 1573(1)
0207-637 8655 (W)
Alun-Jones, Carella
37238 60 0 4)
207-235-7769/9169 (2nd home
home & fax','["207-229 1573","207-637 8655","207-235-7769","0207-637 8655"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2213,90864,'Amon, Roberta 8','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2214,90865,'Maurice
PO18 8AP','[]','["PO18 8AP"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2215,90866,'Ivarez, Seno','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2216,90867,'Incenti
31334 27 80370)
0 34 1 563 8466 (f)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2217,38734,'Amon, Mr Philippe
70 Aubon
ine de Bou','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2218,90868,'Anastos, Lisa
88312 40 1781(y)
001 212 826 4908 (%))','["212 826 4908","001 212 826","001 212 826 4908"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2219,90869,'Anderson, Lulu
8396237 2020','["396237 2020","020 8396237"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2220,90870,'Appleby, Robert & Alex
1207-398 3400 (h)
A@Asia.debl.com
Eansepx@rockgacka.com
trango, Maite
ispaiter #10 (home','["207-398 3400"]','[]','["a@asia.debl.com","eansepx@rockgacka.com"]','From Black Book - 1 phones, 0 addresses, 2 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2221,90871,'Armstrong, Arthur &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2222,90872,'Cathy
001 212 737 7290 (h)
78g Park Ave
lact)
881281 859 3732 (W)','["212 737 7290","281 859 3732","001 212 737","001 212 737 7290"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2223,90873,'Aznar Jose
&S Capita
40 West 57th Street
7th Floor','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2224,90874,'Baca das Coisan','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2225,90875,'Bahrke Peter','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2226,90876,'Baker Danny
001 917 647 9649','["917 647 9649","001 917 647","001 917 647 9649"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2227,90877,'Bakhtiar, Shariar
8383770987(8','["8383770987"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2228,16504,'Baldwin Alec
881 316 283 2832(6)
0865 2, Falgard 0X1 3BJ
aylesford Hou
breton- in. Mar
+44 7831 136 210 Alice (P)
3139156 Georga
44 7836 747546 George Uk ce
and Lady Cr Anthony
81888371(
grest 12 in 3/ Clinton
N940027. 001 212 877 112
S/2d West igwlar.com
scheduler
47867 8488 Jim Kendes 1
(Hm)103-87/97 Yarranabbe Gar-','["316 283 2832","0027. 001 212","+44 7831 136 210"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2229,90878,'Darling Point
director
302800057057 cier pots-
82873895019 st. Helen','["3028000570","8287389501","02800057057"]','["82873895019 st. Helen"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2230,90879,'Barnes, Peter
001 213 621 2332 (W)','["213 621 2332","001 213 621","001 213 621 2332"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2231,90880,'Barnett, Craig
1779624 101 3dra Latham
646 227 4930 Denise Diaric
272348 0452 Joe Castion asst:','["646 227 4930","272348 0452"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2232,90881,'Bastone, Hillary
0207-259 6070','["207-259 6070","0207-259 6070"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2233,90881,'Bastone Hillary
entertainmentlines
0836-594-908(p)','["0836-594-908"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2234,90882,'Bastone, Tim Natasha
492 5802741
492 876593/
0492 860584 (h)
0492 76593 (w)','["492 5802741","02741 492 8765","0492 860584"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2235,90883,'Baumer, Lorenzo
Call 1:230328umarcom','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2236,90884,'Beaumont, Lord & Lady
212 249 6601 (Asst Erin Eagan)','["212 249 6601"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2237,90885,'Benson, Steven
801 312 32 7357 (','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2238,90886,'Bentinck, Baron
25th Floor
me)
0407307 (p)
Bentinck@msn.com','[]','[]','["bentinck@msn.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2239,90887,'Birchall, Martyn
1548 (h','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2240,90888,'Beckwith, Tamara
001 323 864 4005
81312181 1082
50 West 2bin Sireet
505000
.....
Email: bis-
NY, 1001
87 39 1002
917 822 9168','["323 864 4005","312181 1082","001 323 864","005 81312181","002 001 323","001 323 864 4005","002 001 323 864","917 822 9168","002 917 822","002 917 822 9168"]','["NY, 1001"]','[]','From Black Book - 10 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2241,90889,'Back Conna & Barbara
372 132 1306 NY (A
Blacker (Blogs 8 Jill, Mr','["372 132 1306"]','["372 132 1306 NY (A"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2242,90890,'Jak Hange
leeds Lani
61730892114
2911','["6173089211","0892114 2911"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2243,90891,'Dawson Place
0776 6012181
W5 OHS 1
....','["776 6012181","0776 6012181"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2244,17769,'Q01 212 397 4454(h)
001 646 841 6391 C.CCm','["212 397 4454","646 841 6391","001 646 841","001 646 841 6391"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2245,90892,'Bossom, Hon Bruce and','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2246,90893,'Penelope','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2247,14764,'La pron ale Rad
0207-589 8919','["207-589 8919","0207-589 8919"]','["La pron ale Rad"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2248,90894,'Brachetti Peretti','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2249,90895,'Fernando
Via Pincina 13','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2250,90896,'Rome
0198','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2251,90897,'Boucherie Sylvianne','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2252,53267,'B Ave Du Maine
003 1 4321 0790(
53 807 359712 Talib-internet fr','["003 1 4321 0790"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2253,90898,'Bourke, Rick
01 914 646 400
01 203 629 015','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2254,90899,'Brachetti, Hugo
00 39 0684 9344/3 pri@apioil','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2255,90900,'Braine, Caroline
0207-351 1499 (3)','["207-351 1499","0207-351 1499"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2256,90901,'Braine, Ms Kate &
881:0005 cara)
sudny.con
Brandolini d''Adda','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2257,90902,'Progina & fíberto
-. 814552 0916 fax','["814552 0916"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2258,90903,'Brandolini Nuno &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2259,90904,'Muriel
242 266 6948 (30 (1)','["242 266 6948"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2260,90905,'Brandt, Peter
001 561 798 0460 (h)
001 561 795 4128 (1)','["561 798 0460","561 795 4128","001 561 798","001 561 795","001 561 798 0460","001 561 795 4128"]','[]','[]','From Black Book - 6 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2261,20165,'Branson, Richard','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2262,90906,'Lo DonS Wilens','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2263,90907,'Briatore, Flavio','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2264,90908,'Broadhurst, Julia','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2265,90909,'NAwand 7%g0
639713812390)
mail: julia@cygnel.co.z','["6397138123"]','[]','["julia@cygnel.co"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2266,90910,'Broglie, Louis Albert de
14 is 78116 Frapeville','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2267,90911,'Brown, Chris & Alison
34 rue de Rane','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2268,90912,'New','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2270,90914,'Ruce, James
ucind','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2271,90915,'Brooks, Christopher ¿
Amand.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2272,96527,'Brunel, Jean-Luc','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2273,90917,'Carin Model
walton h
1209°5844310','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2274,12555,'Buck Joan Juliet
001 505 983 8683','["505 983 8683","001 505 983","001 505 983 8683"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2275,83802,'Buffet, Jimmy & Jane
40 Betear A 3948
mail: BrooksACC@aol.co.uk
011 917 496 9772 (a:)
ull, Bartl','["917 496 9772","011 917 496"]','[]','["brooksacc@aol.co.uk"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2276,90918,'Brooks, Miranda','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2277,90919,'Emma
00 41
7861 568125','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2278,90920,'Abingdon','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2279,90921,'Cammy
(1) 44 (0) 20 7824 7521','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2280,90922,'Caprice','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2281,90923,'Caruth, Sophie
229 one ViRoad','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2282,90924,'Carello Sara Massimo
0207-584 6919','["207-584 6919","0207-584 6919"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2283,90925,'Carey, William & Carina','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2284,90926,'London SR6482
209735182482','["482 2097351","09735182482"]','["London SR6482"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2285,90927,'Carlbom Camila
881 317 683 10335','["317 683 1033","0335 881 317"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2286,90928,'Carmine
88389933325758','["8838993332","758 8838993"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2287,90929,'Carrera, Barbara
001 373 478 9867 (3x)
arvalho, Michel
harlen
35 Con Cresent
0207-7301079 ()','["373 478 9867","207-7301079","001 373 478","0207-7301079","001 373 478 9867"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2288,90930,'Casagrande, Guldo','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2289,90931,'Case Simon','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2290,90932,'Case, George & Pauline
6205930484c.','["6205930484"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2291,90933,'Castaneda Debbie
335 634 9863
01672 621 237','["335 634 9863","01672 621 237"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2292,90934,'Cator, Alby and Victoria
i Meibury Road
4201-0029740
1603 72105
mail: 0585 33631','["201-0029740","0029740 1603"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2293,90937,'Cecil, Dr. Mark','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2294,90936,'Lenexander Square
SW3 2AY, UK
0314
37 225 00811|
mail: mark.cecil@gigpartners.co.uk
844863890 (Mistique','[]','["SW3 2AY, UK"]','["mark.cecil@gigpartners.co.uk"]','From Black Book - 0 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2295,90937,'Cecil Mark & Mini
PO Box 49428','[]','["PO Box 49428"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2296,90938,'Nairobi Kenya
0301996(770','["770 0301996"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2297,90939,'Cerina, Fabrizio','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2298,90937,'Cecil Mark & Mini
''ne Lawn HS1
taffieid Pari
09707 251395','["09707 251395"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2299,90940,'Cecil Stephenson','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2300,90941,'Aureli','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2301,90942,'Handich Collage','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2302,90943,'Gerutti Gian Carlo
Bas Sergeanta. London.cou Yi dam Sure Monterato
8838 142 459439 W
010 27
4th flac','["838 142 4594"]','["Bas Sergeanta. London.cou Yi dam Sure Monterato"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2304,90945,'Emm','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2305,90946,'Cohen Peter
881 305 771 537()
505 s:895@ihebox.com','[]','[]','["895@ihebox.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2306,90947,'Coleman, Jo
181 313 380 3610()
Hm)166 E. 63rd s
NeYo 02.','["313 380 3610"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2307,90948,'Coordinate, Nicholas &
Email:
020 7229 4253 Nick (wt)
715 172 7','["020 7229 4253"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2308,90949,'Camilla
Bidasoa #5
vier
- 8T
Soa 129pa2x.
department 51
New York, N°
10002
1223 29034
erre
125 est 72ndl
russo
200-723 67.
55 21 2524 5682 (wf)
de Baecque, Patrick
3 8 11 87 9260
Email: pdebaecque@lefigaro.f
de Cabrol, Milly','["0002 1223 2903"]','["New York, N°"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2309,90950,'Dedieu, Jean &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2310,90951,'Paulette
10300 Peyron-sur-Tarentaise','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2311,88779,'De Cadenet, Alen
800218454 0384
de Clermont-Tonnerre,','["218454 0384","00218454 0384"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2312,90952,'Delen Luca','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2313,51,'De Georgiou, Anouska','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2314,90953,'Deil, Adam
020780297249 thomas friond
001 317 218 3579 (03','["0207802972","317 218 3579","020780297249","001 317 218","001 317 218 3579"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2315,90954,'Jeluca Dina & Fouar
hartuuni
New York Nt T0028
im)Vinowsle','[]','["New York Nt T0028"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2316,90955,'Cass
nd Cat
Email: 0171-243 164317
pPD Sports
1473 735 1304
sdolbey@msn.com/
donne maine de Badia
AUTI
9500 Mirepon
"rance
020783118138 (R)
87960 71 88 69 (Answering seve)','["171-243 1643","473 735 1304","0207831181","0171-243 1643","020783118138"]','[]','["sdolbey@msn.com"]','From Black Book - 5 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2317,90956,'Djerassi, Dale
881 899 699 8638(p)
olbey, Alex & Suzi
hort Hot
1997476 7742','["899 699 8638","997476 7742"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2318,90957,'Dorrit
0207-235 5957
loss, David & Christ
runle','["207-235 5957","0207-235 5957"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2319,90958,'Douglas, Diandra
917 2514939','["917 2514939"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2320,90959,'Dr Eli Wiesel
001 212 371 7029
0207-37 3998(9)','["212 371 7029","001 212 371","001 212 371 7029"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2321,90960,'Dreesmann, Bernard','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2322,90961,'Driver, Minnie
01 323 656 81991
mail: minxed@earthlink.n
Dubb; Anthony V.
6 East 79th st','["323 656 8199"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2323,90962,'Dubbens, Peter
0207 376 8755 (h)
.......','["207 376 8755","0207 376 8755"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2324,90963,'Segui dei atenagrou','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2325,90964,'Dubin, Peter
0207 376 875','["376 875 0207","0207 376 875"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2326,90965,'Duchess of York
Sunninghill Park SLs 7TH','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2327,90966,'AL 7885372153
01346 845698
202 938 4800 NYO - John
0144020-79786110 Kate
347-327-3599 Forn O Sullivan
212 419 7493 jenean f
Jucrev-Giordano,
-rancesco
Sir Antica Di San Vito 36
8838 113225033 (
314 720 0082 (%))','["7885372153","202 938 4800","144020-7978","347-327-3599","212 419 7493","838 1132250","314 720 0082","01346 845698","0144020-7978"]','[]','[]','From Black Book - 9 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2328,90967,'Duke of York','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2329,16136,'Buckingham Palace
SW1 1AA
011 44 7768 630630
Đ207 024 5955[wd
mail: aace@dial.pipex.com
4m Sunninghill |','["207 024 5955"]','["SW1 1AA"]','["aace@dial.pipex.com"]','From Black Book - 1 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2330,90968,'Ascot, Berkshire SL5 7тH
ance (f)
11844-873 070 Sunnino H
0207-930 1224 (wf)
01344-873 080
unninghill 1
11485-540 502 Wood Farm
Sand.
8200-930 2134 (Palace ex direc)
0207-243 0628 M
0207-024 58888 Sophie x
1207-930 2007 (w) x
•• rimane','["207-930 1224","200-930 2134","207-243 0628","207-024 5888","207-930 2007","0207-930 1224","01344-873 080","0207-243 0628","0207-024 5888"]','[]','[]','From Black Book - 9 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2331,90969,'Outhie, John & Charlotte
34 Queens Gale Terrace
1207-569 7993 (h)','["207-569 7993"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2332,90970,'Djabrailou, Umar
00709 5920 9000 r','["00709 5920 9000"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2333,90971,'Ecclestone, Bernie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2334,90972,'Eckon, Paul
0873 32 9801 (94','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2335,90973,'Edsel, Lucinda
3 Te Sassa
3207-62. 873a (1)
racy
home
(P)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2336,90974,'Amanda
ondat
208-968 67
0747 870754','["0747 870754"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2337,90975,'Elizabeth','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2338,90976,'Elliot, Ben
luinlessenllall
th Floo','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2339,16268,'Epstein, Ed
430 East B6th 1002
Email.
audi Arab
com
ondo
120711676
ris-
795 243672-
795 2439762','["672- 795 2439"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2340,90977,'Failetans, Olivier de
18a Alexandra Ave
890565 239 (R)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2341,42066,'Fanjul, Pepe
38 0928301)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2342,90978,'Cornelia, Terence &
8387-3999392 (#)','["387-3999392"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2343,90979,'Feeley, Fion
19 Chester Row','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2344,55608,'Ham Ashe House
dor & Lady','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2345,90980,'Patrick & Marta
mine
19 The Boltons
(btwn Sth & Madison)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2346,90981,'Feldman, Andrew
881 312 78 7324 (%)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2347,90982,'Fell, Helena','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2348,90983,'Fell, David & Anne
801 312 376 0221(b)','["312 376 0221"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2349,90984,'Beatrice
studio O:
bi7780z
53 2904
non
828383820','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2350,90985,'Fiennes, Martin','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2351,49864,'Fiennes, Ralph','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2352,90986,'Fiennes, Suzzana
ween West 2nd treet and','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2353,90987,'Fifer, Chuck
801 312 632 5797 (M','["312 632 5797"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2354,79292,'Ear Christopher &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2355,42139,'Finch Charles
8307-357 $638','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2356,90988,'Finklestein, Howard
310-392-4893','["310-392-4893"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2357,86679,'Firyal Princess
Fast 66th St
32109298','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2358,37373,'Fisher, Dan
801 312 1193713','["801 312 1193"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2359,90989,'Flick Mook
847:32118','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2360,90990,'Feanett Bobby &
32326 5882 mom','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2361,90991,'Forbes Zandy
8813110198','["8813110198","0198 88131101"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2362,90992,'Forbes, Steve & Sabine
Sedia 039 07321
ord, Kati
ord Modal','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2363,90993,'Kimo oran Patern
39 Et des Andre''s private
637 278 0374 KATIE''S FAX
212 219 6119 (w)','["637 278 0374","212 219 6119"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2364,90994,'Buck, Amy & Richard','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2365,90995,'Gucci
500222004 ()
001 313 980 3280()','["313 980 3280","001 313 980","001 313 980 3280"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2366,90996,'Forman Johnathan
raiser, Viole
01917 414 092
212242 S28xvy@verizon.net
Mencesco de la Garda,','["414 092 2122","01917 414 092"]','["Mencesco de la Garda,"]','["s28xvy@verizon.net"]','From Black Book - 2 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2367,90997,'Formby, Nicola
353 Fulham Road
9831 27579 (87
Email:
00 82 480 82095 0804','["095 0804 353"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2368,90998,'Forte, Rocco & Alia','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2369,74372,'D Lowndes Place
207-235 6565 (1','["207-235 6565"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2370,90999,'Fox Andrew
08 813 2220735()
00 613 206 030 00 613 86:
00 618 869 8398 fax','["813 2220735","618 869 8398"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2371,91000,'Fox, William & Lucinda
0 SW Grav
208-675 5625 g','["208-675 5625"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2372,91001,'Francey, Kathy
881 312 732 6549 (R)','["312 732 6549"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2373,91002,'Fraysse, Isabel
4 rue des Filles
00 33 7 427779706 03','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2374,91003,'Freud Mathew
07-291883
07-351 2626 (
lexandra"Alexandra"','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2375,91004,'Nina
try)
50% 1788','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2376,91005,'Vairob
001 646 251 2211','["646 251 2211","001 646 251","001 646 251 2211"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2377,91006,'Gardner, Adam
001 212 691 9660','["212 691 9660","001 212 691","001 212 691 9660"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2378,91007,'Garland Michael
8207373772','["8207373772","07373772 8207"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2379,91008,'Garson Jeremy
0207-371 3284','["207-371 3284","0207-371 3284"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2380,91009,'Moraleja','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2381,91010,'Geary Tim','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2382,91011,'London SV
Email: cribon@prd.co.uk','[]','["London SV"]','["cribon@prd.co.uk"]','From Black Book - 0 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2383,91012,'Privist','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2384,91013,'Gibson, Caroline','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2385,91014,'Gilfilan, Andrew','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2386,91015,'Gillford, Lord & Lady','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2387,36428,'L2 Ashmabe Street
9201213128(1)','["9201213128"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2388,91016,'Gilmaur, Andrew &
0012125330656(1)','["0012125330","0012125330656"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2389,91017,'Ginsberg Gary
881313873 703y
Email: gginsberg@newscorp.com','[]','[]','["gginsberg@newscorp.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2390,91018,'Gittls, Howard','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2392,91020,'Giussani Luca
1305 867 9731,
email: giussani@dorial.','["305 867 9731"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2393,91021,'Glass, Charlie
87378 387876(P)
.....','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2394,91022,'Golinkin, Sandy
220 7200 Apt. 170
081212 2367660()
917204002 condenas
/tim.::','["081212 2367"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2395,90919,'Emma
apostolic Diocesan','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2397,91024,'Granby, David
862388 7','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2398,91025,'Grange, Jacques
9 rue de Beaujolais
60 33 127037455 ()','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2399,91026,'Grant Jamie
001 212 861 6571(b)','["212 861 6571","001 212 861","001 212 861 6571"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2400,91027,'Greece Princess Olga
001 212 628 123
• Prisca Pas
Gringg Geordie & Katt-','["001 212 628","001 212 628 123"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2401,91028,'BS en89 080 ajk Grders
0207-221 5758(h)
07977 695 830 Celt
313 89 4818 (n','["207-221 5758","0207-221 5758","07977 695 830"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2402,91029,'Grossman Lloyd
0207-736 7376','["207-736 7376","0207-736 7376"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2403,91030,'Gubelmann, Marjorie
39282 250','["282 250 3928"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2404,91031,'Guccioni, Tony
881 313 22 830','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2405,91032,'Valesci
* Yest 6707
ew Yor.
· 100~
12 57070
& Bert Fie
.... =
001 412244007
0804 25302
0207-823 4114
6338 (h)
310 276 5646
543 5513
278 6578 (Peggy w)
1000 (Aspen)
310 5031988()','["001 4122440","207-823 4114","001 41224400","0207-823 4114","001 412244007","310 276 5646","513 278 6578","310 5031988"]','[]','[]','From Black Book - 8 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2406,83806,'Hammond, Dana
§14 684 6165 weekends
lanover Ernst & Chant:
tinchamt :
6207-735/22(1)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2407,91033,'Hanson, Brook','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2408,91034,'Hanson, Lord & Lady','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2409,91035,'Kimber Cottage','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2410,75150,'Hanson, The Hon Rob-
ne Garden House
festonbi
01666 880 491 h','["01666 880 491"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2411,91036,'Gios GLB 8QQ
01666 880 313 (hf)
on Laton Place
X8A
235-3588 148 Eaton
... :','["01666 880 313"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2412,91037,'Hapsburg, Marie
1 Fernshaw Road
andon, swi0','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2413,91038,'Harvey Victoria
07 798 555999
Harvie-Watt, Isabelle
82 39 2 801984 (5)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2414,86413,'Haslam, Nick','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2415,91039,'Hay, Henry & Patricia
R4 7 0028
881 342 387 1635฿
3513(hp
Email: 001 603 5194 (PP)','["342 387 1635","001 603 5194","0028 881 342"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2416,91040,'Hayworth Reggie
radwel grovı','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2417,91041,'Burford
07993 822734
Hader-amsigh, Glare
8282 0 2 (k (0)','["07993 822734"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2418,91042,'Macaroo Barry & Susan','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2419,19693,'O Western Roar','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2420,91043,'Hauteville, Marc de
00 33 1 4224 4385 (h','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2421,91044,'Helen and Tim Shifter
• Helvin, Marie
0207-834 5321 (b)','["207-834 5321","0207-834 5321"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2422,91045,'Herbert Jason
83072822330
881 48 873 8783
nentom
......
abel','["8307282233","072822330 881"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2423,91046,'Himmeistein, Howard
: 212-620-0949','["212-620-0949"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2424,91047,'Andre','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2425,91048,'Hoffman, Jessica
185 Flddlers Hill Road
0874409 Maland 21037
207-730 4068 0
7768 258 126 (g)
Email:
ali@ caledonpartners.cc
niBroadmoore Farmhouse
home','["207-730 4068","037 207-730"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2426,91049,'Near Sherbourne and Clapton
one hi, Bourton on the Water
6L54 2L0
020098 201 vana Bastiani
Holland-Martin, Ben','["020098 201"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2427,91050,'Radnor Walk
andon Su
207-351 3631 (','["207-351 3631"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2428,91051,'Hovenian, Nina
001 212 996 1687(h)','["212 996 1687","001 212 996","001 212 996 1687"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2429,91052,'Hovnanian, Shaunt
lovanlan Grouc
) Naversink River Ro','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2430,91053,'Sector gold Bird
908-462-8200
908-462-2789
908-530-8511 Sall
008-741-0078 (hi Vahkn - the
212-398-9688 Mina
Howard J. Kaplan','["908-462-8200","908-462-2789","908-530-8511","008-741-0078","212-398-9688"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2431,91054,'Horne Adam & Tierney
717 N. Bayshore Driv
uite 200
(305) 539-313
osa @kaplangroup.com
0SNE9 PaL 33179','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2432,15522,'North Miami Beach,
308 466 9354 (1)
828934179892','["308 466 9354","8289341798"]','["North Miami Beach,"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2433,91055,'Isu, Petel
01 212 734 6007(h)','["212 734 6007"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2434,91056,'Hunt, Laura
1012226.40134. 1002
101 212 355 3822 W
mail: LBHunt@aol.co
m)3525 Turtle Greek Blvd. (t','["012226.4013","212 355 3822","002 101 212","002 101 212 355"]','[]','["lbhunt@aol.co"]','From Black Book - 4 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2435,91057,'Georgi Gordon, Kit &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2436,29488,'London war Street
0207-229 7568(1)','["207-229 7568","0207-229 7568"]','["London war Street"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2437,91058,'Hunter, Carlyn & Laurie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2438,91059,'Haytsman, Jon & Mary
369 Military Way
34 80 3647998(8410','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2439,91060,'Hurd, Nick & Kim
888381020(1)
20709622','["709622 8883","0709622 8883"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2440,91061,'Hurst, Anne
12 744 348
31 537 766
hurst, Robert J','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2441,32969,'Goldman, Sachs ace
0207-727 8782 (h)','["207-727 8782","0207-727 8782"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2442,91062,'Hutley, Lulu & Edward','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2443,13621,'Sides Sir, homone d
lades Farn.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2444,91063,'Near Surrey GS OLT
0207-203 1435 (L4)
0860 508995
• SaS 0208(7)
0483 892000 (W)
0207-493 4217 (h)','["207-203 1435","207-493 4217","0207-203 1435","0860 508995","0483 892000","0207-493 4217"]','[]','[]','From Black Book - 6 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2445,83795,'Hutton, Lauren
312-3517 boyfriend Luca','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2446,91064,'Hymes ivan
Eddle''s fry
friend)
00 35 3 87234 1489','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2447,91065,'Inca','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2448,91066,'Anancy Park South
New York, near 20th & Park)
317672180(p)
ind, Charlie','[]','["New York, near 20th & Park)"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2449,62707,'Union Cheyne Row
0207-383 6353 (3),
917 922 4947 (p)','["207-383 6353","917 922 4947","0207-383 6353"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2450,91067,'Ireland, George','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:01') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2451,91068,'Ky Tor Volvy Picadilly
3207322498 (%)','["3207322498"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2452,91069,'Irvine, Eddie
0786 660 7693 (p)
İsamel Abdullah','["786 660 7693","0786 660 7693"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2453,91070,'Isham, Chris
001 212 496 5842(w)','["212 496 5842","001 212 496","001 212 496 5842"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2454,33,'Jackson, Michael
samgentaw@netscape.com','[]','[]','["samgentaw@netscape.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2455,91071,'Jacobson, Julian
0207-589 2237 (h)','["207-589 2237","0207-589 2237"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2456,34,'Jagger Mick
32268569550(0)
• Jarecki, Nancy & An-
drew
mali
I.com
3906
com','["3226856955"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2457,91072,'Javier
ounin','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2458,91073,'Barry email
2927128 409019 unitian 2004','["927128 4090","004 2927128","004 2927128 4090"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2459,91074,'Karella, Kalliope','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2460,91075,'Kastner, Ror','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2461,91076,'Piaz, Anton & Robin
M2 0. Y 10021
1410-657-883
and Gay
clean Virgin
73 Bigelow SI','["0021 1410-657"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2462,91077,'King, Abby
andor','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2463,25145,'Koch, David','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2464,91078,'Kirwin Taylor, Charlie &
801 312 032-1059 (₺','["312 032-1059"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2465,91079,'Heler','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2466,91080,'Kohl Astrid','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2467,91081,'Rue Bonapar','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2468,91082,'Kirwin Taylor, Peter
001 212 888 0020','["212 888 0020","001 212 888","0020 001 212","001 212 888 0020"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2469,13167,'Kissinger, Dr. Henry A
3800 treet NW
Washington D.C.
01 202 872 030
2000 6','["872 030 2000"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2470,91083,'Klee, Rupert & Charlotte
00 49 171 3326239 (p)','["171 3326239"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2471,91084,'Kotic Boby
281 318 758 3388
mail: BKotick@activision.com','["318 758 3388"]','[]','["bkotick@activision.com"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2472,91085,'Kotze, Alex Von
27 York Gardens
020749154366 (w)','["0207491543","020749154366"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2473,91086,'Kravetz, Anna
001212 288 2815','["212 288 2815","001212 288","001212 288 2815"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2474,91087,'Krooth Caryn
001323 882 6328(h)','["323 882 6328","001323 882","001323 882 6328"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2475,91088,'Kiesch Johnathan
3385 37267
Email: johnathan@klesch.co.uk
ade de vera poom no.','[]','[]','["johnathan@klesch.co.uk"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2476,91089,'Kudrow, Alistair
811 334252723762(w)','["811 3342527"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2477,91090,'Lal Dalamal
7 York Gate','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2478,91091,'Lambert, David
212 864 1535 (h)
117 748 3946 (c)
561 863 4140','["212 864 1535","117 748 3946","561 863 4140"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2479,91092,'Lalaunis, Demetra','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2480,91093,'Lambert, Christopher
88121924 22 03
ell 07 785 99660
sst. (h) 0208-673 5090(renat:)','["208-673 5090","0208-673 5090"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2481,91094,'Lawton Paul
7946 584701
207-577 1835(4','["207-577 1835"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2482,91095,'Lazar, Christophe &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2483,91096,'Marie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2484,91097,'Laviada, Laura D.B. de
001 858 735 6494(р
49795045172 sure cell','["858 735 6494","4979504517","001 858 735","001 858 735 6494"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2485,91098,'Lawford Christopher &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2486,91099,'Jean
31838 a home cell
Le Bon, Simon & Jas-
mine
208-878-5858 i
Le Fur, Jean-Yves
104 Rue de l''Université
20 33 4705 460
0 33 4705 4600
001 331 0752 6726','["208-878-5858","001 331 0752","001 331 0752 6726"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2487,91100,'Lo Marg, Willie
55 E. 76th St.
3872 2 403 3507()
12 737 040
081 305430 9993 Btas cell
305 491
305 496 1988 Pictora (previous)
385338 5578 Sonia (p) House -
вере','["040 081 3054","305 496 1988","385338 5578"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2488,91101,'Liman, Doug
881 212 338 3202
Email: dliman@hypnotic.com
indeman-Barnet, Sloane
89 561 655 2926 (Sloane direct)
abedemann, Adam & Eliz. Lindsley, Blake','["212 338 3202","561 655 2926"]','[]','["dliman@hypnotic.com"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2489,91102,'Linley David
0207-730 7300 (w)
Liógos, Babis
88/2 2850','["207-730 7300","0207-730 7300"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2490,91103,'Lister, Paul
0207-431-1898 (w)','["207-431-1898","0207-431-1898"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2491,91104,'Livanos, Arriette
881 313 380 263 (+)
0 Cascio Robert
live Wtr
vre','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2492,91105,'Lottie
Lanchi 378 Street','[]','["Lanchi 378 Street"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2493,35,'Love, Courtney','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2494,91106,'Lowell Ivana
265 East 66th St
071212988 4828','["212988 4828","071212988 4828"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2495,14010,'Loyd Mark','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2496,91107,'Lucas, Colin
01865 270 243
ack, Carol & Et','["01865 270 243"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2497,91108,'Mailer, Michael
2800k ON: 87 11201','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2498,91109,'Brooklyn
01 7 18 834 002
001 212 343 7916 (w)','["212 343 7916","002 001 212","002 001 212 343"]','["Brooklyn"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2499,91110,'Greenwich Street, Suite
New York, NY 10013
fache
Email: pe.
+44 207 219 4607 (w)
tract
(as-
noor
2272 80 5655','["207 219 4607","+44 207 219 4607"]','["New York, NY 10013"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2500,91111,'Valentino
de Lar
chins Wr
1635-299986
baltic Modes
207-225 035','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2501,91112,'Barbara
82073*81 0127
90 33442319753
email','["3344231975"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2502,91113,'Maxwell, Debbie
0707387507','["0707387507"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2503,91114,'Matell, Dr & Mrs
26 Florence S
Maxwell,','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2504,91115,'Cunay street House
SWW sux.
Emiloragnad sur Ledernet.com Maxwell, Isabel
Lo el aces 150
50 3585 336 5179 Guy and Anne','["585 336 5179"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2505,91116,'Thonelle
80533639(0)
wtesontouch.com
0207-780 3289 ()
301 90 652780(h)
01865-926297 (0pi)
809850 747 0608 Daie Djerassi','["207-780 3289","850 747 0608","0207-780 3289","01865-926297","09850 747 0608"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2506,91117,'Maxwell, Lan & Tara
Hyde Park Gate (h)
59073B.
8207-3810419(
ayerde Networks Ltd (Y','["207-3810419"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2507,91118,'Portman Square','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2508,49525,'Maxwell, Kevin and
81481-632263 (#)
Email:
kra talAvente.com
0287 486 63504900 N','["287 486 6350","0287 486 6350"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2509,91119,'Maxwell, Marcella
3 Penn Road
опас
207-584 1544 (
207-379 (
207-836 5318 V','["207-584 1544","207-836 5318"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2510,91120,'Mazzoti, Mateo
00 39 335 1331 3333','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2511,91121,'MC & Allenor
-ime close
rayton Abingdon
8x94 shit
220-22621
Email:','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2512,91122,'AcAlpine Alistair &
comill','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2513,17988,'IT Papad Hotel
san Marco
1207-723 9309(W
860 203310(car','["207-723 9309"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2514,91123,'AcDonald, John
01212 966 2727 (и','["212 966 2727","01212 966 2727"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2515,91124,'McFarland, Anthony
887 885 360 2233 (','["885 360 2233"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2516,91125,'Kenzie, Raymor
and freres & 1
65 East 76th Street','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2517,91126,'Mclancy, Cas
8783-14000379 (4)
7cmpuserve.com','["783-1400037"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2518,91127,'Mclane, Shannon','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2519,91128,'Cose Belle
001 212 988 4210','["212 988 4210","001 212 988","001 212 988 4210"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2520,91129,'Mcleod Jock & Pru','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2521,91130,'Lansdowne Cre
0038 B2319','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2522,91131,'Menzies, Kate
ob On ensgate Men
207-581 838718
.....','["207-581 8387"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2523,91132,'Mermagon, Mr Jonathar 981 397 981 4398 (Justin p)
9 Weatherby C','["397 981 4398"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2524,91133,'Metcalf Justin
02075918807(','["0207591880","02075918807"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2525,91134,'Montz Robin
001 313 866 8466','["313 866 8466","001 313 866","001 313 866 8466"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2526,91135,'Meyer, Tony
644 Broadway #8W','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2527,91136,'Metcalf Melanie & Julian','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2528,91137,'Micklethwait, Fev &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2529,91138,'John','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2530,91139,'Letcalfe Julian','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2531,91140,'Felani
0207-827 6300(w)','["207-827 6300","0207-827 6300"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2532,91141,'Bennet Longe
81993 898828 (n)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2533,91142,'Metcalfe, Justin & Joane
301561 804 6646(h)
Email:
alpal','["561 804 6646","01561 804 6646"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2534,91143,'Milani, Gianluca','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2535,29726,'Mills, Cheryl
@mai. camine@hotmail.com','[]','[]','["camine@hotmail.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2536,91144,'Georg, Carie & Bell,
001 516 671 0338','["516 671 0338","001 516 671","0338 001 516","001 516 671 0338"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2537,91145,'Minot, Susan
West 9th Street A
12124 0 1092','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2538,91146,'Mischer, Kevin','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2539,91147,'Vodafferi, Daniel
Ta S.Marta 1
00 39 2 86451573 (h)
00 39 2 8572','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2540,91148,'Moncada Cico
0410 352999
..•
Vionckon.
email:
44 7.
ICLT
220005SW1','["352999 0410","0410 352999"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2541,21103,'New York
rell
0207-371 257
37973 17636','["371 257 3797","0207-371 257"]','["New York"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2543,91149,'MO UOou','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2544,91138,'John','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2545,91150,'Jayne','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2546,91151,'Noel Alix
303 Park Ave','[]','["303 Park Ave"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2547,91152,'Exton Oakham Leicestershire
0780 86488 (1)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2548,91153,'Noel, Vanessa','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2549,91154,'Noha, Cecilia
001 212 683 4649','["212 683 4649","001 212 683","001 212 683 4649"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2550,91155,'Noonan, Tim
001 212 446 366
f rang am ioa (y)
3207-306820)
Hm) / Queenscale Place
Mews(w
Se 0 328 (0)','["001 212 446","001 212 446 366"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2552,91156,'Oswald, William 8','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2553,91157,'Arabella','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2554,91158,'Buckton Park','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2555,91159,'Craven Arms
381 97 82 8K3700U
schard En
deto','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2556,91160,'Salisbury
02072590775 2nd home
otto, Beo & Edvige
8833143472323 (8)','["0207259077","8833143472","02072590775"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2557,91161,'Patent Edmunds, Tom &
VY NY 1002
0468 89337
lat number','["002 0468 8933"]','["VY NY 1002"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2558,91162,'Onslow
.ondon sw','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2559,91163,'Brigitte
VERTOT
27:
CUL.COn','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2560,91164,'Paschen, Elise
807 312 769 271 (n)
PARA N Om Florin)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2561,91165,'Prastoma Saracey','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2562,17691,'N.Y. NY 10023
313981 2902 Portable
917-520-7294 car phone','["313981 2902","917-520-7294","0023 313981"]','["N.Y. NY 10023"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2563,91166,'Ex President of Amadres
are a A N7126','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2564,91167,'Jogata, Columbia South Amer','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2565,91168,'Patricof, Alan & Susan','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2566,91169,'Bal Prack Avenue
212 Y0Tk, NY 10021','[]','["212 Y0Tk, NY 10021"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2567,12606,'Paulson, John
2881 213 383 337 (0)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2568,91170,'Ricardelli, Cosima &
203 967259
7 East 57th','["259 203 9672"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2569,21103,'New York','[]','["New York"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2570,91171,'Review
ice
001 212
331473173275184 Derny''s cell
com or phone
G.S.p.A
leyerly Hills
alia
2 9093457
......','["001 212 3314","7317327518","093457 ...... 001","001 212 33147317"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2571,91172,'Porthault, Pascal','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2572,91173,'Place du General Catrou
0 35 273. 6479()','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2573,91174,'Porthault, Remi & Isabel
3 Avenue Charles de Gaulle
10 33Y 3737 1400 France
New York, NY 10028
60T212 439 6 187 (b)','[]','["3 Avenue Charles de Gaulle","New York, NY 10028"]','[]','From Black Book - 0 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2574,91175,'Potter, Muffie
81312 9931 352518)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2575,91176,'Prestin, Electra
001 212 879 4214','["212 879 4214","001 212 879","001 212 879 4214"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2576,91177,'Prevost, Catherine
20 Egerton Gardens
0207-584 5240 (h
001 212 628 642:','["207-584 5240","0207-584 5240","001 212 628","001 212 628 642"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:02') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2577,91178,'Price, Charles H. II','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2578,91179,'San Sty gru 64111
001 816 931 2720
Gm)1518 N. Astor Street
3127008347
599/
(Mary. Ryan)
12 664 0889 (fax)','["816 931 2720","3127008347","001 816 931","008347 599","001 816 931 2720"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2579,91180,'Doss
NY 1001,','[]','["NY 1001,"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2580,91181,'Pritzker, Thomas
lumero Und
• Madison
S8 02 88401
mail:','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2581,86679,'Princess Firyal
1313
(g)
5157
(hf)
tame
113 78 8Bl Emergency con-
$92 7S0 3400 Main Office Num-
101 212 421 1117(w)
mail: propppbros@aoi.com
Email: npritzker@earthlink.net','["212 421 1117"]','[]','["propppbros@aoi.com","npritzker@earthlink.net"]','From Black Book - 1 phones, 0 addresses, 2 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2582,91182,'Rachline, Nicholas
001 516 537 0123
0207-589 4463
4031, 3913913 uk cell','["516 537 0123","207-589 4463","001 516 537","0123 0207-589","001 516 537 0123"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2583,91183,'Radziwill Carole
805(0)
B8P 193 en to 10012
507 92 43 078418(0)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2584,91184,'Rappaport Don
803 390 00 0()','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2585,91185,'Rattazzi Isabel
8013138809','["8013138809","013138809 8013"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2586,91186,'Raynes, Patty
881 27 180 208 Manda','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2587,91187,'Reardan, Kate','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2588,91188,'Reynal Michael
8054613381 mum','["8054613381","054613381"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2589,91189,'Reynal, Miquel
fontivideo 1331
en:','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2590,91190,'Argentina
08 541 92098867 k','["541 9209886"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2591,91191,'Reza, All
60136830 degeam.com
vers, Jor','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2592,91192,'Robilant, Mr Edmondo
di Maya
0208-788-780060','["208-788-7800","0208-788-7800"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2593,91193,'Robir
001 212 720 3200 a (w)','["212 720 3200","001 212 720","001 212 720 3200"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2594,91194,'Claudia','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2595,91195,'Noreen
W92 PH','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2596,91196,'Pai
ors 750n
.co','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2597,91197,'Rudnick, Della
001212 582 8111(4),
001407 333 a1f','["212 582 8111","001212 582","001407 333","001212 582 8111"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2598,91198,'Russel, Michelle
27S N910028 St,
0813132223873(','["0813132223","0813132223873"]','["27S N910028 St,"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2599,91199,'Rust, Marina & lan','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2600,39362,'BE 7oth Street (ti)
21253958566 10021
Email: mmmust@aol.com or
Hm)lan-office
azard Freres
a Rockefeller Pla
12 632 2650 lan 11
001 917 679 3705 lan (P)
207 734 2260 Maine
212 632 2650 lan work','["2125395856","917 679 3705","207 734 2260","212 632 2650","001 917 679","001 917 679 3705"]','[]','["mmmust@aol.com"]','From Black Book - 6 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2601,91200,'Rustow, Tim
128 10029 ST
1 646 61302731
7 302 0909 calle
Rutland Duke and Duch: 001 212 754 6750(w)
ess','["646 6130273","212 754 6750","001 212 754","001 212 754 6750"]','["128 10029 ST"]','[]','From Black Book - 4 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2602,91201,'MR Granteer','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2603,91202,'Saffra, Edmund
001213-33-537 *
97476 370262','["370262 0012","0262 001213"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2604,91203,'Ruttenberg, Eric & Perri
0012123335480
833145011868(2','["0012123335","480 8331450","0012123335480"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2605,91204,'Sainsbury, Mr Jamie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2606,91205,'Ryder, Mr Nicholas
4 Comwall Garder
207-8232070 (n)','["207-8232070"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2607,52807,'Sacco Amy
101 917 518 010
Email: amy@lot61.com
0012127501563(','["0012127501","0012127501563"]','[]','["amy@lot61.com"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2608,91206,'Salama, Eric
1212032 2332(0
207-763 52','["212032 2332"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2609,91207,'Samuels, Mia
ABC PREST 8194 (w)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2610,91208,'Sandelmar','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2611,91209,'Jon
635 Park Ave
212 8618008','["212 8618008"]','["635 Park Ave"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2612,91210,'Sangster, Guy & Fi','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2613,91211,'Corrie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2614,91212,'Sangster, Mr Ben
07352004330','["0735200433","07352004330","004330 07352004"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2615,91213,'Mario','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2616,91214,'Shad, Brenda
12 777 112
mail: brenda schad@verizon.net
imon','[]','[]','["schad@verizon.net"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2617,91215,'Shuster Susie
001 312 057 8572(','["312 057 8572","001 312 057","001 312 057 8572"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2618,42209,'Siegal, Peggy
125 East 74th(h)
313310-003104
2-966-5000
2-966-4277/v
229992200','["313310-0031","000 2-966-4277"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2619,91216,'Henry
917-991','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2620,91217,'Camel
46260,
803738030 2),','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2621,91218,'Sophie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2622,91219,'Snyder, Maria','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2623,91220,'Sindi, Rena & Sami
313 Park Avenue, 10th Floor','[]','["313 Park Avenue, 10th Floor"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2624,21103,'New York
69212 734 3236','["212 734 3236"]','["New York"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2625,17441,'Slayton Bobby
081318995 3993(R)','["318995 3993","081318995 3993"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2626,91221,'Smith Osborne
19 S/twell Gardens
5008-0092177','["008-0092177"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2627,91222,'Smith Peterson, Noona
OD 392 7200 4527','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2628,91223,'Samos, Rupert & Mily','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2629,91224,'Sobrino, Esperanza','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2630,91225,'Acquavella Galleries','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2631,91226,'Solomon, Andrev
ha New York Times
18 West 10th 10011-8702','[]','["ha New York Times"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2632,39384,'New York, NY
312-474-2520 ()
154 ningion PonGo
ensinaton Park H','["312-474-2520"]','["New York, NY"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2633,22273,'London, United Kingdom W11
0207-327 5533 (п)
oros Pett, Soros','["207-327 5533","0207-327 5533"]','["London, United Kingdom W11"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2634,91227,'Ennismore Gd
8387238 289 515 Sharon,','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2635,91228,'Soros, Peter
00 Park Ave
2207-323 4564 York 1002
001 312 891 3750 ()','["207-323 4564","312 891 3750","002 001 312","002 001 312 891"]','["00 Park Ave"]','[]','From Black Book - 4 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2636,91229,'Soto, Fernando de','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2637,91229,'Soto, Jaime & Marina de
207-584-7910 ()','["207-584-7910"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2638,91230,'South, Hamilton
01 212 686 2241 ()
81 312 328 5533 Regan','["212 686 2241","312 328 5533"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2639,86756,'Souza, Carlos','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2640,91111,'Valentino
0335 372103
0 39 (0) 6 361234 ()
73936
811 38 2 654 5223 ()','["0335 372103"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2641,91231,'Jacey, Kevin
ont Production
753 La Cienega Boulevard
1 411
CA 90089
19360 1512 0','[]','["753 La Cienega Boulevard","CA 90089"]','[]','From Black Book - 0 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2642,91232,'Squire, Hugo
38 Even SWardens
0207-2450496
St. Bris, Edward
3B00 Par Si Honore','["207-2450496","0207-2450496"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2643,91233,'Carolyn Tanburry
207-373 1555 ()
PELE
a ranki Thomas','["207-373 1555"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2644,91234,'Steenkamp, Chris
082-567-9801
082-928-9235
054-431-0082 Office Fax','["082-567-9801","082-928-9235","054-431-0082"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2645,91235,'Steiner Jeffrey
01212 3086700()','["212 3086700","01212 3086700"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2646,91236,'Sininkampf, Chris &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2647,91237,'Stengel, Andrew
38 FT D 163 M 10014)
Email: an-
002•
Stracher,','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2648,91238,'Kate
0207-371 2571
5 Bury Wa','["207-371 2571","0207-371 2571"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2649,91239,'Cristina','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2650,91240,'Taki
юу buo','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2651,91241,'Tate, Rupert
5 Inworth Street
12-345-37081
61-832-070','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2652,91242,'Taubman, Bobby
001882728
001 212 541 6400(w)','["212 541 6400","001882728 001"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2653,91243,'Tavoulareas, Mr Billy &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2654,91244,'Nicket
ourtney Avenu
ngate Londor
220-38 321 83
N6 4LP','[]','["N6 4LP"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2655,91245,'Tavoulareas, Peter','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2656,91246,'Tandon Avenue
0207-289 9725 (t)','["207-289 9725","0207-289 9725"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2657,116,'Taylor, Emmy
144_1865-559181.
144 1865-559181
144 7956 509 659 Laura si
07956 248 584 (P)
323 650 7588(h)','["181. 144 1865","181 144 7956","323 650 7588","07956 248 584"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2658,75042,'No. Only
323822 1928 #)','["323822 1928"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2659,91247,'Tennenbaum, Harry
010 212 722 3055
Teodorani-Fabbri, Edu-
980 sir. Saund king
ake Fores
004
11447803 956782(p)
Email: eduardo@
do merit Royal hurt House
1208-479 885
44 1268 292 629 wl
24288 295383 Karen Bick-Lon-
007 04 207 8234758 h
+390115090662
-44 207 823 4768 0
-39 06 678 0783 (h','["212 722 3055","004 1144780","207 8234758","3901150906","207 823 4768","010 212 722","004 11447803","0115090662","007 04 207 8234","+390115090662"]','[]','[]','From Black Book - 10 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2660,91248,'Theilmann, Baroness','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2661,91249,'Francesca
811341815 3499','["341815 3499"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2662,91250,'Theodoli Catherine
301 305 931 42924
39 17
mail: theodoli@aol.com','["305 931 4292"]','[]','["theodoli@aol.com"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2663,91251,'Thoistrup, Moegens
BO 19 A 8807 (Vorah,)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2664,91252,'Tholstrup, Paola
1 Steffel Terrace
388 4373530','["388 4373530"]','["1 Steffel Terrace"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2665,91253,'Thompson, Barnaby
001 212 265 7621 (w)','["212 265 7621","001 212 265","001 212 265 7621"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2666,91254,'Tisch, David
email: davsl@h@edb.com','[]','[]','["h@edb.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2667,91255,'Tisch, Merry and Jimmy
9 East 79th Street
NOI 21899414 -','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2668,32510,'Tisch, Anne & Andrew
Red Park Ave. 10021.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2669,10697,'One Park Ave','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2670,91256,'Atath Floor
NOT 212345310016','["2123453100"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2671,91257,'Titopupolo Sonia
001 212 706 2457 (1)
''Odhunter, Emil','["212 706 2457","001 212 706","001 212 706 2457"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2672,91258,'Carle
0207@t2dhuoterearle.com
0468.473 793','["473 793 0207","0468.473 793"]','[]','["0207@t2dhuoterearle.com"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2673,91259,'Toledo Ignacio, Alvarez
88 367814877
001 305 582 917P
Man Řę
44795 183 524','["001 305 582","001 305 582 917"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2674,91260,'Tollman, Bea
011 207 235 9251','["207 235 9251","011 207 235"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2675,83810,'Tollman, Brett
(Hm)s Rue Latour','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2676,38743,'Treacy Philip
69 Elizabeth St.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2677,91261,'Tollman, Mr. & Mrs.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2678,91262,'Tollman, Syrie & Gavin','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2679,91263,'Tollman, Wyne
841 1 1002, H34€
801 212 345 6952 (#)','["212 345 6952"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2680,91264,'Toub, Veronica (Busson)
Rew aka N0021 USA','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2681,10495,'Trump Blaine & Robert
67 E 81 S
New York, NY 1002','[]','["67 E 81 S","New York, NY 1002"]','[]','From Black Book - 0 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2682,16834,'Trump, Ivana
01 212 319 450
097-02759 798 (w)','["450 097-0275"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:03') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2683,48130,'Trump, Ivanka
8079994 46 2617
paused]
00 33 620 87 71 74 (p work
home
LongOn,','["617 8079994"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2684,91265,'Mandy','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2685,91266,'Tancesc
1207 221 8245','["207 221 8245"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2686,24584,'New York Road
London SW3.
01-622 9933
07-351 00','[]','["New York Road","London SW3."]','[]','From Black Book - 0 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2687,91267,'Weinberg, Jasol
titled Entertainment
0 Fifth Avenue
partment 2t
mail: jwuntitied@aol.com','[]','["0 Fifth Avenue"]','["jwuntitied@aol.com"]','From Black Book - 0 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2688,68953,'In Sunset Entertainment','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2689,91268,'Suite 117
Beverly Hills, CA 90065','[]','["Beverly Hills, CA 90065"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2690,90319,'Weinstein, Bob
001 212 941 4030 (0)','["212 941 4030","001 212 941","001 212 941 4030"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2691,91269,'Weintraub, Harriet
205th AvNY 10021','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2692,92048,'Westheimer, Ruth Dr.
001 212 8619000','["001 212 8619","000 001 212","001 212 8619000"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2693,91271,'Weymouth, Mrs Lally
Flat 239 Chelsea Embankment 001312 5700040 (w)
207 734.771
131 8 8335','["001312 5700","001312 5700040"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2694,91272,'Wial, Jim','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2695,91273,'William Morrison Agency
01310 859 4200 (','["310 859 4200","01310 859 4200"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2696,91274,'Warkberg Anouska)
0207-602 5811 (','["207-602 5811","0207-602 5811"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2697,91275,'Wiesel Dr Eli and','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2698,91276,'Marion)
0012123717029 (
ryaram Lionel and','["0012123717","0012123717029"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2699,91277,'Wigram, Lionel','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2700,91278,'Wims Alexandra &
home Farn
henfor
Nilliams-Ellis, David 8
Helesor-Taylor, Tim &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2701,91279,'Carpenters Close
innerton
London SW1
1207.235
0207-309 9524(0)','["207.235 0207","0207-309 9524"]','["London SW1"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2702,91280,'Wiltis, Rebecca','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2703,91281,'Talbot Road','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2704,91282,'Winn, Steve
02 733 4123(w)
92393 1990
0207-499 3080 13711','["207-499 3080","0207-499 3080"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2705,91283,'Winston, Elizabeth','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2706,96528,'Wilmot-Sitwell, Alex & Fi Tavi, Roch, Kerney
081 973 905 7817(p)
Grates 99 netcom.com','["973 905 7817","081 973 905"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2707,91285,'Wilson, Carter
303 East 83rd Street
22S1016','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2708,91286,'Wipple, George
loumalist -Fox
001 212 949 0202','["212 949 0202","001 212 949","001 212 949 0202"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2709,91287,'Wolper Carol','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2710,91288,'Nindisch Grazot','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2711,91289,'Manfred','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2712,91290,'Wong, Andy
0777 618 8883 (P)','["777 618 8883","0777 618 8883"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2713,91291,'Woods Emily & Carrie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2714,91292,'Woodward, Alexa','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2715,91293,'Mandyward, Shaun &','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2716,44310,'O Ladbroke Road
2089212 (x.
mail: woodwards@msn.co
1919 596707 (Saun F)','[]','[]','["woodwards@msn.co"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2717,91294,'Worcester, Marc & Marc
1 Hatre Treey
S128T','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2718,91295,'Wyatt Jim
001 310 359 4200','["310 359 4200","001 310 359","001 310 359 4200"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2719,91296,'Wyatt, Steve & Cate
031987608 om
8 2890830(1)','["031987608"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2720,91297,'Yamani, Mai
65 98 2091
7 37844','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2721,91298,'Yugoslavia, Prince','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2722,66571,'Michel of','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2723,91299,'Yugoslavia, Serge de
8039 336 599 7025','["336 599 7025","039 336 599","025 8039 336"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2724,91300,'Lacks Gordon','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2725,91301,'Zales, Alexi
001 212 226 8745','["212 226 8745","001 212 226","001 212 226 8745"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2726,91302,'Zangrillo Paige & Bob
SP970 825 381','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2727,91303,'Zawauri, Waleed
30 Wilton Cres
020723589/and SW1
Susa teor Oman P.O. Box 879,','["020723589"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2728,91304,'Zecher Bibi and Adrian
1287202.om','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2729,146,'Zeff Mark
Zmal:0209@x209sign.com','[]','[]','["0209@x209sign.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2730,91305,'Zilkha, Bettina
New 100
1 917 825 8767
7 585 201
Email: Bettinalz@aol.com
160 $
B31 0 10k0, 100210)
s016:38go8capital.com
61212192 7837 50
57 Home -
65TH STREET','["917 825 8767","212192 7837"]','[]','["bettinalz@aol.com"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2731,91306,'Reense, Ryan
301 East 66th Street
New York, NY 10021
168 2 3328)','[]','["New York, NY 10021"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2732,91307,'Geffert, Scott
(Hm)PO Box 4495','[]','["(Hm)PO Box 4495"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2733,91308,'Nana Central Station
10163-4495
201 493
917 842 5754
7640 Howie ceil','["917 842 5754","0163-4495 201"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2734,79728,'Joseph & Florina Rueda
917 690 8794 (Jp)
307-793 7095 FB','["917 690 8794","307-793 7095"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2735,49510,'Kellen, Sarah
01 cast b6th Street
lot 10N
22(9 80 10021
sarahiynnelle@hotmail.com','[]','[]','["sarahiynnelle@hotmail.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2736,91309,'Kelly, Brian
67 Kayuga Rd','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2737,91310,'NY 105198
845 526 3716, (h,0)
914 804 6719(p)','["845 526 3716","914 804 6719","05198 845 526"]','["NY 105198"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2738,91311,'Maxwell, Ghisiaine
212/021 ocean fas
212 879 8013 Guest Modem
371432863 Resale Number
1 800 395 4685 AT&T Word','["212 879 8013","800 395 4685"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2739,91312,'Connect
917 690 8794 Joseph P.
499
806 633 4685 Word connect
842 5755 Scott cell
Scoff (h)
3872xE Line 7','["917 690 8794","806 633 4685"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2740,91313,'Gues
(w) Line
6833
(W) Line
Line 3
2611
(w) Line 4
683
jare office','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2741,52217,'Ist St
74th St 11
3106 (pitry firs)
7785
9090 Tanoe!
855 6931 Tahpe-Line 21621
346','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2742,91314,'PB Merc
212
877
358 9350 Flight Options
: 744 5511','["877 358 9350"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2743,91315,'Tahoe Garage
888 387 4383','["888 387 4383"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2744,91316,'Elrieve
959084 Elrieve Mailboxes
9366','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2745,91317,'Elrieve security code
212 535 8817 Rich''s Securit','["212 535 8817"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2746,91318,'Vitrovich, Andrea','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2747,91319,'Ballerina','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2748,91320,'Arizona
201 212 go greet
Email: andrea_mitrovich@ya-
hoo.co','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2749,91321,'Aspen Club
303-925-8900','["303-925-8900"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2750,91322,'Police','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2751,65221,'Au Bar
8th Stree
etween Madison & Pa','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2752,91323,'Rueda, Joseph & Florena Avis International
/800-331-2112','["800-331-2112"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2753,21103,'New York','[]','["New York"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2754,91324,'Real Hotel','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2755,91315,'Tahoe, Kinney Garage
392 Fas 511 George)
AMERICA(A)
beriques - Resale Num-
13-3647756','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2756,15196,'Beverly Hills Hotel
10-271-0319
10 887 2887 fa
everly Wilshire
01 310 275 520','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2757,91325,'Bice
581 212 668 754','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2758,91326,'Bilboquet
0101 212 751 3034','["212 751 3034","0101 212 751","034 0101 212"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2759,91327,'Bond Street
9,725 8','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2760,91328,'Carlyle
381279741800
2 702 2627 Kim Sol
2 636 2389 Sarah Charn','["3812797418"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2761,91329,'Cipriani Downtown
12 343 099','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2762,91330,'Coffee Shop
2 Union Way','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2763,76806,'Jon We','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2764,91331,'Cohen Gibby','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2765,91332,'Cook','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2766,91333,'Henry Meer
0161232217 4600)','["0161232217"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2767,91334,'Pavat Haute Cuisine of','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2768,91335,'Essex House
00 Cork New York 1001
210 East 58th Street
12-247-030
010 212 355 7555','["212 355 7555","030 010 212"]','["00 Cork New York 1001"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2769,91336,'Estia
228 3050
Exercise-New York
19 1%, 7, 7802
Doyle''s
075 212 7 2730','["730 228 3050"]','["Exercise-New York"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2770,91337,'Elaine
77 Second Avenue #61
012 212 779 964','["012 212 779"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2771,29776,'Four Seasons
212-758-5700','["212-758-5700"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2772,91338,'Electrolytic','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2773,46843,'Four Seasons Hotel
88 121
242 938 570 free
Elio''s Restaurant
372 7722 between 841 and 854 Four Seasons Restau-
rant
213-7349077','["213-7349077"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2774,91339,'SWIX IPA','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2775,91340,'Yers of West
* Plus Pork Sauer
634 Hudson Street
212 691-494','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2776,91341,'Nicolas
012 212 249 9850
•Opia
online Blech
212 288 3939
398902310 (','["212 249 9850","212 288 3939","012 212 249"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2777,91342,'Peninsulla Hotel','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2778,91343,'Zonal, XI 18019
312-303-3348','["312-303-3348","019 312-303"]','["Zonal, XI 18019"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2779,17959,'Pierre Hotel
28 W YORK S90021
V12-88000','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2780,91344,'Plaza
012 212 759 3000','["212 759 3000","012 212 759","000 012 212","000 012 212 759"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2781,12000,'Plaza Athenee Hotel
Trust House 40
ew at 641h Street.
ew Yor
12-734-9101','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2782,91345,'Province Restaurant
between McDougal & Prince','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2783,91346,'Ritz Cariton
001 212 757 1900','["212 757 1900","001 212 757","001 212 757 1900"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2784,91347,'Royalton','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2785,83777,'Sette Mezzo
012 12124720400','["012 1212472","400 012 1212","012 12124720"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2786,91348,'Sie Sevie pair','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2787,91349,'Shutters on the Beach','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2788,96529,'Sotheby''s
012 2126087000
3207-493 8080
(34-35 New Bond Stree
8f 8 738 Bilers','["012 2126087","207-493 8080","012 21260870","000 3207-493"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2789,91382,'St Regis Hotel
10 292/53 45002','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2790,91351,'Stanhope Hotel
212 774 1234','["212 774 1234"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2791,91352,'Sunset Marquee
012 213 657 1333','["213 657 1333","012 213 657"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2792,91353,'Tao Restaurant
2 E. 58th Stree
8: 212888 228','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2793,91354,'Taylor, The
30293898681','["3029389868","0293898681"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2794,95701,'The Great American','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:04') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2795,91355,'Health Bar
88 8 75 577','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2798,91358,'For shows and games:
312-590 2374 DC Coe Tickets
cierge/Johanna London','["312-590 2374"]','["cierge/Johanna London"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2799,91359,'Tribeca Grili
001 212 941 3900
wo Bunch Palt
101 619 329 879','["212 941 3900","001 212 941","001 212 941 3900"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2800,34121,'Waldorf Astoria
0101212 355 3000','["212 355 3000","0101212 355","000 0101212","000 0101212 355"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2801,91360,'Westbury Hotel
212 535 2000
BRAZIL','["212 535 2000"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2802,91361,'Cecilia Szajman
21 11 39 30 3330','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2803,91362,'Ganero, Mario Sr
rasilinvesi','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2804,91363,'Av. Brigadeiro Faria Lima, 1485
67935621051972 cell in France','["485 6793562","6793562105"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2805,91364,'Riccardo
06 895 11 5957 8688
ENTERTAIN-
MENT (E)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2806,91365,'Annabels
071-529 1096','["071-529 1096"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2807,91366,'Aspinals
071-629 4400','["071-629 4400"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2808,91367,'Bibendum
581 5817','["817 581 5817"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2809,91368,'Clermont Club
071-493 5587','["071-493 5587"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2810,91369,'Daphne
589 4257','["257 589 4257"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2811,91370,'Foxtrot Oscar
352 7179
Harry''s Bar
2080644','["644 352 7179","080644 352"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2812,91371,'Marks Club
212-499-2936','["212-499-2936"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2813,91372,'Nam Long
373 1926','["926 373 1926"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2814,91373,'Nikitas
352 63 26','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2815,91374,'Patisserie Valerie
0207-823 9971','["207-823 9971","0207-823 9971"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2816,91375,'San Lorenzo
584 1074','["074 584 1074"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2817,91376,'Scalinis
225 23 01','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2818,91377,'Tramp
071-734 3174
FINANCE (E)
ten nearns','["071-734 3174"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2819,91378,'Centurion
3915 659 40444006 Card num-
10/04 Expiry date','["915 659 4044"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2820,91379,'Cristina Bello','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2821,91380,'Nat West
mai 2 Commare Street 0X1
01261 98 T8 Main number','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2822,91380,'Natwest Bank
65 7900
165 205157
FRANCE (FR)
00 33 F4272 75194','["900 165 2051"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2823,91381,'ATT Access
0 800 99 0011,','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2824,91382,'Bristol Hotel
13 8 le Faubourg st. Honore
53 43 43 01/5
clientservices@hotel-bris-
mail: clientservices @hotelbris-
33(0)611999322 Jeanmarie Port','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2825,91383,'Cab Blue
4936 1010
Cabaret (night club)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2826,91384,'Contact Frank
68 rue Pierre Charnet','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2827,50444,'Car rental
00 33 04 93 21 48 90
chateau de la','[]','["chateau de la"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2828,91385,'Messardie
011 33 4945 676000','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2829,91386,'Chez Denise
00 33 1 4236 2182
Chez L''Ami Louis
32 Rue du Vert-Bois
33 8 8999 2','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2830,91387,'Farme Lundi & Mardi
apstein, Jeffrey
nch Apartment
(Hm)1 Rue Chalgrine/Staff En-
8298
n1 47 37 18 18 Ambasador Ca
oulau:
6 12 14 37 56 Mr Santo','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2831,45038,'Epstein, Jeffrey (G)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2832,91388,'Franch Apartment
22 Avenue Foch','[]','["22 Avenue Foch"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2833,91389,'Apartment 200
53144170210
France 75116
351
221 4d1 702111f
steini@wanadoo.fr(Valc
m)1 Rue Chaforne/Staff Er
ranc
1A 131
8298
01 47 37 18 18 Ambasador Car
53 43 43 00 Jean Marie @
Bristos eg 475 Jean Marie @
997388133 937 a aidsont
00133 148 27 85 33 (h) Vaisonk
Cotto 67 18 82 staff lin
a tir Comulcarad
Peres(conc.)
46 0n 30 79 1)< Paras
16 09 592 853 M
Peres (p)
lancel
30496490290r. Pascalcabl
Ne 62 31 88 55 Mr Pascal cell(ca-
11 42 87 49 38 M Karim o
06 09 65 65 55 Mr. Karim or
Lazno.
67248 992323 Mr.
ourteau(videophone)
06 52 95 04 67 Mr. Tourteau
60 93 93-
elistan alar
• 09 21 15 15 Mr. Belstan
614271 99 93 Mr.
30073ch0 activity
4 50 84 Mr. Damenichin
Tel SS T 90 Mr. Lafond(a/c,
he 30369 Mr. Lafond
00342.pMl. Pasquer
66129487 Mr Santos','["200 5314417","3049649029","5314417021","0496490290"]','["Cotto 67 18 82 staff lin"]','["steini@wanadoo.fr"]','From Black Book - 4 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2834,91390,'Peron, Marie Jose!
Co.
Rue Louise 1
113
50 Brussel
817 33 2938 22 46FAX
57332 412×35 0079 Belgian det-
011 33 607 26 9785 French Cel-
01953144014401 Berlioz
FaR 94169415 Berliz France','["0195314401","0195314401440"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2835,91391,'Gerard
33 (0) 609 515 909','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2836,91392,'Hotel Crillon
10 Place de la Concorde','[]','["10 Place de la Concorde"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2837,91393,'Hotel Raffael
4428 0028','["0028 4428 0028"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2838,91394,'Junot, Philippe
No. 1 N. Avenue','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2839,90912,'New','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2840,475,'F58 85 042611 Paris
+33 616 60 6000 (p)
+34
852778234
Spain)
Spain fax)
34 699 212 298 (Spain p)
01144 370272428
orkl
L''Amijean','["144 3702724","01144 37027242","+34 852778234"]','["F58 85 042611 Paris"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2841,91395,'Rue de Varene','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2842,91396,'Teme','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2843,91395,'Rue de Varene
L''Aro
e Puls
1 4500 48
L''Arpege
00 33 1 4551 4733','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2844,91397,'La Merlot','[]','["La Merlot"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2845,91398,'Rue de la cherche midi','[]','["Rue de la cherche midi"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2846,91399,'La Poste
00 33 1 4280 661€
9 rue Peronaid','[]','["La Poste"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2847,91400,'Seme
Lé Voltaire','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2848,91401,'Madame Lemercier
80 33: 42390233 12)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2849,91402,'Maid
assage - Par
audia Hadida 0494791726
33393 87 4 01)
4401 4401 Stephane Coula
SN 1078 6479 stephane Coula
8P 4401 4401 Gerakdine Talavera','["0494791726"]','["4401 4401 Stephane Coula","SN 1078 6479 stephane Coula"]','[]','From Black Book - 1 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2850,91403,'Le Telegraphe','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2851,54275,'Rue L. 14055 0685
33142415033 Bastien-foat
3359286 2422 Bastien-foat
336 82617962 karine (Nicole''s)
9974766 3727 Karine (Nicole''s)
36 5320 0066 Deborah (p)
p: Laeliti
06 2247 4450 Deborah
0609635180 Nadia','["685 3314241","359286 2422","336 8261796","3314241503","055 0685 3314","974766 3727","0609635180"]','[]','[]','From Black Book - 7 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2852,91404,'Miele, Mr & Mrs
00339301 3378 6
33 9308 1179
1273(
00 33 93042298 fax','["339301 3378","00339301 3378"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2853,91405,'Ott Cynthia and Claude
1133 153 05 70 98 1','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2854,59098,'Pinto, Alberto
atel de la Victoire (i)
Rue d''Abou
89939 67 800 4392 (p)Serge
81133148137542 Linda d
596 Linda dir
serge boquet@albertopinto
lelphine rateau @albertopinto
dean.huguen@ aldenopinfo
8483 862 72 981
135944182 epinto
75 Paris h
01121239933939 Pinto in','["8113314813","981 1359441","0112123993","0112123993393"]','["atel de la Victoire (i)","75 Paris h"]','[]','From Black Book - 4 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2855,67429,'M1 21239 93 7171 Morocco
+33 144 1875 71 (hf
140
0000.
29.6003097 Riser: a cel
infographie.pinto@albertopinto
Plaza Athenee - Paris','["000. 29.6003097","+33 144 1875"]','["Plaza Athenee - Paris"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2856,91406,'Taxi Bleus
01 49 36 10 10','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2857,91407,'Taxis
Restaurant-takeouts
Sushi 01 56 26 00 55','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2858,91408,'Restaurants','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2859,91409,'Entrecote
08495207 eart
Ritz - Paris
31-4236-0091 Birect Fax Reser
vations','[]','["Ritz - Paris"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2860,91410,'River Cafe
0 33 1 4093 502
46 quai de Stalin gra','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2861,91411,'Tante Louise','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2862,91412,'Taxis Bleus
0149 38 10 10','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2863,91413,'Vleira Cotrin, Valdson
21 Rue Voltaire
Room 4041 Floor 6
HOTELS (HI)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2864,91414,'Berkeley Hotel
02072356000','["0207235600","02072356000","000 02072356000"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2865,91415,'Blakes
•→ tf
tel
4471-333-7633 Private fax. 8/2','["471-333-7633"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2866,91416,'Ritz
071 493 8181
›avoı
71-836 434','["071 493 8181"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2867,46491,'The Barcley Hotel
4207235-5000','["207235-5000","07235-5000 4207","000 4207235-5000"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2868,91417,'Waterside Inn
0628 20691
ISLAND(1)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2869,44689,'Air Center Helicopter
340-775-7335 Nicholas & Tina
30-780 873 Cl','["340-775-7335"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2870,91418,'Christopher Taxi
340-79-502 (home)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2871,7428,'Cox, Madison','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2872,91419,'Madison Cox Design, inc
220 West 19th Street','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2873,39384,'New York, NY 1001
212 307 8081(8.
sm495e59 gisoncax.com
61121263526382 Moraco f','["212 307 8081","6112126352","001 212 307","001 212 307 8081"]','["New York, NY 1001"]','[]','From Black Book - 4 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2874,91420,'Epstoin, Jeffrey
6109 Bed #095V9 086028 B-3
38 47 801 ch
mai: catnmileavanoo.con
Hmlmanager@liftestjeff.com
340 775 7533 Air Center Helicop-
40 774 4265 Cortacel
A0 gr
2678 Guest
340 714 0808 Soare (unused)
epstein, Jeffrey
740 690 1443','["340 775 7533","340 714 0808","740 690 1443"]','[]','["hmlmanager@liftestjeff.com"]','From Black Book - 3 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2875,91421,'Cecile
portable
340 77
60B6 Leon cat','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2876,91422,'Hoffman, Paul
Paul Hoffman, P.C
1-42-KoI
10. Box egens Gade
50804-0878
340-774-2268 (M)
340-774-3318
:mail. DaulhofímanPC@ATT.net.
miEstate Haver
• 8ox 87','["340-774-2268","340-774-3318","0804-0878 340"]','[]','["manpc@att.net"]','From Black Book - 3 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2877,91423,'VI 0080
617 347 7907 Boslon h','["617 347 7907","0080 617 347"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2878,17691,'NY NY 10011
212 989 8429 o
212 989 89861
Email: dan-
Massage A - Island
n & Kare
812 8 4189484 Jenier','["212 989 8429","212 989 8986","0011 212 989"]','["NY NY 10011"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2879,91424,'Rhodes Sanchez, Carlos
300435 4725 Gretchien''s coll
Pinto Tonio Dealarcon 41','["300435 4725"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2880,45800,'Moseley, Brian
80 34 01 230454
18004 Spain
340 776 4090(0)
Email: bmosefey@viaccess.net','["230454 1800","340 776 4090"]','[]','["bmosefey@viaccess.net"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2881,96530,'USVI 00802-1306
340-776-5835 FAX','["340-776-5835","00802-1306 340"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2882,91426,'Tropical Shipping
340-778-1880 0V','["340-778-1880"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2883,45928,'Water Taxi
340-775-6501
ISRAEL','["340-775-6501"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2884,91427,'Eshed, Elisa
08-373-33-890-540(R)
Email: esheda@itc.mof.gov.Hl','[]','[]','["esheda@itc.mof.gov.hl"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2885,91428,'Evani Dud Efrat
0037331532022(P)
Email: efrald @intgov.il','["0037331532","0037331532022"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2886,91429,'Gil Avi
00 972 66 311240
Email: gi_avi@netvision.net.il','[]','[]','["gi_avi@netvision.net.il"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2887,91430,'Gutman, Arik
877 370 85758','["877 370 8575"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2888,91430,'Gutman, Arik
00-37-5-42-1749(8)
005722352724','["0057223527","005722352724"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2889,22510,'Olmert, Ehud
197 2 6296014
092222229608
ITALY (1)','["296014 0922","014 09222222"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2890,91431,'Torre di Pisa
erpao26
rain Info
0 39 2 802
JEFFREY (J)
301 East 66th St','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2891,91432,'Front Desk
New York, 50021
Apt.fortadds
56500 Guest Cell
→ 18agn8378y
213472442028 (Morrison)
3173874598 (calleni)','["2134724420","3173874598"]','["New York, 50021"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2892,91433,'Archer, Bill
Three us. ask
Adler: Frederick (Fred) &
34: 13 983 В)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2893,49768,'Andersson, Eva
1010 Fifth Ave, Art','[]','["1010 Fifth Ave, Art"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2894,85959,'Apt 10A
Email: evadubin@holmail.com
45034 Face 1
Son 804 9293 (h)
XXX:
126646941 (WING)
+48 70 566 0463 Mr. Anderson''s
4 939 3070 emergency
14 415 7171 (wl','["+48 70 566 0463"]','[]','["evadubin@holmail.com"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2895,91434,'Asian, Linda','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2896,91435,'We 051:18102 *
31737340000
283 5282 Hamatons
(11 46 5232 2113 Sweden
14 669 8157 North Salem
11 46 5227 0397 Parenis /wit
fari
512 758 5700 work(1-9-03)
sec. Caprice','["3173734000","512 758 5700","0000 283 5282"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2897,67529,'C0. Box 295me5','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2898,91436,'CO 81612
303-920-3776','["303-920-3776"]','["CO 81612"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2899,91209,'Jon','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2900,91437,'Bannenberg med','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2901,91438,'Jon Bannenberg
6 Burnsall Street
00512951
England SW33ST
4420-7352 8444','[]','["England SW33ST"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2902,11,'Barak, Ehud
Charan Associates, LLC,
17 841 785
12 202 4032(
Email: ehud@barak-assoc.
es.CO
184970 3382 are pers
011972565093753mit ass-
fa1197236869995 Fax number in','["184970 3382","0119725650","1197236869","0119725650937"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2903,91439,'Israel','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2904,10960,'Barrack, Tom
Colony Capital Inc.
sile in of the Stars
296 287E82, CA 90067
310 552 7240 direct
310 3 21 aside miss
310407%95 Dract Tax
• Tom''s
308 885 8668 David Monahan (Ha
waii)','["310 552 7240","0067 310 552","308 885 8668"]','["296 287E82, CA 90067","310407%95 Dract Tax"]','[]','From Black Book - 3 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2905,91440,'Barrett, Anthony
VY 1002','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2906,91441,'Prop
517 612 4137 (P)','["517 612 4137"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2907,91442,'Barrett, Jonathan
212 615 3430 (wl)
New Kany Or 43054(1)
New Albany,
wa Limited Pki
Columbus,','["212 615 3430"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2908,91443,'Ohio 43230
814-445-3174','["814-445-3174"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2909,91444,'Benamou, Albert
Part France 79008
81864180
331 45 6:
mall: benamou @art-cul-
(Him (home)
3B evil Sur Sere
607011918 cel
140883637 home
Biddle-Hakim
Husband: Gilbert Hakim','["008 8186418","008 81864180"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2910,91218,'Sophie','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2911,17107,'Do not send mai fo
49 West 76th Street
01 420045 Parents/ Rhode','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2912,91445,'Island
310 653 5218 (R)','["310 653 5218"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2913,49730,'Bjorlin, Nadia
, Lonaboat
949 500 5855 CA.92657
883795()
New York, N° 10019°','["949 500 5855"]','["New York, N° 10019°"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2914,91446,'Borden, David
15 West Broin Corp
12118
317347-0038 (l)
Email: davidaborden@aol.com
17-233-3084 (p)','["317347-0038"]','[]','["davidaborden@aol.com"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2915,91447,'Bovino, Kelly
310222340(','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2916,91448,'Brown, Cocc','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2918,91450,'Buakagham Research
50 922$A75 or sth Floo
12322 3145 80b Crowle','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2919,91451,'Butler Aviation, Newark','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2920,91452,'Signaturalight Suppor
tewark International Airport
201-624-1660
10711.','["201-624-1660"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2921,79726,'Campos, Michelle
Bronx: 796863
lived Saty.
718 884 6586 (h)
646 418 9306 p
Email: michelle @naproperty.com
Cayne,','["718 884 6586","646 418 9306"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2922,91453,'Bear Stagermy
212 548 1388 (w)
212 548 1381
212 548 1350 wi
0777 484 2756 emergency -','["212 548 1388","212 548 1381","212 548 1350","777 484 2756","0777 484 2756"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2923,91454,'Driver Iffy','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2924,91455,'Daniel
011 537 879 17 82','["011 537 879"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2925,91456,'Davison, Dayle','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2926,91457,'Clibank
180 E 53 S1.
001 212
DOT 21 08g*, 10022
66-8875 Hom
59 6083 Geoff VonKuhr
SIK LEW 702 10022
.... .....','[]','["180 E 53 S1."]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2927,91458,'Derby, Catherine
332 E. 84th St.
19028
Email catherine@naproperty.com','[]','[]','["catherine@naproperty.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2928,19486,'Ber 987, Alan
212 861 8218 (h)
858 626
2050
(W-direct)
358. 625 2099 (wf','["212 861 8218","858 626 2050","358. 625 2099"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2929,91459,'Engle, Don','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2930,91460,'Family Reservation Dept
808 3489040 3 Nasnya-02
ELSTEIN -PORTA-
3465491 3078
319-540-2265 Guistrean
3498 82584 1 1201)','["808 3489040","465491 3078","319-540-2265","078 319-540"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2931,91461,'Edelman, Gerald Dr.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2932,66826,'Hong Kong agent on
917545 6300 Guest cell','["917545 6300"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2935,91462,'Epstein, Jerres
/chigan Home
menaken
76 5295(h
210 216 12940
516 276 5296 2nd line','["210 216 1294","516 276 5296"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2937,91463,'Epstein, Paula
125 Lake Pauia DRYL 33411','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2938,94783,'West Raia Beach, i
561-686-3707
all: otepstein (@aol.com
01 009 8900 biden Lake.
54 792 6447 Joyce Michayluk
581% 6376 Joyce Michayluk
861-308-8684 (p)','["561-686-3707","861-308-8684"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2939,91464,'Parkas','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2940,91465,'Andrew','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2941,91466,'Island Capital
N. NY 1001, 1st Floor
12 593 5700 (y
12 593 0500 fa
Jonathan D.
52 E. 72nd street
10021-4266
2179523400 )
(car)
.com
join street
312953384(3)','["266 2179523","0021-4266 2179"]','["N. NY 1001, 1st Floor"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2942,43406,'Federal Express
ACE 25873810.6 JEC
Acct #1814-9779-3 JEE
Acct #1814-9809-9','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:05') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2943,91467,'AccI # 2587-7622-4 Max Hotel
800-654-0920 Automatic Pick-up
399-247-6500 Local Office
00-654-0920 Problems/package
8998 10829390 Johannesburg','["800-654-0920","399-247-6500","998 1082939"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2944,91468,'Foster, Taylor
317 316 60323 815(P)','["317 316 6032"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2945,91469,'Hi Danielle (pastry Dept)
9875985592 cell','["9875985592"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2946,25,'Gany, Eric
203 762
3039826054','["203 762 3039","039826054 203","039826054"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2947,91470,'Ysag38780 Brother - Victor
941 383 5226 Vacation','["941 383 5226"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2948,91471,'AFV5232 Frequent Flyer Num-','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2949,20494,'Sante F8. NM 87501-8943
505984 8800w-main
0550W Directe
1 505
970
9709204187 9
292 260 3223 NY lura
olivia)','["505984 8800","505 970 9709","292 260 3223"]','["Sante F8. NM 87501-8943","292 260 3223 NY lura"]','[]','From Black Book - 3 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2950,91472,'Gilman, Kennell','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2951,31951,'The Chilea, we
ee Limited talky
4-234-0U09
2-439-42001','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2952,91473,'Seatown, Washington DC
-338-34
286
-350-5720 Hot','["286 -350-5720"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2953,91474,'Hor','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2954,91475,'Gold, Bob
rood Lane
06880
iCT','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2955,91476,'Goodman, Bob
S2 571
0299 (h1)
732
577
emergency
(62)
GON 10128
T4 20AY
mom''s home
10003
09 683 088
124739462(2)
10021
eil, Pau
lennia! A
2-121-23','["683 088 1247","088 12473946","003 09 683 088"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2956,91477,'Kean Coul','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2957,91478,'Rye, NY 10580
001 914 967
7220
01 284 494 2354
Insurance Office of Cen-
tral Oh','["914 967 7220","284 494 2354","0580 001 914","001 914 967","001 914 967 7220"]','["Rye, NY 10580"]','[]','From Black Book - 5 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2958,91479,'Herb Wolman
2213776 or
614221393% later hours)
114 855 2463h
ext. 204 Dan Cahil
ext. 223 Janice Lichtenstein','["114 855 2463"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2959,20031,'Isaacson, Walter','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2960,18462,'Time Magazine
12-522-1212 wOT
Email: walter.isaacson@tumer.com','[]','[]','["walter.isaacson@tumer.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2961,91480,'James, Randy
Email: randi@randi.org www.randi.org','[]','[]','["randi@randi.org"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2962,91481,'Jampanol, Mylene
varecki, Henry Dr.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2963,91482,'Alconwood Corporation
565 Fifth Avenue (w)
3rd Floor
301 280326 (emergency con-
3779838 389 0391a','["838 389 0391"]','["565 Fifth Avenue (w)"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2964,91483,'Johnson Lily
B1153293%%','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2965,91484,'Johnson, Elizabeth','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2966,91485,'Libit','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2967,91486,'Keary, Sen. John
202-544-1880 Other
3024614928 Jamie Winiehead
3392 421 065 New Work #','["202-544-1880","3024614928","024614928"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2968,18760,'F4233067 New Fax 1+
+33 1 45 49 14 75 (wl)
"Jarecki, Gioria
10 Timber Trial
infone.com','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2969,84923,'H870 ON Plaza: Apt 37/38
2127990450degRiver or 49)
814-967-1220 Westchester
1440 (W
984 1442 (wl)
888
8076
0859/0860 Plane
8048 Westchester f
1440 Emergency
7220 Emergency
212 984 1450 Other','["2127990450","814-967-1220","212 984 1450"]','["0859/0860 Plane"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2970,91487,'Johananoff, Pamela
14 Rue Maspero
75106
3374647 8784 11
21 4A47 8702 l
501 666 G6ST (parents)
36 0711 498870
incald, Kristin
storia''s Sect
1724 Sixth Ave Tue, 5h Fir,
122403-9284 (m)','["106 3374647","122403-9284","0711 498870"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2971,91488,'Kosslyn, Steve','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2972,91489,'Garfield Stre','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2973,91490,'Cambridge, MA 021
...?
213
(Robin)
New York, NY 10019','[]','["New York, NY 10019"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2974,91491,'Lang, Adam Perry
268 8874 (h)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2975,91492,'Leach Entertainment Enterprise
mail: soblea aacl.com
achr','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2976,91493,'Tropicana
09 462 000 Antigua
207 222 6004 Nick La Penna','["207 222 6004"]','["207 222 6004 Nick La Penna"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2977,91494,'Nick
523003 w
65-253-2364 (wi)
mai: nsis@pacinc.net.sg
55-253-2364 (hf)
92-20-4101 Car
5-253-5453 (h)
8978608788
Lopez, (Buklarewicz)','["8978608788"]','[]','["nsis@pacinc.net.sg"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2978,91495,'Cindy','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2979,14849,'Karin Modeis K','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2980,21103,'New York
792 431 394 parent 5
N.A. Properg, Marc
N.A. Property.
6525 West Campus Oyal','[]','["New York"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2981,91268,'Suite 105
007 614 784 9540 43054
prop','["614 784 9540","007 614 784","007 614 784 9540"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2982,91496,'Luntz, Melinda
345 E. 64th Street (h)
hot 100
ĐT PĐố TBY /0021
mail: mluntz@nyc.n.com
(Hm)Clarkeson Research
raupw)
9851922983 Mom in PB
+ 8823 (wl)
16 624 BB25 (W
352-813-0180 Ron Shulmar
home)
Mast Industries - Milan
3902-7601-5631','["9851922983","352-813-0180"]','[]','["mluntz@nyc.n.com"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2983,91497,'McMillen, C. Thomas','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2984,91498,'Chairman','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2985,91499,'Sulte Corporale Drive (w)
MD 20785
01 3063470 211(W
301 306 3479 (wl)
301 ke 72 20000','["301 306 3479","063470 211"]','["MD 20785"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2986,91500,'Mas Industries
Email:
202 251 919ngurancs.com
18 1341 somn watch Fene
781 York, NY 10022
(h).
wo World T 18048-0090
105th','["048-0090 105"]','["781 York, NY 10022"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2987,91501,'Merrit, Jerry
881811 38 7308 ()','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2988,91502,'Middleton, Mark
501
(w)
priv.)
hf)
5 Washington','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2989,91503,'Washington Parce
(wi)
(w)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2990,40,'Minsky, Marvin
617 734
617 277 8583 г
ninsky@media.mit.edu
im)111 Ivv Street th
kline, MA 02448
781 89615142 Gloria
-emergency only
17 730 2335 Gloria Minsky pri
817 253 5864 Marvin-office','["617 277 8583","448 781 8961","817 253 5864","02448 781 8961"]','["kline, MA 02448"]','["ninsky@media.mit.edu"]','From Black Book - 4 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2991,91504,'Mitchell, Senator','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2992,91473,'Washington, DC 20005
2023778105(w)
-mail: bchapman@verer.com ;
36 4535 DC Fax
645 305 1392 Neather (n)','["005 2023778","645 305 1392","2023778105","0005 20237781","023778105"]','["Washington, DC 20005"]','["bchapman@verer.com"]','From Black Book - 5 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2993,84282,'Morrison, Larry
300 75 88 Pl 158008','[]','["300 75 88 Pl 158008"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2994,26347,'Myhrvold, Nathan','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2995,91505,'Intellectual Ventures
1422 130th Avenue N.E. (w)
Washington 98005
2267 2308(W)
Belmont3441 134th Ave. N.C.
3503 5160 (p)
25 936 7333 Sharleen PT Assis-
12: 936 2170 Serena FT Assis-
tant
425 936 1222 Direct Fax-Use
425-869-5599 Joan Waters (per-
ai assis
2309 Claudia Leschuck
785 7788 0
asi
2350 y
811 871631125 172 Boal (sat)
866 501 9015 Plane
435 260 7319 Claudia - emer-
gency
V.A. Property, Inc.','["425 936 1222","425-869-5599","811 8716311","866 501 9015","435 260 7319","005 2267 2308"]','["866 501 9015 Plane"]','[]','From Black Book - 6 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2997,91443,'Ohio 43054
814 668 3096 Pare Duraberg','["814 668 3096","054 814 668"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2998,91507,'Lesa, Wexner
; :.
•4-. ~
isrig
oe perg Ramy Kaharot
764 9847 Peggy Ugland
5974
814 839 6075 Mare direc (w)','["814 839 6075"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(2999,91508,'New Albany Country
1, Club Lane
4305 Adany, Columbus Or
814-339-3528 (1)','["814-339-3528"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3000,67812,'Nowak, Martin
781 259 4297 home
Email: martin_nowak@har-
m)33 Conant Road
NCOLE
4 017
781 259 4297 1
617 496 3999 (w)
617 496 4629 work fax
617 496 4737 Doreen (assistant)','["781 259 4297","617 496 3999","617 496 4629","617 496 4737","017 781 259"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3001,91509,'Oatman, Bob
RL. Oatman & Associates, Inc.
10 Fairmount Avent
ate 10
10494 1126','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3002,91510,'MD 21286
410 494 1163(0','["410 494 1163"]','["MD 21286"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3003,91511,'Sunue i d akway.
001 814 593 8632 ice Mail
622 8828 Florida
16 883 5697 (h)
207 059 9800 A
15 883 8823 /57
15 883 1100 (w)
614-939-3070 24 hr number
614-479-7186 Shery Castle''s Di.
rect Phone
410 494 1126 Office Mr
410 494 1163 Fax MD
443 831 2818 (p)
410 440 9872 Janice Oatman
emergency','["814 593 8632","207 059 9800","614-939-3070","614-479-7186","410 494 1126","410 494 1163","443 831 2818","410 440 9872","001 814 593","001 814 593 8632"]','[]','[]','From Black Book - 10 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3004,91512,'Oertani, Selma
16 Vila Di L.ou 9014
3315-580-197750
0616248178 0
Email: selmaouertani@yahoo.fr','["315-580-1977","0616248178","014 3315-580"]','[]','["selmaouertani@yahoo.fr"]','From Black Book - 3 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3005,91513,'Ovitz, Michae
irtist Management Group
9465 Wilshire Blvd.
998-920-1833 Stice Manica
Chm 457 2 Kingiam Ave (h) Perlman, Itzhak
398 308245, CassinaOvitz''s as-
312-31-899 Ripple in Ny
ent/kann time
12-595-2483 Privale Lir','["998-920-1833"]','["998-920-1833 Stice Manica","312-31-899 Ripple in Ny"]','[]','From Black Book - 1 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3006,91514,'Pete','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3007,91515,'Plot
561 350 6766
10 476 5876 (h)
310 713 3009 Cell as of 1-13-00
acker, Mai
naste
io Motorcycie, En Ficor™
88 7 Ave
12 535 9358 (
505 867 8298 Lisa in New Mexico','["561 350 6766","310 713 3009","505 867 8298"]','["88 7 Ave"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3008,91516,'RUDoTOTANF FORMAT
303.32,308 Asen Hanoamy
: W
104 09401
1 686 259
2525','["686 259 2525"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3009,91517,'Santa','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3010,91518,'Capit
lenable Law firm
02-887-1433
370-396-6770 Santa Monica -
8084474492 Van Nuys - Million
600-538-9378 Jet West (Van
548 8200 Ex Bignature.
519253730 White Plains
78 24411 jP& General Avia-','["370-396-6770","8084474492","600-538-9378","084474492"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3011,49643,'Pivar, Stuart
0-8400 10
904 628 2568','["904 628 2568"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3012,91519,'Razek, Ed','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3013,91520,'Preece Dara
West Paste Co FL 33409','[]','["West Paste Co FL 33409"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3014,91521,'Ed, #500
614415 6240(1)','["614415 6240"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3015,91522,'Columbus
748211-1780 Car
614-53
51:3750
$14-619-7100 Mobile
41-792-229-470 World Cel
212884 3080 NY office
614 203 7400 (p)
Rocketeer anti-
rs, Das
7318 Heathley 33467
567 342 6117 (Plonly in st.
To 4433 7063 david rigg insure
ance','["748211-1780","212884 3080","614 203 7400","567 342 6117"]','["212884 3080 NY office"]','[]','From Black Book - 4 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3016,59089,'Rosovsky, Henry','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3017,91523,'Carvard University','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3018,91524,'Ween ruse
7-495 9381(
677-332-8930@haward.edu
XULD','["677-332-8930"]','[]','["677-332-8930@haward.edu"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3019,91525,'Schantz, Jeffrey
1257 Veeder Drive','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3020,91526,'Hewlett Bay Park, NY
12 371 0320 (f
5163787368
cell p
12 504 8083 E-Fa)
115R416 AA Frequent Flve:','["5163787368"]','["Hewlett Bay Park, NY"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3022,91528,'Shadow, Monty
290eda Castello','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3023,26272,'San Nazzaro Sesia (NO)
5739032184090 work harit
011390262912196 Privale
011390321827000 Rivale Line at
home
snyder, Richard & Laura
Phone','["5739032184","0113902629","0113903218","032184090","0113902629121","0113903218270"]','[]','[]','From Black Book - 6 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3024,91529,'Sowell, Dottie
31310-400 am
395 932 6004
917 446 4469 portable','["395 932 6004","917 446 4469","004 917 446","004 917 446 4469"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3025,91530,'Spector, Warren','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3026,93220,'Bear, Steams & Co.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3027,25746,'New York S NAY779 (W)
Email: wspector@bear.com','[]','["New York S NAY779 (W)"]','["wspector@bear.com"]','From Black Book - 0 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3028,91532,'Tark, Carolin
Rista''s friend
1100 West Avenue (4)
The Mirador Building 39','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3029,86048,'IM Attr
or Bay Drive','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3030,91268,'Suite 110','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3031,63183,'Miami, FL. 33131','[]','["Miami, FL. 33131"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3032,91533,'Steel, Kim
110123063
887361932 Fax number','["123063 8873","0123063 8873"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3033,76170,'Stein, Andrew
212 369 3252(h)
313.533-2708 Work','["212 369 3252","313.533-2708"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3034,31365,'Stock, Ann','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3035,24662,'So Government
203-466-3304
20500','["203-466-3304","0500 203-466"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3036,10656,'Stone, Linda
P.O. Box 7477.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3037,91534,'This is a stable address
225882 808098006
indastone@MSn.com another','["225882 8080"]','[]','["indastone@msn.com"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3038,43441,'Stroll, Lawrence S.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3039,91535,'Shelvestment Group
it 7 Avenue du Plar, Suite','[]','["it 7 Avenue du Plar, Suite"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3040,91536,'Bine to Canada
XHHID
(W) Montreal
(wi)
8810906 (h) London
439
(h)','[]','["8810906 (h) London"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3041,91537,'Moustique
(010 (p) Moustiau:
3173 (h) Claire Anr
6009
814 97860023604 Sohn-Stroll''s chaur
50 Strolls 1
3344 8023 new country house
aser Yach
, Cralg
7007 sudere 1833398 ()
nait ta
11800561800 Aven','["009 814 9786","1180056180","009 814 97860023"]','["50 Strolls 1","11800561800 Aven"]','[]','From Black Book - 3 phones, 2 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3042,91538,'Trump, Donald
The Trump Organization
212 735 3230 1)
12-833.9091 ฿
61 832 2600 Mar-a-lago
13-715-7220 Norma direct-emerg
contact
679 6111 Milania
584 8222 Milania p
561 832 2669 (hf)
Truit Mas ne.
Tomores Pa biasor Assoc.','["212 735 3230","561 832 2669"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3043,91539,'Hillside Ave','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3044,91540,'UH 43081
014 856 973 2310
rossle','["856 973 2310","081 014 856","014 856 973"]','["UH 43081"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3045,91541,'Bob
filer and Ravec
914 634 7476(h)
338
6476 (hf)
ariN
4885 Wife
683 2788 (wf)','["914 634 7476"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3046,91542,'Tuckerman, Steve
514 775 4004 (N
steveluckarman5000@msn.co
818925 7877 Aspen f','["514 775 4004","818925 7877"]','[]','["steveluckarman5000@msn.co"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3047,91543,'Ugland, Peg
Suite 105','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3048,21668,'New Albany
:614-422-0606 Richard Ugland
14-939-6003 w direct
614-939-6007 F direct
UPS
Account # E10-954
800 742
Poemat 800-782-7892
ups)
Valukas, 1олу','["614-422-0606","614-939-6007","800-782-7892"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3049,91544,'Jenner & Bloch
312-222-9850
708-866-8348 Home','["312-222-9850","708-866-8348"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3050,10123,'Visoski, Larry
1131 Pine Point 33404
1309530r
19 868 614
24718909 0070 SanePe
15 832 2093 01
12 7513
614 433 706,','["404 1309530","868 614 2471"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3051,91545,'Savid Rig','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3052,91546,'Chiet li
10t','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3053,91547,'Wachner, Linda
37-3742-8732 Paris (W)
310-473-0032
0-479-0473 Sepulveda (r
12-370-8204
20-8205 Secretary direct
03-925-9029 Aspen H','["310-473-0032"]','["37-3742-8732 Paris (W)"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3054,91548,'Aspen
0607 971 212 Claude-Paris
87 39-3928 860 (p)','["0607 971 212"]','["0607 971 212 Claude-Paris"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3055,91549,'Nahi, Francis
222-752-5990 (h
122-347-683
41-77-24-0330 Portable
2377281 Portable','["222-752-5990"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3056,91550,'Pans
ance 45116
33 6608
011 33 66 081 7425 p','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3057,91551,'Bout re Blare Reli
889 95 08591612 Alaxia home
33 493646157 Canne
011 33 145 0002 07 Cellular','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3058,7256,'East 77th Street
New York, NY 10021
3 EL ROW SEND ALL
31 33 38 Pais - Concierge','[]','["New York, NY 10021"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3059,91552,'Wasche, Cristalle
12190
Email: cristalle@earthlink.net
Wexner - Abigail Planta-
tion
291033932 Barrell Haistea
29-889-6637 Darrell Page
Wexner - Flight Dept.
4387 International
60479-7063
•H 43710
614-239-7047
114.239-8490 Tim Sich
14 203 9895 Tim Stehly (o)','["614-239-7047","114.239-8490","047 114.239"]','[]','["cristalle@earthlink.net"]','From Black Book - 3 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:06') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3060,12,'Wexner, Les','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3061,91553,'London, United Kingdom WiK
4 20-7499 7711 Home
763 Home - fa
427 6744 Range Rover-
bents were David
011-44-385
0831-355-056 Mercedes
On 44370 85994 Mercedes
new stor
11 44 370 883 955 Range Rover
Mole 57838801 Benly Mobile','["0831-355-056"]','["London, United Kingdom WiK"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3062,12,'Wexner, Les','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3063,96531,'Pre-Owned Unes Airin
970 920 0436 Curl Uikes - Per-
890 920 8723 Curt Uikes - Per-
614-939-3055 Kart Koon
814 S98 7083 Land A5veF 1999?
and Rover
14 619 6066 Porsche 1997
370 9810 Lincoln Town Car
198320 8992 Suburban 1987
614 648 9202 Merc 1997 600S
614-939-3070 Command Center
P14-939-3063 Command Center
kes Pag
978925-8809 Man Fie
378378 6871 Jeep Cherokee','["970 920 0436","890 920 8723","614-939-3055","997 370 9810","198320 8992","614 648 9202","614-939-3070","978925-8809","378378 6871"]','[]','[]','From Black Book - 9 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3064,12,'Wexner, Les','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3065,44774,'The Limited Inc
970 379 5673 Jeep Wrangler
our Lus. O43230','["970 379 5673"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3066,96532,'Coumb-300
378 378 6574 WMC Pan 1994
614-415-5008 F
mail: dryan@limitedbrands.com
1 8 1590 e, can Chao
14.415.5000 Main In
ee 199:
S14 415 5006 Daina Ryan direct','["378 378 6574","614-415-5008"]','[]','["dryan@limitedbrands.com"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3067,12,'Wexner, Les','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3068,51898,'White House','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3069,91556,'Main Line information)
300802 2084e, NW.','["300802 2084"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3070,91557,'Whitehead, Jim
381-893-3407 )','["381-893-3407"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3071,91558,'Wolman','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3072,91559,'Herb
38 Jefferson OH 43215
004-221-3401 work
min
Fax','["004-221-3401"]','["38 Jefferson OH 43215"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3074,91561,'Portable','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3075,43378,'Office Aiter Hours
955 2463
32 31) 133 Malutcia Hughs
* 3M6 883 6498 (1)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3076,91562,'Mort','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3077,91268,'Suite 1801
nzuckerman@bostonproperl','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3078,91563,'Im Boston','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3080,91565,'Blachon, Magali
8 impasse Bourholle
341 33
33 68 2940.790','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3081,91566,'France
Email:
nagali, blachon @wanadoo.r
1K3682940794 cel
917 553 0136 (p)
01123 561 4775 d0 Parents','["3682940794","917 553 0136","123 561 4775","01123 561 4775"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3083,91567,'Barnett, Richard
14 Oakland Ave
Sor Washington, NY 11050
918-3892 p
rbgeast71@aoi.com
7 040 61571
Tahoe-GN
Site 2','["050 918-3892"]','["Sor Washington, NY 11050"]','["rbgeast71@aoi.com"]','From Black Book - 1 phones, 1 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3084,91568,'Richie Line
2 Richie time ;','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3085,54244,'Rich f','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3086,91569,'Ruantf
T(P)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3087,91570,'Lynn
Lyne Bojo (hit)
14 Merc.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3088,91571,'Garage
Tahog-Garage
43, 47 %h ()
Flowers-Gary Baura','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3089,91572,'Flowers
. 001
917 207 223
12 675 2476 PM onh
Email: baurane work@ ya-
hoo.com
aka','["001 917 207","001 917 207 223"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3090,91573,'Fo Rosalyn and Ludan','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3091,91574,'Lynn & Jojo
301 East 66th Street (h)
Apartment NY 10021
20 355 248 on Skype pint
312 19 89 83P','[]','["Apartment NY 10021"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3092,91575,'Gaston Steve','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3093,91576,'Graces Marketplace
1237 Thistleday 10021
202-73N
Acct # 5002','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3094,91577,'Hamblin, Sue
41 Meadow Way','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3095,91578,'Constantia Meadows
ape 957','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3096,91579,'South Airi
1127 247618 262(8)
Email: suehamblin2003 @ya-
hoo.com','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3097,91580,'Mile a Kared','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3098,91581,'Charles
014 235-6555 Wor
m)Mite Rave no.com','["014 235-6555"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3099,91582,'Hamilton Avenue
1992 9d5 1069 (h emergency)
Sawyers Tom/Pat (tele-','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3100,91583,'BD COA 0 513.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3101,91584,'NJ 08825
308-996-6958 (1
808 20 2 Toni
# 4195978 Pal beeoer 1801
759 724:
908 561 2641 ppl''s home','["308-996-6958","908 561 2641","08825 308-996"]','["NJ 08825"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3102,117,'Tindall, Brent
301 East 66th Street','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3103,83858,'Apartment 8C','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3104,21103,'New York','[]','["New York"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3105,91310,'NY 10021
917 681 1373 (8)
KENYA (K)','["917 681 1373","0021 917 681"]','["NY 10021"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3106,91585,'Muthaiga Club
010 254 2 767754/5/6
KINNERTON','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3107,91586,'Airport Transfers
- 0207-403-2228','["207-403-2228","0207-403-2228"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3108,91587,'Charile
838821625-58','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3109,91588,'Chelsea Police Station
0207-7416212
37802 826 109','["207-7416212","826 109 0207","416212 3780","0207-7416212"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3110,91589,'Courted Sandinal Centre','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3111,91590,'Earls Court SWS ONI','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3112,91591,'Drivers
comeminibus@hotmail.com
•дяє6 6644 Les Walla','[]','[]','["comeminibus@hotmail.com"]','From Black Book - 0 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3113,91592,'Entwistle Isi
8287070788','["8287070788","070788 8287"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3114,91593,'Hair Assocs','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3115,91594,'Janise
8207-238 9237','["207-238 9237"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3116,91595,'Harrods Limited
071-730 1234
#87
135 Brompton Road
071-730 1238, London SW1XTX','["071-730 1234","071-730 1238"]','["071-730 1238, London SW1XTX"]','[]','From Black Book - 2 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3117,91596,'Harvey Nichols
071-235 7207','["071-235 7207"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3118,62530,'Holland & Holland
272-182 1755 (NY)','["272-182 1755"]','["272-182 1755 (NY)"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3119,91597,'Jackson Stops
lyn & dango
070-581 58','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3120,91598,'John Hobbs Ltd.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3122,91599,'La Familia
351 0761
Martin Tim/Debbie Stew','[]','["La Familia"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3123,91600,'Grosvenor Estate
0207-408 098t
0207-312 6201 (td)','["207-312 6201","0207-408 098","0207-312 6201"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3124,91601,'Martine
0207-33039 (k)
Massage - UK (a)
40P 256 289 Joanne Bur
(01616 300982 Barry (Amste)
0207-838 9130 2nd Line
87785771552 Pange Rover','["207-838 9130","8778577155","01616 300982","0207-838 9130"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3125,91602,'Minicabs
0800-654321','["654321 0800","0800-654321"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3126,91603,'Nags Head','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3127,91604,'Cavin & Valari
0207-331 1785 (1)','["207-331 1785","0207-331 1785"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3128,96533,'O''Neil Nessa
0207-235 1209 (1)
0207-458686(F)','["207-235 1209","0207-235 1209","0207-458686"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3129,91606,'Oping
01865 726297','["726297 0186","01865 726297"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3130,91607,'Outred, Anthony
6287231 6109 Felicity (Thai)
75 508','["287231 6109","508 6287231"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3131,94135,'Maxwell, Ghislaine
(mi ledex package to Simon Ed.)
(Movers)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3132,91608,'Police 24 hours
0207-321-8273','["207-321-8273","0207-321-8273"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3133,14740,'Range Rover
0771 4236573','["771 4236573","0771 4236573"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3134,16455,'Ray John
001 212 715 7227 (w)
wspr.it.','["212 715 7227","001 212 715","001 212 715 7227"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3135,91609,'Stichcraft
071-629 7919
Contact:','["071-629 7919"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3136,91610,'Yara
212712-2195
KOSTEL
skos. Or. De
21229033','["212712-2195","229033 2127","033 212712"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3137,91611,'Coba Bruce','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3138,91612,'Harcourt House
9A Cavendish
0207-5800540','["207-5800540","0207-5800540"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3139,91613,'Dr. Bruno
55 Plonk Avenue 1802
12 838 315
Dr. Dean Galakos
379 Columbus Avenue
28X 122 85 10024
Dr. Farkus
30 East 60th Street
292 355 5145','["292 355 5145"]','["55 Plonk Avenue 1802"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3140,91614,'Paio SB, Dr. Kashel
561-478-1104
Dr. Schimoni
317 322 5','["561-478-1104"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3141,91615,'Ear Conning
300 Mez 5823 3400','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3142,91616,'Saynor, Dr. J R
9 Cadogan Place
0207-730 3700','["207-730 3700","0207-730 3700"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3143,91617,'Hirshfield, Dr.
814-232-3038','["814-232-3038","038 814-232"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3144,91618,'Ishmail
77 Prince Street
1 os & ompon
212 717 1688 fax','["212 717 1688"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3145,57542,'Lee, Dr.
814-389-388','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3146,91619,'Lister Hospital
0207-235 2672','["207-235 2672","0207-235 2672"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3147,91620,'Magnani, Dr.
501 Madison Ave
V 22 37 002989 2101
12 88 109
205 529 3956 fax
4311440 01 Oxford ID number
Berton yens Prudenti 10 um.','["002989 2101","205 529 3956"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3148,91621,'MedLink Emergency
001602 239 3627
002','["602 239 3627","001602 239","002 001602","001602 239 3627","002 001602 239"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3149,91622,'Krumholtz, Dr. Michael','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3150,10991,'Moskowitz, Dr. Bruce
8486351(1)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3151,91623,'Oxford Health Plans
800 201 4911
890 444 607 Member number','["800 201 4911"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3152,91624,'Prudential
800 843 3661
steinoura D','["800 843 3661"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3153,95457,'Y Hospital 525 E 68th
001 212 748 4100','["212 748 4100","001 212 748","001 212 748 4100"]','["Y Hospital 525 E 68th"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3154,91625,'Sternberg, Esther Dr.
Washington Street.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3155,91473,'Washington, DC
081202 237 5020
Email: stember@beliatianlic.net','["202 237 5020","081202 237"]','[]','["stember@beliatianlic.net"]','From Black Book - 2 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3156,91626,'Tom, Maggie
0207-486 9272','["207-486 9272","0207-486 9272"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3157,91627,'Victor, Steve Dr.
3Y 71002 (PSM) 67','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3158,76128,'Bi6 62 C2E Beach
313 328 1693 emergency','["313 328 1693"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3159,91628,'Wyntik, Wayne
chiropractor
212-249-7790','["212-249-7790"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3160,91629,'Babor
561 832 9385','["561 832 9385"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3161,44822,'Bard, Dr. Perry
4275 Okeechobee Blvd (W)
561 640 9999 (w) WP8
mail: dacbones77@aol.com
S. Ocean Bive
58208 B76ch1','["561 640 9999"]','[]','["dacbones77@aol.com"]','From Black Book - 1 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3162,91630,'FL 33487
561 302 1844 (p)','["561 302 1844"]','["FL 33487"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3164,91631,'Chiropractor','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3165,67433,'Or Bard
001 407 B40 0000','["0000 001 407"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3166,91632,'Cleaners','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3167,79678,'Francis Peadon
561 832 4486
1 561 820 4642 (w) Bill - husband
witness
Creative Custom Swim-
wear
wn Center Pla
lantown','["561 832 4486","561 820 4642"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3168,91633,'Jupiter
5647478424','["5647478424"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3169,91634,'Devito, Dawn
267 Atlantic Ave','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3171,91636,'Watertown
921832 4616 Paim Beach Home
617-926 7877 Boston
401-423-9886 Rhode Island','["921832 4616","617-926 7877","401-423-9886"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3172,91637,'Driver - PB
305491 1998 Ray','["305491 1998"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3173,91638,'Staff House Line 1
0319 Staff House Line 2
14 Staff House Line 3
4533 Staff House Line 4
818 8398 Salv (0
561 369 4354 Jerome Pierre-gar-
-$81641 0728 Jerome Pierre-gar-
→ 56
881888 1784
1700 Christophe E
561 762 2741 Paula (car) -
3183061382 Ronnie Carey
14015 cal ovaring i)
witness
3812807298 (B','["561 369 4354","881888 1784","561 762 2741","3183061382","3812807298"]','["0319 Staff House Line 2","14 Staff House Line 3","4533 Staff House Line 4"]','[]','From Black Book - 5 phones, 3 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3174,91639,'Goldman, Francis
867546 7141 GM Merc SL5S
1-6
212308 0519 emerg.','["867546 7141","212308 0519"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3175,91640,'Maronet, Bill
61-881-8118
Phones
assage','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3177,91641,'Cher i unchsh
Dawn W-R (W
Cher Lynch(p)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3178,91642,'Alsoni
chamners
76 Jodie
fA ladio ini
flashet
Alexandra (
546 Johanna''s cell
0676
561 707 1789 Dominique & Keily
991 214 2319 Mary Southwell
561 533 7599 Diane Cahill (h)
408 Diane Cahill p
561 798 6103 Andrea Ton''s
161858 8837 Heidi
coleen p','["561 707 1789","991 214 2319","561 533 7599","561 798 6103","161858 8837","0676 561 707"]','[]','[]','From Black Book - 6 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3179,91643,'Cristale','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3180,91643,'Cristale','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3181,91644,'Michelte Bail','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3182,91645,'Hawthornes
39 373 994 ДУ Ві в
Beth (o)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3183,91646,'Beth
carolyn (g)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3184,91647,'Carolyn
Casey (h)
73 Charlota (18
006 Charlotte (w)
0296 Chelsea 16
9105 Chelsea Facials
1412 Cheri Lynch (p)
2862 Coleen
9259 Cristale
046 Dara (p
25 0378 Debra big bond
381218 8987 Dina Lombardi
218 8687
9159 Dina (h)
564 802 4029
Gwendolen Aór
6) 525 2084 Hawthornes
•5 .','["381218 8987","564 802 4029"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3185,91648,'Mike Pezulo
1 Brillo neighbour
1800 834 9152(gr
0412 Kalja (h) gypsy''s
854 442 3309 Kiery (Lisa P''s','["800 834 9152","854 442 3309"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3186,91649,'Mogens, Larry
561 655 5510
0213 Kyle','["561 655 5510"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:07') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3187,91650,'Laura Klins
Lina (cosmo & co)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3188,91651,'Police PB
let 227 83580 (cop hire)/Pat
561338 5478
18 4546 Tom Melinch','["561338 5478"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3189,91652,'Pompano Helicopter
1 800 957 4374
954 9317186 (Sieve)
Jennifer-gymnast
1832 Ashley (fany,
5444 Tammy (Facialist)','["800 957 4374","954 9317186"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3190,91653,'Stopak, Alank','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3191,91654,'Vellingtor','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3192,94135,'Maxwell, Ghislaine
35 pre ga 33480
001 561 832
001467 346 7848 Mercedes','["561 832 0014","001 561 832","001467 346","001 561 832 0014"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3193,91655,'Vet','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3194,91656,'Jack Laguet
561 659 2208
1 L. BANCH (RH)
Email: obmanager@earthlink.net
001 505 884 4530
312-95-7278 home','["561 659 2208","505 884 4530","001 505 884","001 505 884 4530"]','[]','["obmanager@earthlink.net"]','From Black Book - 4 phones, 0 addresses, 1 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3195,91657,'Ellis Freedman
8333513092
gant Grou
6208-335199N4 2NW','["8333513092"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3196,91658,'Miranda, Bob
8812123396878
Moss Brian /Carolyn','["8812123396"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3197,91659,'Coleman
81865881185','["8186588118"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3198,91660,'Nesson, Mauri
881 3033258877 Aspen','["881 3033258","033258877"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3199,91661,'Lemaine, Pierre
2 Harewood Place (w)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3200,91662,'Hanover SMaSHE','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3201,91663,'Ondor
1207:499-77919
mail: keoliver@petersandpeters
im Flat 1 (h)
26 Tolingir Way','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3202,91664,'Nursen Scott and Sarah
89131278289','["8913127828"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3203,91664,'Nursen Scott and Sarah
881 212582880','["881 2125828"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3204,91665,'Marden, Scott & Sarah
001 212 702 8602 (w)','["212 702 8602","001 212 702","001 212 702 8602"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3205,91666,'Onakewe, Rodolph
47 Rue de Chaellot
P314723 0053','["314723 0053"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3206,17107,'Ord, Robert
0363105259
0836 208089','["0363105259","208089 0363","105259 0836","0836 208089"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3207,91667,'Paul Cox
7532206','["532206 7532"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3208,91668,'Pete diver Pen Meowell
2 Harewood Place','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3209,91669,'Shaw Derek
0205820944','["0205820944"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3210,91670,'Shelly Aboff
0012022','["012022 0012","0012022 0012"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3211,91671,'Tony Busby
0865 60684 X3593','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3212,91672,'Travis, Paul
0342 844686','["844686 0342","0342 844686"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3213,91673,'Pisar, Samuel
M33144159415 Caroline','["3314415941"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3214,91674,'White, Justin
8785734373
9r2 12 8800 x15 Leah Pisar (W) BUGS
242829 8300 KiSLean Pisar
work','["8785734373","242829 8300"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3215,91675,'Paris, Rome','[]','["Paris, Rome"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3216,91676,'Posen, Felix
SECURITY (SC)
cotland Yar
07.330 12
(SW)
TRAVEL (I)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3217,91677,'Aero Leasing
814 3700 (Zuri
rich
2) 984510 (Gene','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3218,14566,'Air France
1-800-202-2047
0-089
9047
800 433 7300
ami special se
1-800-297-6453
Abdullah :
(Cent. Cards)
AT&T
1-800-225-5288
gencies)
718 553 5585 Penelope Foy
9842% 5585 Berette Berry-
Spec. Rep.','["800-202-2047","800 433 7300","800-297-6453","800-225-5288","718 553 5585","089 9047 800"]','[]','[]','From Black Book - 6 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3219,91678,'Citicar
3515 37th Avenue
5089787-900','["787-900 3515","089787-900"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3220,70801,'City, NY 10021
800-456-3548
718-361-9800 Ellen/Tackia
00-456-3548 Toll-Free Number
downi','["800-456-3548","718-361-9800","0021 800-456"]','["City, NY 10021"]','[]','From Black Book - 3 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3221,91679,'DHL Courier
800-225-5345','["800-225-5345"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3222,91680,'Flight Options
26180 Curtiss-Wright Parkway','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3223,91681,'Flyaway
avid Gladw','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3224,91682,'Rutherford','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3225,91683,'Delta Dash
1-800-638-7333 ~-','["800-638-7333"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3226,91684,'Lonsdale','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3227,91685,'Karen','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3228,91686,'Net Jets','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3229,94603,'Nite & Day
70 Moonacha','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3230,91687,'Omar
To Trie?','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3231,91688,'Brunswick,
Phone
forward on site
forward from site
: Erin','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3232,91689,'Chauffalt','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3233,91690,'Platinum Travel
1800 525 3355
37938182 5931004 PME
....
...','["800 525 3355","938182 5931"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3234,76976,'Raytheon Travel Al
leorge Kocha
Safe 30 perang Office Park
1 888 835 9782 Book light
11 in gren yanking rax
877 357 1263 Flight Options','["888 835 9782","877 357 1263"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3235,91691,'Red Carpet Limousine','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3237,91692,'Saphire Travel
01170 522 2226
Shopper''s Travel
ON VORAXY 1801
vite 100
212-798800','["170 522 2226","100 212-7988","01170 522 2226"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3238,91693,'Sprint
308-386 2665 conference call','["308-386 2665"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3239,91694,'SR Reservations
081-439 4144','["081-439 4144"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3240,91695,'Steppes East','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3241,91696,'Marc Bullough
35 8102
Travel Consolidator Eu-','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3242,91697,'Kevin Travel Contact
9207 338 8485 cheap Concorde
age Passalingo success voy
800 243 2784 CHEA
44 12 93 78 9000 Laker Airline:
60765 22 2. SSephire/charters
8ag 3e8 188 rating Trav-
St 53 e8 Take Planet ext.
Ice 6o 3737 FyTime Travel-
• U7
TWA','["207 338 8485","800 243 2784"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3243,67560,'US Air
001 800 428 4322 ≤','["800 428 4322","001 800 428","001 800 428 4322"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3244,93416,'AS i requent tier number','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3245,91698,'USA International','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3246,91699,'Virgin Atlantic Airways
029-356-200
400 900 065. 60ổ frequent tier
00799 044 628 frequent tier','["029-356-200","00799 044 628"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3247,91700,'Jeffrei
/o Dan and Nancy Sowl
highway 4
rey
505','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3248,91701,'Cac','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3250,91703,'Hotline Securit
modern','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3251,91704,'Bunk','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3252,91704,'Bunk','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3253,91704,'Bunk','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3254,91704,'Bunk','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3255,91704,'Bunk
op wood','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3256,91705,'Shop
og cabin
1364 Guest lodge cabin
103552
redem
ine
modem','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3257,91706,'Guest line
aff','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3258,91707,'Brice
Karen (h','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3259,91708,'Kate & Mice ih','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3260,91709,'Deidre & Floyd fri
26 Mike (Nextel)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3261,91710,'Bedro
Floyd (Nextel)
lanollo (vexiel)
DOO4
Kate (Nextel)
vira 1 (p)
505 660 9583 More front
305 660 3976 Mercedes - back
905 660 6240 Mercedes G500','["505 660 9583","305 660 3976","905 660 6240"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3262,91711,'Subaru
505 699 8055 Tahoe
505 670 97
505 765 1200 Bradbury Stamm
503 62 2668 Pon ace arm (7)
Paścuzzi
tealy. Shannot','["505 699 8055","505 765 1200"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3263,91712,'Zorro','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3264,91713,'Lancia
Santa FRing C87308
395 481898 Bam (Cheryl)','["308 395 4818"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3265,91714,'Kendy tom','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3266,91715,'Johr
3510 Wolters Place
N.E.
05848986 New Mexico 87106
(H)500 Fourth Street Nw','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3267,91268,'Suite 1000','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3268,55044,'A05:268-938B NM 87103-2168
303 848 1889 (%)','["303 848 1889"]','["A05:268-938B NM 87103-2168"]','[]','From Black Book - 1 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3269,91716,'Kerneman
landmari
• Gall
3grg Man on Manyand 20774.
240 463 3237(p)
100 410-349-1771
340463 3230 Emergency','["240 463 3237","410-349-1771","340463 3230","0774. 240 463"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3270,91717,'King, Bracer
505 983 6742 Maureen (GM re
30% 9894264 Slina - GM still to
8 138 33 Neil sagel
recommended).','["505 983 6742"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3271,7,'Richardson, Bill','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3272,91718,'Ing, Rhonc
onda Kind Ras
taniay, New Mexico 8705','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3273,91719,'Massage - New Mexico
505-299-3732 Diana (P)
505-271-9532
303-92-197 bane san
30847124 Melinda Walker-
005884 8182 saBina (German)','["505-299-3732","505-271-9532","005884 8182"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3274,91720,'Santa Fe Institute
399 Hyde Pak,501
antares
303-982-0500','["303-982-0500"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3275,91721,'Singleton, Dr. & Mrs.
ian Cristobal Ranc
08880972040','["0888097204","08880972040"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3276,91722,'Aboff Shelles
0013073302356','["0013073302","356 0013073","0013073302356"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3277,91723,'Cowley, Dick
0207-822 3691 (h)','["207-822 3691","0207-822 3691"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3278,91724,'Domb, Sam
New York, Park South #18F','[]','["New York, Park South #18F"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3279,91725,'Klinger, Georgette','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3280,91726,'Hatsuhana (Japanese)
0701212333385','["0701212333","385 0701212","0701212333385"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3281,91727,'Helmsley Palace
0101 212 888 7000','["212 888 7000","0101 212 888","000 0101 212"]','[]','[]','From Black Book - 3 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3282,91728,'Il Cantinori
32 East 10 (at Broadway)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3283,91729,'Il Tre Merli','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3284,91730,'West roadway
391 7098
Isabelle''s','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3285,42236,'Le Club
88th (2-3)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3286,91731,'Le Comptoir
27 East 57th Street','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3287,91732,'Madison Gourmet
31279937(84)','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3288,91733,'Jour et Nuit
212-925-5971','["212-925-5971"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3289,91734,'Karen Pets','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3290,91735,'Madre, Le
168 West 180
001212727 8022
310 880 3495 Tanya (Petrella''s)
310 709 8199 Auntie (p)','["180 0012127","310 880 3495","310 709 8199","001212727 8022"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3291,91736,'Zosman Gara''s friend,
310 709 8877 Elizabeth Zosman
210 435 3020 Chrisiv Thare','["310 709 8877","210 435 3020"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3292,21820,'Los Angeles','[]','["Los Angeles"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3293,46491,'Mark Hotel
212794300','["794300 2127"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3294,91737,'Mayfair Regent
0842242 3880600
Massage - California
319 4389 ingen Schwalser','["842242 3880","0842242 3880"]','[]','[]','From Black Book - 2 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3295,91738,'McMullan, Patric
photograph
714-468-1751acher
70 Jackie Iverso
2.071.8820 1ca Versac
219 43 Bake Sure yasy (can)
02. 743 0620 p Gypsy(p)','["714-468-1751"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3296,91739,'Mercer Kitchen
99 Prince
001 373 868 Doin','["001 373 868"]','[]','[]','From Black Book - 1 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3297,91740,'Morgan Hotel
001 212 686 0300','["212 686 0300","001 212 686","0300 001 212","001 212 686 0300"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3298,91741,'Mr Chow
324 € 57H','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3299,91742,'Now
3007319930
(Hm)151 Knightsbridge
Visitors Massage (P.B)
- Allison Chambors
- Johanna
- Jennifer
- Cordyn Andriano
- Kristen
- Alias
- Down
- Cache (B1ez1l)
- Perla
- Filicie
- Manucle
- Mark
- Courthoy Wild
- Tele
- Natelio
- Svotten
- Cheri Lynch
- Britney
- Jihanna
- Brittany
- Cachs
- Jenny
- Katyz
- Emmy
- Nina
- Allison
(561) 751-1011
(561) 050-0185
(561) 515-9814
(561) 478-0496
(561) 832-6777
(561) 707-35651
(917) 774-4452
(561) 776-5679
00551183834951
917) 518 - 2434
303) 51 - 8013
(212) 308 Ciri
(561) 644-1639
(561) 202-0188
(911) 603-2296
917) 204-9696
(917) 774-3061
(66) 373-1422
161) 644-7226
(561) 714-0546','["3007319930","007319930","679 0055118","0055118383495","00551183834951"]','[]','[]','From Black Book - 5 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3300,91743,'Coci
547-2415
(221)
563-7171
(917)
330-1033
917)
678-2772
(323) 821-3699
917) 294-1627
6310267-6215
- fandrez
- Kolly
- Molissz
- Dobr
-Heidi
- Katyz
- Alicia
4 - Carolino
(561) 798-6103
(561) 707-1789
(561) 641-7658
561) 625-0378
(954) 452-8582
954 467-0412
(911) 345-3107
(305) 321-4022
i::i.
- . . .','["627 6310267","215 547-2415","0267-6215 547","954 467-0412"]','[]','[]','From Black Book - 4 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3301,91744,'Important e-mail (addresses)
#.JeffreyE.Epstein:joffreye@mindspring.com
jesproject@yahoo.com
zorroranch@eol.com
apstein@wanzdoo.fr
### Chislain@ Mexwall: gmex1@mindspring.com
P.B)
(N.X)
(M.M)
(Peris)
(NX)
- In House-
- Tim Newcombe
(Citrix Systems Programmer)
(614) 361-8625 Call.
(614) 481-7628 4.
12) 755-1050 - Charloy Pelmer
(Chal-Aurodo Restaurant) NIC
10) 274-0323 Joe Pageno (Chaf-Aspon, (0,)
(Impon Christopho Fronc Driver) PB (56) 350-1700
→ Jet evacuation
(561) 233-7242
(561) 233-7240
→ Secret Service Personal escorting
Mr. Berak, Ehud Formor P.M. of Israel on
J. Epstein plenos.-
→ Ioan-Luc Brundl
Brundl "Scout" for young women','[]','[]','["joffreye@mindspring.com","jesproject@yahoo.com","zorroranch@eol.com","apstein@wanzdoo.fr","gmex1@mindspring.com"]','From Black Book - 0 phones, 0 addresses, 5 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3302,91745,'Karin Modos
(212) 226-4100
- David Copperfield (Magician) (702) 235-5555
- Eva Andersson Formor modal in mother-daughter role.','[]','[]','[]','From Black Book - 0 phones, 0 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
INSERT INTO black_book_entries (id, person_id, entry_text, phone_numbers, addresses, email_addresses, notes, page_number, document_id, entry_category, created_at) VALUES(3303,91746,'Dubin)
(212) 288-4844
- Derid Cook Palm Beach (2004-2005) Witness,
interacted and chatted daily with underage girls.-','[]','["- Derid Cook Palm Beach (2004-2005) Witness,"]','[]','From Black Book - 0 phones, 1 addresses, 0 emails',NULL,NULL,'original','2026-01-06 01:36:08') ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('black_book_entries', 'id'), COALESCE((SELECT MAX(id) FROM black_book_entries), 1), true);
`);
}

export async function down(_pgm) {
  // Historical prod data restoration. Intentionally no-op.
}
