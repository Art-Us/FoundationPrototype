import bcrypt from 'bcrypt';
import { sequelize, Municipality, Organization, User, Alert, Resource, AuditLog } from '../models';

export const seedDatabase = async () => {
  try {
    console.log('🔄 Rozpoczynanie wypełniania bazy danych bogatym zestawem danych dla całej Polski...');

    // 1. Reset i synchronizacja bazy danych SQLite
    await sequelize.sync({ force: true });
    console.log('✅ Tabele bazy danych zostały wyczyszczone i zsynchronizowane.');

    // 2. Tworzenie Gmin i Miast (Municipalities) w całej Polsce
    const munisData = [
      { name: 'Kłodzko' },
      { name: 'Wrocław' },
      { name: 'Lądek-Zdrój' },
      { name: 'Kraków' },
      { name: 'Nowy Sącz' },
      { name: 'Zakopane' },
      { name: 'Warszawa' },
      { name: 'Płock' },
      { name: 'Gdańsk' },
      { name: 'Słupsk' },
      { name: 'Szczecin' },
      { name: 'Poznań' },
      { name: 'Kalisz' },
      { name: 'Rzeszów' },
      { name: 'Przemyśl' },
      { name: 'Bielsko-Biała' },
      { name: 'Racibórz' },
      { name: 'Nysa' },
      { name: 'Głuchołazy' },
      { name: 'Lublin' },
      { name: 'Toruń' },
      { name: 'Olsztyn' },
    ];

    const munis: Record<string, Municipality> = {};
    for (const m of munisData) {
      munis[m.name] = await Municipality.create({ name: m.name });
    }
    console.log(`✅ Utworzono ${Object.keys(munis).length} miast i gmin w całej Polsce.`);

    // 3. Tworzenie Organizacji (Organizations)
    const orgsData = [
      { name: 'Urząd Miasta i Gminy Kłodzko', type: 'samorzad' as const, muni: 'Kłodzko' },
      { name: 'Ochotnicza Straż Pożarna Kłodzko', type: 'sluzby' as const, muni: 'Kłodzko' },
      { name: 'Fundacja Ratownictwa i Pomocy Q', type: 'ngo' as const, muni: 'Kłodzko' },
      { name: 'Wojewódzkie Centrum Zarządzania Kryzysowego Wrocław', type: 'samorzad' as const, muni: 'Wrocław' },
      { name: 'Dolnośląskie WOPR Wrocław', type: 'sluzby' as const, muni: 'Wrocław' },
      { name: 'OSP Lądek-Zdrój', type: 'sluzby' as const, muni: 'Lądek-Zdrój' },
      { name: 'Wydział Bezpieczeństwa UMK Kraków', type: 'samorzad' as const, muni: 'Kraków' },
      { name: 'Komenda Miejska PSP w Krakowie', type: 'sluzby' as const, muni: 'Kraków' },
      { name: 'Małopolska Grupa Ratownictwa Specjalnego', type: 'ngo' as const, muni: 'Nowy Sącz' },
      { name: 'Tatrzańskie Ochotnicze Pogotowie Ratunkowe (TOPR)', type: 'sluzby' as const, muni: 'Zakopane' },
      { name: 'Stołeczne Centrum Bezpieczeństwa Warszawa', type: 'samorzad' as const, muni: 'Warszawa' },
      { name: 'Komenda Wojewódzka PSP w Warszawie', type: 'sluzby' as const, muni: 'Warszawa' },
      { name: 'Polski Czerwony Krzyż - Zarząd Główny', type: 'ngo' as const, muni: 'Warszawa' },
      { name: 'Miejski Sztab Kryzysowy Płock', type: 'samorzad' as const, muni: 'Płock' },
      { name: 'Morski Oddział Ratownictwa Wodnego Gdańsk', type: 'sluzby' as const, muni: 'Gdańsk' },
      { name: 'Pomorska Fundacja Pomocy Humanitarnej', type: 'ngo' as const, muni: 'Gdańsk' },
      { name: 'Zachodniopomorska Grupa WOPR Szczecin', type: 'sluzby' as const, muni: 'Szczecin' },
      { name: 'Wielkopolskie Centrum Zarządzania Kryzysowego Poznań', type: 'samorzad' as const, muni: 'Poznań' },
      { name: 'Podkarpackie Stowarzyszenie Pomocy Poszkodowanym', type: 'ngo' as const, muni: 'Rzeszów' },
      { name: 'Komenda Powiatowa PSP w Przemyślu', type: 'sluzby' as const, muni: 'Przemyśl' },
      { name: 'Beskidzka Grupa Ratownicza Bielsko-Biała', type: 'ngo' as const, muni: 'Bielsko-Biała' },
      { name: 'Komenda Powiatowa PSP w Raciborzu', type: 'sluzby' as const, muni: 'Racibórz' },
      { name: 'Komenda Powiatowa PSP w Nysie', type: 'sluzby' as const, muni: 'Nysa' },
      { name: 'Urząd Miejski w Nysie', type: 'samorzad' as const, muni: 'Nysa' },
      { name: 'OSP Głuchołazy', type: 'sluzby' as const, muni: 'Głuchołazy' },
      { name: 'Lubelski Sztab Ratownictwa i Wolontariatu', type: 'ngo' as const, muni: 'Lublin' },
      { name: 'Kujawsko-Pomorski Związek OSP Toruń', type: 'sluzby' as const, muni: 'Toruń' },
      { name: 'Warmińsko-Mazurska Służba Ratownictwa Olsztyn', type: 'sluzby' as const, muni: 'Olsztyn' },
    ];

    const orgs: Record<string, Organization> = {};
    for (const o of orgsData) {
      orgs[o.name] = await Organization.create({
        name: o.name,
        type: o.type,
        municipalityId: munis[o.muni].id,
      });
    }
    console.log(`✅ Utworzono ${Object.keys(orgs).length} organizacji w całej Polsce.`);

    // 4. Tworzenie Użytkowników (Users)
    const saltRounds = 10;
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const koordPassword = await bcrypt.hash('koord123', saltRounds);
    const userPassword = await bcrypt.hash('haslo123', saltRounds);

    const admin = await User.create({
      firstName: 'Piotr',
      lastName: 'Administrator',
      email: 'admin@fundacjaq.pl',
      password: adminPassword,
      phone: '+48 500 100 100',
      role: 'admin',
      organizationId: orgs['Fundacja Ratownictwa i Pomocy Q'].id,
      isVerified: true,
    });

    const koordKlodzko = await User.create({
      firstName: 'Marek',
      lastName: 'Koordynator-Kłodzko',
      email: 'koordynator.klodzko@samorzad.pl',
      password: koordPassword,
      phone: '+48 500 200 200',
      role: 'koordynator',
      organizationId: orgs['Urząd Miasta i Gminy Kłodzko'].id,
      isVerified: true,
    });

    const koordKrakow = await User.create({
      firstName: 'Andrzej',
      lastName: 'Koordynator-Kraków',
      email: 'koordynator.krakow@umk.pl',
      password: koordPassword,
      phone: '+48 501 333 444',
      role: 'koordynator',
      organizationId: orgs['Wydział Bezpieczeństwa UMK Kraków'].id,
      isVerified: true,
    });

    const koordWarszawa = await User.create({
      firstName: 'Michał',
      lastName: 'Koordynator-Warszawa',
      email: 'koordynator.warszawa@stolica.pl',
      password: koordPassword,
      phone: '+48 502 555 666',
      role: 'koordynator',
      organizationId: orgs['Stołeczne Centrum Bezpieczeństwa Warszawa'].id,
      isVerified: true,
    });

    const koordGdansk = await User.create({
      firstName: 'Krzysztof',
      lastName: 'Koordynator-Gdańsk',
      email: 'koordynator.gdansk@ratownictwo.pl',
      password: koordPassword,
      phone: '+48 503 777 888',
      role: 'koordynator',
      organizationId: orgs['Morski Oddział Ratownictwa Wodnego Gdańsk'].id,
      isVerified: true,
    });

    const koordNysa = await User.create({
      firstName: 'Tomasz',
      lastName: 'Koordynator-Nysa',
      email: 'koordynator.nysa@psp.pl',
      password: koordPassword,
      phone: '+48 500 300 300',
      role: 'koordynator',
      organizationId: orgs['Komenda Powiatowa PSP w Nysie'].id,
      isVerified: true,
    });

    const strazakKlodzko = await User.create({
      firstName: 'Jan',
      lastName: 'Strażak',
      email: 'jan.strazak@osp.pl',
      password: userPassword,
      phone: '+48 500 400 400',
      role: 'czlonek',
      organizationId: orgs['Ochotnicza Straż Pożarna Kłodzko'].id,
      isVerified: true,
    });

    const ratownikWopr = await User.create({
      firstName: 'Robert',
      lastName: 'Wodny',
      email: 'robert.wopr@dolnoslaskie.pl',
      password: userPassword,
      phone: '+48 600 700 800',
      role: 'czlonek',
      organizationId: orgs['Dolnośląskie WOPR Wrocław'].id,
      isVerified: true,
    });

    const pspWarszawa = await User.create({
      firstName: 'Adam',
      lastName: 'Oficer-PSP',
      email: 'adam.psp@mazowieckie.pl',
      password: userPassword,
      phone: '+48 601 222 333',
      role: 'czlonek',
      organizationId: orgs['Komenda Wojewódzka PSP w Warszawie'].id,
      isVerified: true,
    });

    const pckWarszawa = await User.create({
      firstName: 'Ewa',
      lastName: 'Wolontariusz-PCK',
      email: 'ewa.pck@pck.org.pl',
      password: userPassword,
      phone: '+48 602 444 555',
      role: 'czlonek',
      organizationId: orgs['Polski Czerwony Krzyż - Zarząd Główny'].id,
      isVerified: true,
    });

    // Użytkownicy oczekujący na weryfikację
    await User.create({
      firstName: 'Anna',
      lastName: 'Nowak',
      email: 'anna.nowak@ngo.pl',
      password: userPassword,
      phone: '+48 500 500 500',
      role: 'czlonek',
      organizationId: orgs['Fundacja Ratownictwa i Pomocy Q'].id,
      isVerified: false,
    });

    await User.create({
      firstName: 'Paweł',
      lastName: 'Kowalski',
      email: 'pawel.kowalski@samorzad.pl',
      password: userPassword,
      phone: '+48 500 600 600',
      role: 'czlonek',
      organizationId: orgs['Urząd Miejski w Nysie'].id,
      isVerified: false,
    });

    await User.create({
      firstName: 'Karol',
      lastName: 'Ochotnik',
      email: 'karol.ochotnik@osp.pl',
      password: userPassword,
      phone: '+48 500 777 888',
      role: 'czlonek',
      organizationId: orgs['OSP Lądek-Zdrój'].id,
      isVerified: false,
    });

    console.log('✅ Utworzono konta użytkowników i koordynatorów.');

    // 5. Tworzenie Alertów w całej Polsce z rozbudowanymi potrzebami (neededResources) i wpisami (posts)
    const now = Date.now();
    const oneHour = 3600 * 1000;

    const alertsData = [
      // 1. DOLNOŚLĄSKIE - Kłodzko
      {
        content: 'Gwałtowny przybór wody na rzece Nysa Kłodzka. Przekroczony stan alarmowy o 65 cm. Trwa uszczelnianie wałów i zabezpieczanie ujęć wody.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordKlodzko.id,
        municipalityId: munis['Kłodzko'].id,
        locationName: 'Kłodzko',
        county: 'powiat kłodzki',
        voivodeship: 'dolnośląskie',
        lat: 50.4380,
        lng: 16.6548,
        hoursAgo: 14,
        needed: [
          {
            id: 'nr-klo-1',
            resourceType: 'sprzet',
            name: 'Motopompy szlamowe dużej wydajności (>3000 l/min)',
            quantityNeeded: 12,
            quantityAllocated: 5,
            unit: 'szt.',
            urgency: 'krytyczny' as const,
            allocations: [
              {
                id: 'al-klo-1',
                organizationId: orgs['Ochotnicza Straż Pożarna Kłodzko'].id,
                organizationName: 'Ochotnicza Straż Pożarna Kłodzko',
                userId: strazakKlodzko.id,
                userName: 'Jan Strażak',
                quantity: 5,
                allocatedAt: new Date(now - 8 * oneHour).toISOString(),
                note: 'Wysłano 5 motopomp z remizy OSP Kłodzko',
              },
            ],
          },
          {
            id: 'nr-klo-2',
            resourceType: 'inne',
            name: 'Worki z piaskiem (napełnione, gotowe do ułożenia)',
            quantityNeeded: 3000,
            quantityAllocated: 1200,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [
              {
                id: 'al-klo-2',
                organizationId: orgs['Fundacja Ratownictwa i Pomocy Q'].id,
                organizationName: 'Fundacja Ratownictwa i Pomocy Q',
                userId: admin.id,
                userName: 'Piotr Administrator',
                quantity: 1200,
                allocatedAt: new Date(now - 6 * oneHour).toISOString(),
                note: 'Dostawa paletowa z magazynu centralnego Fundacji Q',
              },
            ],
          },
          {
            id: 'nr-klo-3',
            resourceType: 'ludzie',
            name: 'Ratownicy i wolontariusze do układania zapór',
            quantityNeeded: 30,
            quantityAllocated: 12,
            unit: 'osób',
            urgency: 'wysoki' as const,
            allocations: [
              {
                id: 'al-klo-3',
                organizationId: orgs['Fundacja Ratownictwa i Pomocy Q'].id,
                organizationName: 'Fundacja Ratownictwa i Pomocy Q',
                userId: admin.id,
                userName: 'Piotr Administrator',
                quantity: 12,
                allocatedAt: new Date(now - 4 * oneHour).toISOString(),
                note: 'Grupa 12 przeszkolonych wolontariuszy na odcinku mostowym',
              },
            ],
          },
          {
            id: 'nr-klo-4',
            resourceType: 'woda',
            name: 'Woda butelkowana 1.5L dla służb i mieszkańców',
            quantityNeeded: 1500,
            quantityAllocated: 1500,
            unit: 'zgrzewek',
            urgency: 'średni' as const,
            allocations: [
              {
                id: 'al-klo-4',
                organizationId: orgs['Urząd Miasta i Gminy Kłodzko'].id,
                organizationName: 'Urząd Miasta i Gminy Kłodzko',
                userId: koordKlodzko.id,
                userName: 'Marek Koordynator-Kłodzko',
                quantity: 1500,
                allocatedAt: new Date(now - 5 * oneHour).toISOString(),
                note: 'Zabezpieczono pełne zapotrzebowanie z rezerw gminnych',
              },
            ],
          },
        ],
        posts: [
          {
            id: 'post-klo-1',
            authorId: koordKlodzko.id,
            authorName: 'Marek Koordynator-Kłodzko',
            organizationName: 'Urząd Miasta i Gminy Kłodzko',
            role: 'koordynator',
            title: 'Raport z wałów przy ul. Chełmońskiego i Korczaka',
            content: 'Fala kulminacyjna spodziewana około godziny 18:00. Umacniamy newralgiczne przepusty. Potrzebujemy wsparcia w postaci pomp o wysokim przepływie.',
            postType: 'raport_terenowy',
            createdAt: new Date(now - 10 * oneHour).toISOString(),
            messages: [
              {
                id: 'm-klo-1',
                authorId: strazakKlodzko.id,
                authorName: 'Jan Strażak',
                organizationName: 'Ochotnicza Straż Pożarna Kłodzko',
                role: 'czlonek',
                content: 'Sekcja 2 OSP melduje gotowość na lewym brzegu. Prąd wody bardzo silny.',
                createdAt: new Date(now - 8 * oneHour).toISOString(),
              },
              {
                id: 'm-klo-2',
                authorId: admin.id,
                authorName: 'Piotr Administrator',
                organizationName: 'Fundacja Ratownictwa i Pomocy Q',
                role: 'admin',
                content: 'Dosyłamy dodatkowe 7 motopomp z hubu we Wrocławiu.',
                createdAt: new Date(now - 6 * oneHour).toISOString(),
              },
            ],
          },
        ],
      },

      // 2. DOLNOŚLĄSKIE - Wrocław
      {
        content: 'Wrocławski Węzeł Wodny: podwyższony stan Odry. Uruchomiono polder zalewowy Oławka. Tworzenie punktu hubu logistycznego dla całego regionu.',
        category: 'Pomoc humanitarna',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Wrocław'].id,
        locationName: 'Wrocław',
        county: 'Wrocław',
        voivodeship: 'dolnośląskie',
        lat: 51.1079,
        lng: 17.0385,
        hoursAgo: 10,
        needed: [
          {
            id: 'nr-wro-1',
            resourceType: 'sprzet',
            name: 'Łodzie płaskodenne i motorówki ratownicze',
            quantityNeeded: 8,
            quantityAllocated: 5,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [
              {
                id: 'al-wro-1',
                organizationId: orgs['Dolnośląskie WOPR Wrocław'].id,
                organizationName: 'Dolnośląskie WOPR Wrocław',
                userId: ratownikWopr.id,
                userName: 'Robert Wodny',
                quantity: 5,
                allocatedAt: new Date(now - 7 * oneHour).toISOString(),
                note: 'WOPR skierował 5 jednostek na Odrę',
              },
            ],
          },
          {
            id: 'nr-wro-2',
            resourceType: 'ludzie',
            name: 'Koordynatorzy magazynowi i wolontariusze',
            quantityNeeded: 40,
            quantityAllocated: 25,
            unit: 'osób',
            urgency: 'średni' as const,
            allocations: [],
          },
          {
            id: 'nr-wro-3',
            resourceType: 'inne',
            name: 'Koce termiczne, łóżka polowe i zestawy higieniczne',
            quantityNeeded: 500,
            quantityAllocated: 200,
            unit: 'kpl.',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [
          {
            id: 'post-wro-1',
            authorId: admin.id,
            authorName: 'Piotr Administrator',
            organizationName: 'Fundacja Ratownictwa i Pomocy Q',
            role: 'admin',
            title: 'Odprawa logistyczna Hub Wrocław Tarczyński Arena',
            content: 'Punkt przyjęć darów i ciężkiego sprzętu działa całodobowo przy Stadionie Wrocław. Przyjmujemy transporty z centralnej Polski.',
            postType: 'logistyka',
            createdAt: new Date(now - 5 * oneHour).toISOString(),
            messages: [],
          },
        ],
      },

      // 3. MAŁOPOLSKIE - Kraków
      {
        content: 'Stan wód Wisły na profilu Bielany przekroczył stan ostrzegawczy. Zabezpieczenie bulwarów wiślanych i instalacji przepompowni miejskich.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordKrakow.id,
        municipalityId: munis['Kraków'].id,
        locationName: 'Kraków',
        county: 'Kraków',
        voivodeship: 'małopolskie',
        lat: 50.0647,
        lng: 19.9450,
        hoursAgo: 16,
        needed: [
          {
            id: 'nr-krk-1',
            resourceType: 'sprzet',
            name: 'Mobilne zapory przeciwpowodziowe rękawowe (odcinki 20m)',
            quantityNeeded: 50,
            quantityAllocated: 30,
            unit: 'szt.',
            urgency: 'krytyczny' as const,
            allocations: [],
          },
          {
            id: 'nr-krk-2',
            resourceType: 'sprzet',
            name: 'Agregaty prądotwórcze dużej mocy (>50 kVA)',
            quantityNeeded: 6,
            quantityAllocated: 2,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-krk-3',
            resourceType: 'ludzie',
            name: 'Płetwonurkowie i ratownicy wodni PSP/OSP',
            quantityNeeded: 16,
            quantityAllocated: 8,
            unit: 'osób',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [
          {
            id: 'post-krk-1',
            authorId: koordKrakow.id,
            authorName: 'Andrzej Koordynator-Kraków',
            organizationName: 'Wydział Bezpieczeństwa UMK Kraków',
            role: 'koordynator',
            title: 'Wrota przeciwpowodziowe Salwator i Dębniki',
            content: 'Zamknięto bramy grodziowe na bulwarach. Zgłoszono zapotrzebowanie na rękawy wodne do podwyższenia wału w rejonie kładki Ojca Bernatka.',
            postType: 'komunikat_sztabowy',
            createdAt: new Date(now - 12 * oneHour).toISOString(),
            messages: [],
          },
        ],
      },

      // 4. MAŁOPOLSKIE - Zakopane
      {
        content: 'Gwałtowny wiatr halny (porywy do 145 km/h). Liczne wiatrołomy, zablokowana trasa DK47 (Zakopianka) oraz drogi lokalne do Kościeliska.',
        category: 'Komunikat drogowy',
        isActive: true,
        authorId: koordKrakow.id,
        municipalityId: munis['Zakopane'].id,
        locationName: 'Zakopane',
        county: 'powiat tatrzański',
        voivodeship: 'małopolskie',
        lat: 49.2992,
        lng: 19.9496,
        hoursAgo: 8,
        needed: [
          {
            id: 'nr-zak-1',
            resourceType: 'sprzet',
            name: 'Profesjonalne pilarki spalinowe do drewna i osprzęt',
            quantityNeeded: 20,
            quantityAllocated: 14,
            unit: 'kpl.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-zak-2',
            resourceType: 'sprzet',
            name: 'Pojazdy z wysięgnikami koszowymi do usuwania konarów',
            quantityNeeded: 4,
            quantityAllocated: 1,
            unit: 'pojazdów',
            urgency: 'krytyczny' as const,
            allocations: [],
          },
          {
            id: 'nr-zak-3',
            resourceType: 'ludzie',
            name: 'Pilarze-drwale z uprawnieniami do pracy na wysokości',
            quantityNeeded: 15,
            quantityAllocated: 10,
            unit: 'osób',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [
          {
            id: 'post-zak-1',
            authorId: koordKrakow.id,
            authorName: 'Andrzej Koordynator-Kraków',
            organizationName: 'Wydział Bezpieczeństwa UMK Kraków',
            role: 'koordynator',
            title: 'Sytuacja na DK47 i w rejonie Kuźnic',
            content: 'Trwa usuwanie kilkudziesięciu powalonych świerków. Policja kieruje ruchem przez Poronin.',
            postType: 'raport_terenowy',
            createdAt: new Date(now - 4 * oneHour).toISOString(),
            messages: [],
          },
        ],
      },

      // 5. MAZOWIECKIE - Warszawa
      {
        content: 'Podwyższony stan rzeki Wisły w Warszawie. Prowadzone są działania prewencyjne w rejonie Wału Miedzeszyńskiego oraz mostów Śląsko-Dąbrowskiego i Siekierkowskiego.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordWarszawa.id,
        municipalityId: munis['Warszawa'].id,
        locationName: 'Warszawa',
        county: 'Warszawa',
        voivodeship: 'mazowieckie',
        lat: 52.2297,
        lng: 21.0122,
        hoursAgo: 18,
        needed: [
          {
            id: 'nr-waw-1',
            resourceType: 'sprzet',
            name: 'Maszty oświetleniowe LED z agregatem prądotwórczym',
            quantityNeeded: 15,
            quantityAllocated: 8,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [
              {
                id: 'al-waw-1',
                organizationId: orgs['Komenda Wojewódzka PSP w Warszawie'].id,
                organizationName: 'Komenda Wojewódzka PSP w Warszawie',
                userId: pspWarszawa.id,
                userName: 'Adam Oficer-PSP',
                quantity: 8,
                allocatedAt: new Date(now - 10 * oneHour).toISOString(),
                note: 'Zadysponowano maszty z JRG 3 i JRG 5',
              },
            ],
          },
          {
            id: 'nr-waw-2',
            resourceType: 'sprzet',
            name: 'Drony obserwacyjne z kamerą termowizyjną',
            quantityNeeded: 4,
            quantityAllocated: 2,
            unit: 'zestawów',
            urgency: 'średni' as const,
            allocations: [],
          },
          {
            id: 'nr-waw-3',
            resourceType: 'ludzie',
            name: 'Operatorzy dronów i analitycy sztabowi',
            quantityNeeded: 6,
            quantityAllocated: 4,
            unit: 'osób',
            urgency: 'średni' as const,
            allocations: [],
          },
          {
            id: 'nr-waw-4',
            resourceType: 'inne',
            name: 'Pakiety żywnościowe MRE dla służb na wałach',
            quantityNeeded: 800,
            quantityAllocated: 500,
            unit: 'porcji',
            urgency: 'niski' as const,
            allocations: [
              {
                id: 'al-waw-2',
                organizationId: orgs['Polski Czerwony Krzyż - Zarząd Główny'].id,
                organizationName: 'Polski Czerwony Krzyż - Zarząd Główny',
                userId: pckWarszawa.id,
                userName: 'Ewa Wolontariusz-PCK',
                quantity: 500,
                allocatedAt: new Date(now - 7 * oneHour).toISOString(),
                note: 'Wydano 500 racji suchych dla strażaków',
              },
            ],
          },
        ],
        posts: [
          {
            id: 'post-waw-1',
            authorId: koordWarszawa.id,
            authorName: 'Michał Koordynator-Warszawa',
            organizationName: 'Stołeczne Centrum Bezpieczeństwa Warszawa',
            role: 'koordynator',
            title: 'Monitoring Wału Zawadowskiego i Miedzeszyńskiego',
            content: 'Pomiary geodezyjne i termowizja nie wykazują przesiąków. Wzmocniono obsadę stacji pomp na Wilanowie.',
            postType: 'komunikat_sztabowy',
            createdAt: new Date(now - 14 * oneHour).toISOString(),
            messages: [],
          },
        ],
      },

      // 6. MAZOWIECKIE - Płock
      {
        content: 'Zator lodowo-rumoszowy na Wiśle poniżej Płocka. Zagrożenie podtopieniem dzielnicy Radziwie. Akcja lodołamania i sypania wałów.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordWarszawa.id,
        municipalityId: munis['Płock'].id,
        locationName: 'Płock',
        county: 'Płock',
        voivodeship: 'mazowieckie',
        lat: 52.5463,
        lng: 19.7065,
        hoursAgo: 22,
        needed: [
          {
            id: 'nr-plo-1',
            resourceType: 'sprzet',
            name: 'Koparki o długim wysięgu do udrażniania zatorów',
            quantityNeeded: 4,
            quantityAllocated: 2,
            unit: 'maszyn',
            urgency: 'krytyczny' as const,
            allocations: [],
          },
          {
            id: 'nr-plo-2',
            resourceType: 'inne',
            name: 'Worki jutowe wzmacniane na piasek',
            quantityNeeded: 5000,
            quantityAllocated: 2500,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-plo-3',
            resourceType: 'woda',
            name: 'Woda pitna w baniakach 5L dla mieszkańców Radziwia',
            quantityNeeded: 1200,
            quantityAllocated: 600,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 7. POMORSKIE - Gdańsk
      {
        content: 'Zjawisko cofki morskiej: silny sztorm z północy wpycha wody Zatoki Gdańskiej do Motławy i Martwej Wisły. Przekroczone stany alarmowe w Nowym Porcie.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordGdansk.id,
        municipalityId: munis['Gdańsk'].id,
        locationName: 'Gdańsk',
        county: 'Gdańsk',
        voivodeship: 'pomorskie',
        lat: 54.3520,
        lng: 18.6466,
        hoursAgo: 6,
        needed: [
          {
            id: 'nr-gda-1',
            resourceType: 'sprzet',
            name: 'Wysokowydajne pompy powodziowe z napędem diesla',
            quantityNeeded: 10,
            quantityAllocated: 6,
            unit: 'szt.',
            urgency: 'krytyczny' as const,
            allocations: [],
          },
          {
            id: 'nr-gda-2',
            resourceType: 'sprzet',
            name: 'Rękawy przeciwpowodziowe napełniane wodą',
            quantityNeeded: 30,
            quantityAllocated: 15,
            unit: 'odcinków',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-gda-3',
            resourceType: 'ludzie',
            name: 'Ratownicy morscy i strażacy OSP do ochrony Długiego Pobrzeża',
            quantityNeeded: 25,
            quantityAllocated: 15,
            unit: 'osób',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [
          {
            id: 'post-gda-1',
            authorId: koordGdansk.id,
            authorName: 'Krzysztof Koordynator-Gdańsk',
            organizationName: 'Morski Oddział Ratownictwa Wodnego Gdańsk',
            role: 'koordynator',
            title: 'Sytuacja na Motławie i Westerplatte',
            content: 'Wrota sztormowe na Wiśle Śmiałej zamknięte. Poziom wody przy Długim Targu pod kontrolą pomp.',
            postType: 'raport_terenowy',
            createdAt: new Date(now - 3 * oneHour).toISOString(),
            messages: [],
          },
        ],
      },

      // 8. POMORSKIE - Słupsk
      {
        content: 'Awaria magistrali energetycznej średniego napięcia po nocnej nawałnicy. Brak zasilania w 4 gminach powiatu słupskiego, w tym w szpitalu rejonowym.',
        category: 'Awaria infrastruktury',
        isActive: true,
        authorId: koordGdansk.id,
        municipalityId: munis['Słupsk'].id,
        locationName: 'Słupsk',
        county: 'powiat słupski',
        voivodeship: 'pomorskie',
        lat: 54.4641,
        lng: 17.0285,
        hoursAgo: 12,
        needed: [
          {
            id: 'nr-slp-1',
            resourceType: 'sprzet',
            name: 'Mobilne generatory prądotwórcze o mocy >100 kW',
            quantityNeeded: 5,
            quantityAllocated: 3,
            unit: 'szt.',
            urgency: 'krytyczny' as const,
            allocations: [],
          },
          {
            id: 'nr-slp-2',
            resourceType: 'sprzet',
            name: 'Kable siłowe przemysłowe i rozdzielnice polowe',
            quantityNeeded: 20,
            quantityAllocated: 10,
            unit: 'kpl.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-slp-3',
            resourceType: 'ludzie',
            name: 'Uprawnieni elektrycy i monterzy sieci napowietrznych',
            quantityNeeded: 12,
            quantityAllocated: 6,
            unit: 'osób',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 9. ZACHODNIOPOMORSKIE - Szczecin
      {
        content: 'Wzrost poziomu Odry w Szczecinie i Zalewie Szczecińskim. Zamknięte bulwary Piastowskie. Zabezpieczenie wyspy Łasztownia.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordGdansk.id,
        municipalityId: munis['Szczecin'].id,
        locationName: 'Szczecin',
        county: 'Szczecin',
        voivodeship: 'zachodniopomorskie',
        lat: 53.4285,
        lng: 14.5528,
        hoursAgo: 15,
        needed: [
          {
            id: 'nr-szc-1',
            resourceType: 'sprzet',
            name: 'Łodzie z silnikiem zaburtowym i sonarem',
            quantityNeeded: 6,
            quantityAllocated: 4,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-szc-2',
            resourceType: 'ludzie',
            name: 'Sternicy motorowodni i ratownicy WOPR',
            quantityNeeded: 12,
            quantityAllocated: 8,
            unit: 'osób',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 10. WIELKOPOLSKIE - Poznań
      {
        content: 'Przybór wód rzeki Warty w Poznaniu. Uruchomiono poldery zalewowe Zagórów i Ląd. Przygotowanie punktu tranzytowego pomocy dla południa Polski.',
        category: 'Pomoc humanitarna',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Poznań'].id,
        locationName: 'Poznań',
        county: 'Poznań',
        voivodeship: 'wielkopolskie',
        lat: 52.4064,
        lng: 16.9252,
        hoursAgo: 20,
        needed: [
          {
            id: 'nr-poz-1',
            resourceType: 'woda',
            name: 'Cysterny do transportu wody pitnej (>10 m3)',
            quantityNeeded: 4,
            quantityAllocated: 2,
            unit: 'pojazdów',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-poz-2',
            resourceType: 'ludzie',
            name: 'Kierowcy kat. C+E z doświadczeniem w trudnym terenie',
            quantityNeeded: 10,
            quantityAllocated: 6,
            unit: 'kierowców',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 11. WIELKOPOLSKIE - Kalisz
      {
        content: 'Wylew rzeki Prosny w Kaliszu. Podtopienia w rejonie Rajskowa i Piwonic. Trwa ewakuacja inwentarza i sprzętu rolniczego.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Kalisz'].id,
        locationName: 'Kalisz',
        county: 'Kalisz',
        voivodeship: 'wielkopolskie',
        lat: 51.7673,
        lng: 18.0853,
        hoursAgo: 9,
        needed: [
          {
            id: 'nr-kal-1',
            resourceType: 'sprzet',
            name: 'Przyczepy do transportu zwierząt gospodarskich',
            quantityNeeded: 6,
            quantityAllocated: 3,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-kal-2',
            resourceType: 'ludzie',
            name: 'Weterynarze i technicy weterynarii',
            quantityNeeded: 5,
            quantityAllocated: 2,
            unit: 'osób',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 12. PODKARPACKIE - Rzeszów
      {
        content: 'Gwałtowne opady deszczu w zlewni Wisłoka. Zabezpieczanie stacji transformatorowej i podstacji wodociągowej w Rzeszowie.',
        category: 'Awaria infrastruktury',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Rzeszów'].id,
        locationName: 'Rzeszów',
        county: 'Rzeszów',
        voivodeship: 'podkarpackie',
        lat: 50.0412,
        lng: 21.9991,
        hoursAgo: 11,
        needed: [
          {
            id: 'nr-rze-1',
            resourceType: 'sprzet',
            name: 'Pompy membranowe do odwadniania obiektów zamkniętych',
            quantityNeeded: 8,
            quantityAllocated: 4,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-rze-2',
            resourceType: 'sprzet',
            name: 'Osuszacze przemysłowe powietrza dużej kubatury',
            quantityNeeded: 15,
            quantityAllocated: 5,
            unit: 'szt.',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 13. PODKARPACKIE - Przemyśl
      {
        content: 'Rzeka San w Przemyślu: stan alarmowy przekroczony o 40 cm. Funkcjonuje centralny punkt recepcyjny i magazyn humanitarny.',
        category: 'Pomoc humanitarna',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Przemyśl'].id,
        locationName: 'Przemyśl',
        county: 'Przemyśl',
        voivodeship: 'podkarpackie',
        lat: 49.7839,
        lng: 22.7678,
        hoursAgo: 24,
        needed: [
          {
            id: 'nr-prz-1',
            resourceType: 'ludzie',
            name: 'Psycholodzy kryzysowi i tłumacze',
            quantityNeeded: 8,
            quantityAllocated: 5,
            unit: 'osób',
            urgency: 'średni' as const,
            allocations: [],
          },
          {
            id: 'nr-prz-2',
            resourceType: 'inne',
            name: 'Śpiwory zimowe i materace samopompujące',
            quantityNeeded: 300,
            quantityAllocated: 150,
            unit: 'szt.',
            urgency: 'niski' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 14. ŚLĄSKIE - Bielsko-Biała
      {
        content: 'Błyskawiczna powódź miejska (flash flood) po przejściu komórki burzowej nad Beskidem Śląskim. Zalane piwnice, garaże podziemne i ulice.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordKrakow.id,
        municipalityId: munis['Bielsko-Biała'].id,
        locationName: 'Bielsko-Biała',
        county: 'Bielsko-Biała',
        voivodeship: 'śląskie',
        lat: 49.8225,
        lng: 19.0444,
        hoursAgo: 7,
        needed: [
          {
            id: 'nr-bb-1',
            resourceType: 'sprzet',
            name: 'Zatapialne pompy elektryczne do wody brudnej',
            quantityNeeded: 25,
            quantityAllocated: 15,
            unit: 'szt.',
            urgency: 'krytyczny' as const,
            allocations: [],
          },
          {
            id: 'nr-bb-2',
            resourceType: 'ludzie',
            name: 'Druhowie OSP do wypompowywania wody z posesji',
            quantityNeeded: 30,
            quantityAllocated: 20,
            unit: 'strażaków',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 15. ŚLĄSKIE - Racibórz
      {
        content: 'Zbiornik Racibórz Dolny przyjął falę wezbraniową z Odry. Monitoring zapory czołowej i budowli upustowej. Pełna gotowość służb technicznych.',
        category: 'Komunikat drogowy',
        isActive: true,
        authorId: koordNysa.id,
        municipalityId: munis['Racibórz'].id,
        locationName: 'Racibórz',
        county: 'powiat raciborski',
        voivodeship: 'śląskie',
        lat: 50.0919,
        lng: 18.2194,
        hoursAgo: 19,
        needed: [
          {
            id: 'nr-rac-1',
            resourceType: 'sprzet',
            name: 'Pojazdy terenowe 4x4 do inspekcji wałów czaszy zbiornika',
            quantityNeeded: 4,
            quantityAllocated: 4,
            unit: 'pojazdów',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 16. OPOLSKIE - Nysa
      {
        content: 'Zwiększony kontrolowany zrzut wody ze Zbiornika Nyskiego do rzeki Nysy Kłodzkiej (do 600 m3/s). Wzmocniona ochrona wałów przy ul. Bema i Tamowej.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: koordNysa.id,
        municipalityId: munis['Nysa'].id,
        locationName: 'Nysa',
        county: 'powiat nyski',
        voivodeship: 'opolskie',
        lat: 50.4738,
        lng: 17.3344,
        hoursAgo: 13,
        needed: [
          {
            id: 'nr-nys-1',
            resourceType: 'sprzet',
            name: 'Pontony z silnikiem ratowniczym i wiosłami',
            quantityNeeded: 6,
            quantityAllocated: 4,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-nys-2',
            resourceType: 'inne',
            name: 'Geowłóknina i folia zbrojona do uszczelniania wałów',
            quantityNeeded: 40,
            quantityAllocated: 20,
            unit: 'rolek (100m)',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 17. OPOLSKIE - Głuchołazy
      {
        content: 'Rzeka Biała Głuchołaska: zerwana kładka piesza, podmyte przyczółki mostu tymczasowego. Działa sztab kryzysowy OSP i wojsk inżynieryjnych.',
        category: 'Komunikat drogowy',
        isActive: true,
        authorId: koordNysa.id,
        municipalityId: munis['Głuchołazy'].id,
        locationName: 'Głuchołazy',
        county: 'powiat nyski',
        voivodeship: 'opolskie',
        lat: 50.3150,
        lng: 17.3828,
        hoursAgo: 17,
        needed: [
          {
            id: 'nr-glu-1',
            resourceType: 'sprzet',
            name: 'Kompaktowe spycharko-ładowarki i minikoparki',
            quantityNeeded: 3,
            quantityAllocated: 1,
            unit: 'maszyn',
            urgency: 'krytyczny' as const,
            allocations: [],
          },
          {
            id: 'nr-glu-2',
            resourceType: 'ludzie',
            name: 'Inżynierowie mostowi i geotechnicy',
            quantityNeeded: 4,
            quantityAllocated: 2,
            unit: 'ekspertów',
            urgency: 'wysoki' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 18. LUBELSKIE - Lublin
      {
        content: 'Wezbranie rzeki Bystrzycy w Lublinie po ulewnych opadach. Zabezpieczanie mostu na al. Unii Lubelskiej oraz zalewu Zemborzyckiego.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Lublin'].id,
        locationName: 'Lublin',
        county: 'Lublin',
        voivodeship: 'lubelskie',
        lat: 51.2465,
        lng: 22.5684,
        hoursAgo: 21,
        needed: [
          {
            id: 'nr-lub-1',
            resourceType: 'sprzet',
            name: 'Pływające pompy wysokiej wydajności',
            quantityNeeded: 6,
            quantityAllocated: 3,
            unit: 'szt.',
            urgency: 'średni' as const,
            allocations: [],
          },
          {
            id: 'nr-lub-2',
            resourceType: 'woda',
            name: 'Woda butelkowana 1.5L dla punktów socjalnych',
            quantityNeeded: 800,
            quantityAllocated: 400,
            unit: 'zgrzewek',
            urgency: 'niski' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 19. KUJAWSKO-POMORSKIE - Toruń
      {
        content: 'Wisła w Toruniu osiągnęła stan ostrzegawczy. Zabezpieczono Bulwar Filadelfijski oraz wrota przeciwpowodziowe Bramy Mostowej.',
        category: 'Ostrzeżenie hydrologiczne',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Toruń'].id,
        locationName: 'Toruń',
        county: 'Toruń',
        voivodeship: 'kujawsko-pomorskie',
        lat: 53.0138,
        lng: 18.5984,
        hoursAgo: 25,
        needed: [
          {
            id: 'nr-tor-1',
            resourceType: 'sprzet',
            name: 'Zestawy zapór przeciwpowodziowych aluminiowych',
            quantityNeeded: 12,
            quantityAllocated: 8,
            unit: 'kpl.',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [],
      },

      // 20. WARMIŃSKO-MAZURSKIE - Olsztyn
      {
        content: 'Szkwały i nawałnice nad Pojezierzem Olsztyńskim. Powalone drzewa na trasie DK16 oraz w rejonie jeziora Ukiel. Trwa usuwanie zagrożeń.',
        category: 'Zagrożenie pożarowe',
        isActive: true,
        authorId: admin.id,
        municipalityId: munis['Olsztyn'].id,
        locationName: 'Olsztyn',
        county: 'Olsztyn',
        voivodeship: 'warmińsko-mazurskie',
        lat: 53.7784,
        lng: 20.4801,
        hoursAgo: 16,
        needed: [
          {
            id: 'nr-ols-1',
            resourceType: 'sprzet',
            name: 'Ciężkie rębaki do gałęzi i konarów',
            quantityNeeded: 4,
            quantityAllocated: 2,
            unit: 'szt.',
            urgency: 'wysoki' as const,
            allocations: [],
          },
          {
            id: 'nr-ols-2',
            resourceType: 'ludzie',
            name: 'Operatorzy ciężkiego sprzętu leśnego',
            quantityNeeded: 8,
            quantityAllocated: 4,
            unit: 'osób',
            urgency: 'średni' as const,
            allocations: [],
          },
        ],
        posts: [],
      },
    ];

    for (const a of alertsData) {
      const createdAlert = await Alert.create({
        title: (a as any).title || a.content.split('.')[0],
        content: a.content,
        category: a.category,
        severity: (a as any).severity || 'wysoki',
        isActive: a.isActive,
        authorId: a.authorId,
        municipalityId: a.municipalityId,
        locationName: a.locationName,
        county: a.county,
        voivodeship: a.voivodeship,
        lat: a.lat,
        lng: a.lng,
        history: [
          {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            action: 'created',
            timestamp: new Date(now - a.hoursAgo * oneHour).toISOString(),
            userName: 'Centrum Koordynacji Ratownictwa',
            organizationName: 'Służby Ratunkowe RP',
            details: 'Wprowadzenie alertu do systemu krajowego',
          },
        ],
        neededResources: a.needed,
        posts: a.posts,
      });

      // Audit log utworzenia alertu
      await AuditLog.create({
        action: 'alert_created',
        entityType: 'alert',
        entityId: createdAlert.id,
        userId: a.authorId,
        userName: 'Dyspozytor Wojewódzki',
        userEmail: 'koordynator.klodzko@samorzad.pl',
        alertId: createdAlert.id,
        alertTitle: createdAlert.title,
        details: `Utworzenie i publikacja komunikatu: "${createdAlert.title}" w miejscowości ${createdAlert.locationName || 'Polska'}`,
        newState: {
          title: createdAlert.title,
          content: createdAlert.content,
          category: createdAlert.category,
          severity: createdAlert.severity,
          locationName: createdAlert.locationName,
        },
        createdAt: new Date(now - a.hoursAgo * oneHour),
      });

      // Audit log dla przydziałów zasobów (jeśli alert posiada zadeklarowane allocations)
      if (Array.isArray(a.needed)) {
        for (const nr of a.needed) {
          if (nr.quantityAllocated && nr.quantityAllocated > 0) {
            await AuditLog.create({
              action: 'resource_allocated',
              entityType: 'resource',
              entityId: nr.id,
              userId: a.authorId,
              userName: 'Centrum Operacyjne Ratownictwa',
              userEmail: 'admin@fundacjaq.pl',
              alertId: createdAlert.id,
              alertTitle: createdAlert.title,
              details: `Dyspozycja zasobów: przekazano ${nr.quantityAllocated} ${nr.unit} na zapotrzebowanie "${nr.name}"`,
              previousState: { neededResourceId: nr.id, quantityAllocatedBefore: 0 },
              newState: { neededResourceId: nr.id, allocatedAmount: nr.quantityAllocated },
              createdAt: new Date(now - (a.hoursAgo - 1) * oneHour),
            });
          }
        }
      }
    }

    // Dodatkowe audit logi dla weryfikacji użytkowników
    await AuditLog.create({
      action: 'user_verified',
      entityType: 'user',
      entityId: strazakKlodzko.id,
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userEmail: admin.email,
      details: `Weryfikacja i aktywacja konta strażaka: ${strazakKlodzko.firstName} ${strazakKlodzko.lastName} (OSP Kłodzko)`,
      previousState: { isVerified: false },
      newState: { isVerified: true },
      createdAt: new Date(now - 12 * oneHour),
    });

    console.log(`✅ Utworzono ${alertsData.length} rozbudowanych alertów i zainicjalizowano Dziennik Audytowy (Audit Logs).`);

    // 6. Zasoby magazynowe dla jednostek
    const resourcesData = [
      { org: 'Ochotnicza Straż Pożarna Kłodzko', type: 'sprzet', sub: 'Motopompy szlamowe wysokowydajne', qty: 8, tf: '24h' },
      { org: 'Ochotnicza Straż Pożarna Kłodzko', type: 'inne', sub: 'Worki z piaskiem wzmacniane', qty: 2500, tf: '24h' },
      { org: 'Ochotnicza Straż Pożarna Kłodzko', type: 'ludzie', sub: 'Ratownicy KSRG z uprawnieniami wodnymi', qty: 20, tf: '24h' },
      { org: 'Fundacja Ratownictwa i Pomocy Q', type: 'woda', sub: 'Woda butelkowana 1.5L i 5L na paletach', qty: 8000, tf: '24h' },
      { org: 'Fundacja Ratownictwa i Pomocy Q', type: 'ludzie', sub: 'Przeszkoleni wolontariusze pomocy humanitarnej', qty: 50, tf: '48h' },
      { org: 'Fundacja Ratownictwa i Pomocy Q', type: 'inne', sub: 'Koce termiczne, łóżka polowe, śpiwory', qty: 600, tf: '24h' },
      { org: 'Dolnośląskie WOPR Wrocław', type: 'sprzet', sub: 'Łodzie płaskodenne i motorówki ratownicze', qty: 10, tf: '24h' },
      { org: 'Dolnośląskie WOPR Wrocław', type: 'ludzie', sub: 'Ratownicy wodni i płetwonurkowie WOPR', qty: 25, tf: '24h' },
      { org: 'Komenda Wojewódzka PSP w Warszawie', type: 'sprzet', sub: 'Agregaty prądotwórcze dużej mocy (>50 kVA)', qty: 12, tf: '24h' },
      { org: 'Komenda Wojewódzka PSP w Warszawie', type: 'sprzet', sub: 'Maszty oświetleniowe LED ze stacją zasilania', qty: 20, tf: '24h' },
      { org: 'Polski Czerwony Krzyż - Zarząd Główny', type: 'woda', sub: 'Pakiety wody pitnej i stacja uzdatniania', qty: 15000, tf: '48h' },
      { org: 'Polski Czerwony Krzyż - Zarząd Główny', type: 'inne', sub: 'Pakiety żywnościowe MRE długoterminowe', qty: 3000, tf: '24h' },
      { org: 'Morski Oddział Ratownictwa Wodnego Gdańsk', type: 'sprzet', sub: 'Wysokociśnieniowe pompy odwadniające', qty: 14, tf: '24h' },
      { org: 'Komenda Powiatowa PSP w Nysie', type: 'sprzet', sub: 'Pontony ratownicze z silnikiem Yamaha', qty: 8, tf: '24h' },
    ];

    for (const r of resourcesData) {
      if (orgs[r.org]) {
        await Resource.create({
          organizationId: orgs[r.org].id,
          type: r.type as any,
          subcategory: r.sub,
          quantity: r.qty,
          timeframe: r.tf as any,
          isActive: true,
        });
      }
    }

    console.log(`✅ Utworzono ${resourcesData.length} pozycji magazynowych dla organizacji.`);

    console.log('\n======================================================');
    console.log('🎉 Baza danych SQLite została pomyślnie zasilona danymi z całej Polski!');
    console.log('======================================================');
    console.log('\n👤 Dane kont do logowania:');
    console.log('  1. Administrator:');
    console.log('     Email: admin@fundacjaq.pl');
    console.log('     Hasło: admin123 (rola: admin)');
    console.log('  2. Koordynator (Kłodzko):');
    console.log('     Email: koordynator.klodzko@samorzad.pl');
    console.log('     Hasło: koord123 (rola: koordynator)');
    console.log('  3. Koordynator (Kraków):');
    console.log('     Email: koordynator.krakow@umk.pl');
    console.log('     Hasło: koord123 (rola: koordynator)');
    console.log('  4. Koordynator (Warszawa):');
    console.log('     Email: koordynator.warszawa@stolica.pl');
    console.log('     Hasło: koord123 (rola: koordynator)');
    console.log('  5. Członek (OSP):');
    console.log('     Email: jan.strazak@osp.pl');
    console.log('     Hasło: haslo123 (rola: czlonek)');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Błąd podczas zasilania bazy danych:', error);
    process.exit(1);
  }
};

// Uruchomienie skryptu jeśli wywołany bezpośrednio
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}
