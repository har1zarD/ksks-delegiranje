-- Minibasket: brojevi licenci za sve igrače i službena lica (do sada niko nije imao broj).
-- Niz 001-199 za takmičenje, bez ponavljanja: po klubu abecedno, zatim po ekipi, igrači pa službena lica.
update public.licenses set license_no = v.license_no
  from (values
    ('433cc3f2-f6ca-44b9-bf0c-2fac5b7607dd'::uuid, '001'), -- KK BBY: Zejd Atović
    ('f94d4522-ff57-48ed-bae2-0a7b5f0db4d4', '002'), -- KK BBY: Esal Suljković
    ('fdde27c7-a25b-417a-9e12-acc3a9883a8c', '003'), -- KK BBY: Patrik Krmek
    ('3607381d-7c3d-47a5-a81e-1ca806822684', '004'), -- KK BBY: Ishak Halilović
    ('2b9e48b1-1caa-418b-98d0-2856ad99b15d', '005'), -- KK BBY: Eldan Hodžić
    ('1775d387-1d77-4b39-90e2-45dbc978fc51', '006'), -- KK BBY: Eman Bjelak
    ('728ba689-0f4d-452d-8cbf-5472ad64ca6d', '007'), -- KK BBY: Artis Vlahen
    ('1e69c0a4-4f09-423c-b6cc-e602990ed169', '008'), -- KK BBY: Bilal Ibrahimagić
    ('8874baea-5468-424e-8108-286b82125acd', '009'), -- KK BBY: Ahmed Ljevo
    ('d1c3324b-940e-44d8-96a8-4419ec9daa9a', '010'), -- KK BBY: Damir Čerkez
    ('feba3be6-b389-4de5-ba41-2d3b51d276ad', '011'), -- KK BBY: Adin Kadrić
    ('706b240c-e384-4131-8ac1-ccbfd393fcc8', '012'), -- KK BBY: Džan Keško
    ('788865cd-ab51-41af-a9b6-80844db6101e', '013'), -- KK BBY: Orhan Polimac
    ('eb234e7f-d520-4c4c-b545-11e716efcdb6', '014'), -- KK BBY: Afan Bublin
    ('c67e3231-645f-4615-b6e2-f6c5d26f6ce3', '015'), -- KK BBY: Karlo Šimunović
    ('c5f9af63-0fc1-45fa-afe7-5b0af53ee947', '016'), -- KK BBY: Abdulah Alijagić
    ('4d9f9209-6422-4c05-b9ac-7fbd1bb2c9a5', '017'), -- KK BBY: Irfan Babunović
    ('51a8f37e-02dc-4502-bfd5-b3f8716ccfb8', '018'), -- KK BBY: Amar Bilić
    ('da054f26-892c-4b5c-b8ba-02d1df8663db', '019'), -- KK BBY: Emre Madžak
    ('d9e49f84-9a08-4f9d-8eaa-e971951df777', '020'), -- KK BBY: Rijad Hurić
    ('4c24883c-3eac-41d1-9fcb-c2aa79624769', '021'), -- KK BBY: Jasmin Kadrić (Trener)
    ('cbad1815-8068-4c30-a7f2-a2ed06c2fc87', '022'), -- KK BBY Jahorina: Danijel Komlenović
    ('fd496fde-5ee9-47e9-986b-7f377c9cb802', '023'), -- KK BBY Jahorina: Luka Karišik
    ('6a29727f-9d8a-44e5-8920-804692ef485e', '024'), -- KK BBY Jahorina: Marko Topić
    ('c4523fa8-be21-49ce-ac27-0c210c0eba56', '025'), -- KK BBY Jahorina: Andrej Mačar
    ('8493796b-4a26-4c69-bade-028eb2b9ac80', '026'), -- KK BBY Jahorina: Nikola Stolica
    ('6cc4d2d2-9bfc-4cf0-ba43-d94a1b34aa2e', '027'), -- KK BBY Jahorina: Aleksa Šegrt
    ('67ec701c-035e-4776-a9ed-95f50e929c0f', '028'), -- KK BBY Jahorina: Novak Šehovac
    ('635673c0-a1a4-48fc-99f3-bd791fef3a96', '029'), -- KK BBY Jahorina: Lazar Muharemović
    ('b208dd4b-c3cf-472b-b354-faf25783059d', '030'), -- KK BBY Jahorina: Dušan Blagojević
    ('e457c4a2-bac6-46e2-a2fa-7e82708d46bd', '031'), -- KK BBY Jahorina: Milutin Lučić
    ('cc1b4722-3224-43ff-8351-74d2d43e00eb', '032'), -- KK BBY Jahorina: Elena Ikonić
    ('ca49ae71-f240-4cff-9315-60e9426a563d', '033'), -- KK BBY Jahorina: Radoš Gajović
    ('53eba261-9434-4560-9238-1b6b147db413', '034'), -- KK BBY Jahorina: Luka Kosorić
    ('79eaad7e-7155-4de1-8c75-57e9af634c29', '035'), -- KK BBY Jahorina: Kosta Mrdić
    ('051f73c6-511d-4db0-b69b-cc8511660bba', '036'), -- KK BBY Jahorina: David Jugović
    ('b95cbf80-e977-4761-802f-d34d21e05fa3', '037'), -- KK BBY Jahorina: Marko Kovačević
    ('e61c7b07-bf69-4f96-bba9-3fc46a46b661', '038'), -- KK BBY Jahorina: Lazar Lučić
    ('3fdd3197-3cb8-480a-a36f-01c1aeb00b53', '039'), -- KK BBY Jahorina: Bojan Karišik (Trener)
    ('55413c09-d7a8-4d1c-99bf-1940e76a4828', '040'), -- KK BBY Jahorina: Mirko Šegrt (Pomoćni trener)
    ('3f80659b-b71d-4703-8bb6-44e48a964d68', '041'), -- KK BBY Jahorina: Nikola Blagojević (Pomoćni trener)
    ('787e458f-870a-42a5-827d-c66fafed87e3', '042'), -- KK Feniks: Eli Galijašević
    ('44878be6-5f41-459c-b983-60cca0fbbf80', '043'), -- KK Feniks: Abdulah Kapo
    ('a986c186-870d-4d2a-a504-7952e7a8dc15', '044'), -- KK Feniks: Ali Alihodžić
    ('6509bc0c-e532-4593-ac23-4e02618b138c', '045'), -- KK Feniks: Džan Baždarević
    ('2095ae5c-f6a1-4fc6-a29e-4079152e5bfa', '046'), -- KK Feniks: Max Bravo
    ('0c3ab6f3-e999-4988-856b-a72386971658', '047'), -- KK Feniks: Benjamin Kuršumlić
    ('fdbb35c3-8bb7-4712-af58-78ac1da90a00', '048'), -- KK Feniks: Vedad Muminović
    ('03be3541-dd96-4c44-a6d4-a7e763999704', '049'), -- KK Feniks: Tarik Pleh
    ('7bbb1077-da52-4f51-8172-1a0e268942ff', '050'), -- KK Feniks: Benjamin Pašić
    ('2ba3cdc4-0cf9-427f-9009-636ca2b6af1b', '051'), -- KK Feniks: Muhamed Mušović
    ('03f890c9-11ed-4b3d-9e2e-4391d225c7d9', '052'), -- KK Feniks: Hamza Bećirović
    ('e60ed56e-2594-4074-bfa5-20b5a81aacfd', '053'), -- KK Feniks: Amar Hodžić
    ('3cbfada7-8fbd-4e69-b4f4-63c49915fb56', '054'), -- KK Feniks: Imran Tursunović
    ('24bb5f9f-20ab-4e44-a3aa-b58a79f20610', '055'), -- KK Feniks: Ishak Poplata
    ('4aadf709-725d-451a-b3b3-90d0b9009df5', '056'), -- KK Feniks: Noa Zatega
    ('1194bae6-d53c-40b3-96db-3476b14ca6d1', '057'), -- KK Feniks: Kan Zatega
    ('a70fb27b-299c-4d2d-8969-78084185fd2f', '058'), -- KK Feniks: Emir Bahuna
    ('ef8f6e96-2238-4c62-8898-4a39595e8a41', '059'), -- KK Feniks: Ajnur Memović
    ('90f39b80-96b9-48f5-b4d9-341fdea5843a', '060'), -- KK Feniks: Vedad Hrustemović
    ('02c67629-7fff-4e05-8be6-55b7b58d5b01', '061'), -- KK Feniks: Edin Kuršumlić (Trener)
    ('b6bf2d22-c151-4697-bd55-e548b16ff2b6', '062'), -- KK Feniks: Semir Smajlović (Trener)
    ('756e5785-5670-4ac3-95b0-94630af303d8', '063'), -- KK Feniks: Sanin Sudar (Trener)
    ('8d44b141-9ed9-4490-8d9a-645fd7e8b39b', '064'), -- KK Ilidža: Benjamin Nuhanović
    ('4f4a306a-d650-448b-8bbb-c497cc409ee7', '065'), -- KK Ilidža: Hamza Čavkić
    ('4ef8a452-83b3-4abe-99d8-f752d06f9ce1', '066'), -- KK Ilidža: Omar Kolašinac
    ('8eba3911-11c1-4fc0-a565-10077081b3ec', '067'), -- KK Ilidža: Dani Alić
    ('4df2456f-eb92-4e36-a51a-5b9c900549f0', '068'), -- KK Ilidža: Dani Herić
    ('1270112e-dc94-4773-a590-efad045acbb8', '069'), -- KK Ilidža: Afan Kadrić
    ('935dfefe-3b4c-45b1-b4f2-a1dfd47d1847', '070'), -- KK Ilidža: Kerim Potur
    ('9cfd76bb-a648-43b7-bc5f-3eb1e8d3021a', '071'), -- KK Ilidža: Timur Dobrača
    ('b456f55a-6c38-4824-9ec4-cebff9cca0e8', '072'), -- KK Ilidža: Dušan Babić
    ('9470ff32-9a4b-4f43-addf-f2eed51fac8b', '073'), -- KK Ilidža: Tarik Kopić
    ('c260470c-f7c7-4803-b8ad-42782f605ff5', '074'), -- KK Ilidža: Dario Ibrulj
    ('84401123-7589-47ba-920d-2d182930efd3', '075'), -- KK Ilidža: Rejan Memić
    ('283d3921-4b80-489b-a087-8faa53dd4d26', '076'), -- KK Ilidža: Alan Hodžić
    ('a0ea56a9-3bbc-480f-b6f0-f1dc16041226', '077'), -- KK Ilidža: Semin Mujčić
    ('de705578-8733-42b5-9bee-ce465cdb4ced', '078'), -- KK Ilidža: Vedad Guzonjić
    ('3370d49f-dc19-4740-9c4c-fbadff9a197c', '079'), -- KK Ilidža: Emir Uzunović (Trener)
    ('c0efa137-eef5-4d36-9848-265b0d63ee9a', '080'), -- KK Koš: Kan Balavac
    ('afe9d25a-4f0e-47ad-b1c3-47cd7220f200', '081'), -- KK Koš: Emir Kurtagić
    ('a46795b9-5366-4a80-87ba-6b605a711a9b', '082'), -- KK Koš: David Janjetović
    ('d08ae2da-7205-47f7-9e1e-62738e9404bf', '083'), -- KK Koš: Kerim Diglisić
    ('ca8e41ec-17f4-41be-b8d3-d9ce2feeb3b1', '084'), -- KK Koš: Karim Hasanagić
    ('ed2e1647-e0b9-4e21-8c27-e9ae6ff8d741', '085'), -- KK Koš: Danis Hrbat
    ('380de3f4-7a78-4ade-a39f-f51285acb0dc', '086'), -- KK Koš: Mustafa Pačo
    ('c6005eaa-f46d-440e-8dc1-3679de5e3b94', '087'), -- KK Koš: Adi Hadžiabdić
    ('3f078d2d-bc85-4ee2-ae42-fec47f12237d', '088'), -- KK Koš: Mak Voloder
    ('edd07b0f-62d9-4b3f-88c1-146209d0e731', '089'), -- KK Koš: Emir Ali Pehilj
    ('eb02a0d2-3f56-48a9-83d3-ef4d1451e31e', '090'), -- KK Koš: Andrej Arapović
    ('15aabc78-a7d1-4564-883c-cdfbee36acdf', '091'), -- KK Koš: Amir Klino
    ('78b68b2f-1df8-4c15-b4a4-946576eb02c8', '092'), -- KK Koš: Tarik Brkić
    ('c2bb3619-ff90-46b5-995b-44377fd685c1', '093'), -- KK Koš: Patrik Jurešić
    ('6b6e44d6-3818-431d-9b10-24ec9a0d31cd', '094'), -- KK Koš: Alen Valjevac
    ('4b80a7df-cad1-4de8-9426-1bf368e2740b', '095'), -- KK Koš: Emil Lugoli
    ('d841af46-ca24-4446-94c6-84c0f6629dae', '096'), -- KK Koš: Adi Ćurić
    ('6d3df0f4-3274-49e4-bcd8-31d12524c2b3', '097'), -- KK Koš: Danis Tasovac
    ('745382ab-80c4-44d1-96ce-b96cb3a1fa36', '098'), -- KK Koš: Feđa Rešidat
    ('378e6f78-6bc7-45dc-b5cf-f2f25ecde457', '099'), -- KK Koš: Rijad Hodović (Trener)
    ('7e0c18ee-86e1-47b0-88bf-07f24b8a80f6', '100'), -- KK Koš: Admir Tutić (Trener)
    ('8db6b0a9-4e6e-4902-affb-d78c6d34b83f', '101'), -- KK Koš: Faris Numić (Trener)
    ('4f511ab9-d4fa-44a9-a3ad-36d090c0c16d', '102'), -- KK Koš: Faris Povlakić (Trener)
    ('80f66033-cd83-4b7e-97f8-396a98f76672', '103'), -- KK Koš: Dino Delić (Trener)
    ('a7f2dadb-f9b0-4521-93bd-9df77b67c09e', '104'), -- KK Koš: Tarik Efović (Trener)
    ('5faff27e-686b-4896-9d84-0ccedeb251d4', '105'), -- KK Mladost: Adem Šabanović
    ('15544edd-bd7f-45fd-9f48-aece9e169981', '106'), -- KK Mladost: Danin Čizmo
    ('bb437998-5fe2-415f-ab9e-7ec683d104a3', '107'), -- KK Mladost: Ali Velić
    ('4cbb5920-69c0-435b-b271-91210f5cf06d', '108'), -- KK Mladost: Din Bulbulušić
    ('69b1ddd3-4c6b-4918-9c8d-e4cb36c1c988', '109'), -- KK Mladost: Hasan Čehić
    ('4c975bb8-8f9b-4848-9f95-195a5929113e', '110'), -- KK Mladost: Benjamin Krivokuća
    ('2c9cffbd-9036-48ca-a444-9a009b7a4d1a', '111'), -- KK Mladost: Adin Šehović
    ('6f8beb8d-a7bc-4991-9310-b785e7696d97', '112'), -- KK Mladost: Harun Muminović
    ('d4b44bf7-7388-4202-8611-08482016f777', '113'), -- KK Mladost: Adem Salketić
    ('105b77cf-562a-4860-a304-a14156564d61', '114'), -- KK Mladost: Jusuf Sarajčić
    ('be2bd944-a2b0-440a-bfb2-aa26b35e4651', '115'), -- KK Mladost: Zakir Mašić
    ('0c07ba14-b04c-41e9-995d-48d2cdf4ada9', '116'), -- KK Mladost: Ishak Medić
    ('97f26bf9-26ea-4ba9-8ceb-5a1cd49c7713', '117'), -- KK Mladost: Emrah Hasanović
    ('82581ad3-f4d3-4327-9783-11630dd64caf', '118'), -- KK Mladost: Eldin Herco (Trener)
    ('9fa7c8c2-4648-4267-a57c-8bd49a9e1b1c', '119'), -- KK Mladost: Hajrudin Vatreš (Trener)
    ('984a7dd4-d138-407d-99ae-9afa05040f75', '120'), -- KK Mladost: Benjamin Velić (Trener)
    ('a9e7bda1-c584-469c-8787-56c46acd726e', '121'), -- KK Mladost: Ivan Matičević (Trener)
    ('4f81bc67-6611-4bca-8bc8-bcc69b01e2ea', '122'), -- KK Mladost: Iris Abdukić (Trener)
    ('30641d91-568d-4378-9f01-c6ac0efad178', '123'), -- KK Mladost: Ibrahim Jašarević (Službeno lice)
    ('571ed8f3-978b-4347-8f26-27aa730aed1c', '124'), -- KK MVP: Omar Ćiber
    ('3a379c27-8f09-49f5-a005-47e874cdf2a3', '125'), -- KK MVP: Ersan Sačić
    ('cfa2e02d-d689-4efd-b15f-d5294b9f1293', '126'), -- KK MVP: Amar Šehović
    ('bbf48021-c1d0-4405-b9d2-a82fbf131963', '127'), -- KK MVP: Dan Filipović
    ('907b51c8-94e5-4b96-b809-791d499970ea', '128'), -- KK MVP: Rian Muratović
    ('5eb3dcfd-ee77-4803-a9a8-efa681a71572', '129'), -- KK MVP: Aslan Poturović
    ('a8d899f9-b73f-4445-b434-71a52ab19d4d', '130'), -- KK MVP: Edin Fejzić
    ('6457bcc6-204b-4489-a205-97aa9254eef1', '131'), -- KK MVP: Kerim Koluder
    ('3e9a9b99-6649-4462-bd59-730f7c4b4b0a', '132'), -- KK MVP: Davud Pezo
    ('f1878cad-a6a3-411c-9ce9-e1f95080dd27', '133'), -- KK MVP: Imran Alić
    ('42f873ab-5fac-46fd-863f-b6529ce2a76f', '134'), -- KK MVP: Mahdi Žgalj
    ('374b5e91-d2c8-47c0-bf3a-7a38f5ff22af', '135'), -- KK MVP: Imran Begić
    ('27e460a3-a380-41c7-8880-a6bc79b23de3', '136'), -- KK MVP: Riad Hadžija
    ('4e2dfa31-c63f-483d-b4c3-eef21b5c9d9c', '137'), -- KK MVP: Harun Andelija
    ('6e982e7b-7d60-409a-a091-a89b0d3e94d5', '138'), -- KK MVP: Faris Hadžić
    ('d9ecc229-6a2f-4b27-a7cc-f9ea1bc4a7cc', '139'), -- KK MVP: Emir Branković
    ('5feeb85b-0ffc-4f6d-b3ee-5a03b4eace68', '140'), -- KK MVP: Omar Sabrihafizović
    ('0b320a8a-43c1-42eb-9d47-990d65073b55', '141'), -- KK MVP: Dani Puzić
    ('59cf4747-abcc-479a-95d3-e2811eb326ae', '142'), -- KK MVP: Dženan Pilav (Trener)
    ('069361e8-472b-4287-8a40-0f1073ba30a3', '143'), -- KK MVP: Sead Pešto (Trener)
    ('723bf130-e684-41e9-bae0-f32286c3a1e4', '144'), -- KK Realway Bijeli: Seid Brulić
    ('f9eddaf7-5935-4e51-9f32-8a419d8059f5', '145'), -- KK Realway Bijeli: Arslan Đozo
    ('fde5012a-bc13-4748-9dbd-2433fa53620e', '146'), -- KK Realway Bijeli: Tarik Kadrić
    ('fa2eb42d-32eb-4da1-b66b-b8c540b706c9', '147'), -- KK Realway Bijeli: Amar Karadinović
    ('3faff981-3f96-4212-a894-bbade2999f8a', '148'), -- KK Realway Bijeli: Vedad Kovačić
    ('89fa9ae6-92fc-4205-aa54-db492b477c71', '149'), -- KK Realway Bijeli: Nedžad Kustura
    ('a332ec32-b744-46c9-af7f-5fce3031a766', '150'), -- KK Realway Bijeli: Adrijan Lisičić
    ('ea4f50bf-18bb-4f74-9564-913c70126c6a', '151'), -- KK Realway Bijeli: Davud Medunjanin
    ('67410399-671d-4b89-a76c-f554cabd80d2', '152'), -- KK Realway Bijeli: Adnan Zečić
    ('f22ab491-0766-4bd7-baf1-594661cc7b2d', '153'), -- KK Realway Bijeli: Emrah Smajić
    ('4ab04be8-03ed-4adb-8862-f84f67b941f9', '154'), -- KK Realway Bijeli: Afan Bajrić
    ('b2190587-0d0e-456c-ad61-6f52d2408f28', '155'), -- KK Realway Bijeli: Nuh Čomić
    ('8d906ed2-3f14-4cdc-b4a8-110fe0a962d0', '156'), -- KK Realway Bijeli: Omar Spahić
    ('62238a38-1c35-4b1a-8bfc-0134ed7cc110', '157'), -- KK Realway Bijeli: Amir Joldo
    ('dfeccb6f-f23f-4b1e-b14b-8dc13745b273', '158'), -- KK Realway Bijeli: Semir Mulaosmanović (Trener)
    ('1893ef73-3811-48c3-a102-d7980835b514', '159'), -- KK Realway Bijeli: Jasmin Topalović (Službeno lice)
    ('70c68751-cc71-412e-8000-7b8f724c2cbb', '160'), -- KK Realway Bijeli: Kaid Zubović (Službeno lice)
    ('ee44f4e2-d846-40c0-b16d-5aa343ce6b0d', '161'), -- KK Realway Plavi: Darijan Agić
    ('97a12a68-9ea2-4980-ae62-e6643b4a0242', '162'), -- KK Realway Plavi: Emin Ajnadžić
    ('5fd31b5a-7a1a-4b56-b7ac-fc0d9dbaa7a9', '163'), -- KK Realway Plavi: Bakir Hadžiabdić
    ('d15fd0bd-8f6b-4a14-a5a9-93c69da6e3f6', '164'), -- KK Realway Plavi: Nedim Huskić
    ('c5325e4f-f08c-4586-9bfe-e0a4451c94ce', '165'), -- KK Realway Plavi: Damir Jović
    ('6574ca16-9156-4503-876e-e888facfa9b1', '166'), -- KK Realway Plavi: Hamza Muratović
    ('0fa7fd77-1631-4760-9c77-01cf318e3986', '167'), -- KK Realway Plavi: Hamza Muratović
    ('c335ec85-a66e-4031-9a7a-a4210a8808eb', '168'), -- KK Realway Plavi: Edin Nalo
    ('52d6bf94-8994-40e8-bf33-1fbfb197b720', '169'), -- KK Realway Plavi: Ali Poturak
    ('0b8c3645-3ff1-46c5-8e1d-a82471da914a', '170'), -- KK Realway Plavi: Tarik Efendić
    ('1f576f23-5b59-44f6-a7d6-54b934f6cc7f', '171'), -- KK Realway Plavi: Karim Sarić
    ('7a5e5c06-e948-459e-9257-8a81ce01918b', '172'), -- KK Realway Plavi: Davud Starčević
    ('8598c145-bf17-4125-8a58-5308af1d3c35', '173'), -- KK Realway Plavi: Faris Svraka
    ('41ef88ef-2d30-4ecf-abe4-4b12db44f02d', '174'), -- KK Realway Plavi: Dar Kurtalić
    ('84f0ec75-e22e-430a-b777-7a05bab44109', '175'), -- KK Realway Plavi: Omar Efendić
    ('c714b5ef-12e7-4247-941d-6b21bd25f99b', '176'), -- KK Realway Plavi: Semir Mulaosmanović (Trener)
    ('cdba5066-fa66-49ae-98ac-15c424bdb8ef', '177'), -- KK Realway Plavi: Jasmin Topalović (Službeno lice)
    ('3d6df016-44dd-4296-9eb7-9a0e96c97503', '178'), -- KK Realway Plavi: Kaid Zubović (Službeno lice)
    ('d12dc4c1-cb21-41b8-84b8-23f4ceaf8c5d', '179'), -- OKK Igman: Mihajlo Trapara
    ('fd4858b5-ba48-4857-b8ff-3c5ab4a9046c', '180'), -- OKK Igman: Konstantin Uščumlić
    ('69089e0c-56e9-4af6-a310-4d0830ddcef3', '181'), -- OKK Igman: Andrija Lalović
    ('a89ab89b-ace4-47f1-9408-3589f0f03a60', '182'), -- OKK Igman: Andrija Banjanin
    ('ce6a3060-ff51-41c5-a5a5-0523e2ae9c63', '183'), -- OKK Igman: Miloš Markuš
    ('90ce820e-afc7-4f71-b612-1e60070833bf', '184'), -- OKK Igman: Maksim Markuš
    ('ef429ef4-1000-49a4-b3ca-7cc4364d4936', '185'), -- OKK Igman: Sergej Stikić
    ('4de395c0-be5f-4ce0-8b94-f088764c2161', '186'), -- OKK Igman: Pavle Pećanac
    ('a487a8bf-e268-44d3-aa37-3445926c3292', '187'), -- OKK Igman: Aleksa Kreštalica
    ('9bc22a5c-2732-4452-a8b6-3cc4ebaeac46', '188'), -- OKK Igman: Mirko Aškraba
    ('618574e8-4d32-4e98-893b-3a609e49abad', '189'), -- OKK Igman: Viktor Vučković
    ('535e6a34-58e4-4b73-a294-2f4a4659d00c', '190'), -- OKK Igman: Petar Gašević
    ('5deabf66-0abb-47c8-8857-4cfc7ea780b9', '191'), -- OKK Igman: Vukašin Šilj
    ('3580d06c-0b0a-4194-857c-b10d3a96b6a5', '192'), -- OKK Igman: Jakša Tomaš
    ('6cdcbf9b-35c6-42e0-96b5-ba9fddcf4165', '193'), -- OKK Igman: Jovan Drašković
    ('246f14ea-74b2-44dc-ac1a-664d34263c49', '194'), -- OKK Igman: Pavle Popić
    ('f45850b3-31b0-4637-b97d-47028d7aed02', '195'), -- OKK Igman: Veljko Plakalović
    ('d57382e1-218a-4d1e-ae47-a7e970dd83c4', '196'), -- OKK Igman: Lazar Vujinović
    ('48c9a095-c135-4e2b-b54c-cb3665a46968', '197'), -- OKK Igman: Luka Madić
    ('fd49c80d-b3fa-4800-82d8-fe58a9095f31', '198'), -- OKK Igman: Andrija Janjić
    ('dddaaccf-46d8-4790-8e22-c68eca7dd404', '199') -- OKK Igman: David Šehovac (Trener)
  ) as v (id, license_no)
 where licenses.id = v.id
   and licenses.competition_id = 'ecd30198-7ae7-4856-a411-d7bb0c7e35d3'
   and licenses.license_no is null;
