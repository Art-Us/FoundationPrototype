import bcrypt from 'bcrypt';
import { sequelize, Municipality, Organization, User, Alert, Resource } from '../models';

export const seedDatabase = async () => {
  try {
    console.log('🔄 Rozpoczynanie wypełniania bazy danych przykładowymi danymi...');

    // 1. Reset i synchronizacja bazy danych SQLite
    await sequelize.sync({ force: true });
    console.log('✅ Tabele bazy danych zostały wyczyszczone i zsynchronizowane.');

    // 2. Tworzenie Gmin (Municipalities)
    const klodzko = await Municipality.create({ name: 'Gmina Kłodzko' });
    const nysa = await Municipality.create({ name: 'Gmina Nysa' });
    const ladek = await Municipality.create({ name: 'Gmina Lądek-Zdrój' });
    const glucholazy = await Municipality.create({ name: 'Gmina Głuchołazy' });
    console.log('✅ Utworzono gminy: Kłodzko, Nysa, Lądek-Zdrój, Głuchołazy.');

    // 3. Tworzenie Organizacji (Organizations)
    const umKlodzko = await Organization.create({
      name: 'Urząd Miasta i Gminy Kłodzko',
      type: 'samorzad',
      municipalityId: klodzko.id,
    });

    const ospKlodzko = await Organization.create({
      name: 'Ochotnicza Straż Pożarna Kłodzko',
      type: 'sluzby',
      municipalityId: klodzko.id,
    });

    const fundacjaQ = await Organization.create({
      name: 'Fundacja Ratownictwa i Pomocy Q',
      type: 'ngo',
      municipalityId: klodzko.id,
    });

    const pspNysa = await Organization.create({
      name: 'Komenda Powiatowa PSP w Nysie',
      type: 'sluzby',
      municipalityId: nysa.id,
    });

    const umNysa = await Organization.create({
      name: 'Urząd Miejski w Nysie',
      type: 'samorzad',
      municipalityId: nysa.id,
    });

    const pckNysa = await Organization.create({
      name: 'Polski Czerwony Krzyż - Oddział Nysa',
      type: 'ngo',
      municipalityId: nysa.id,
    });

    const ospLadek = await Organization.create({
      name: 'OSP Lądek-Zdrój',
      type: 'sluzby',
      municipalityId: ladek.id,
    });

    console.log('✅ Utworzono organizacje (samorządy, służby ratunkowe, NGO).');

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
      phone: '+48500100100',
      role: 'admin',
      organizationId: fundacjaQ.id,
      isVerified: true,
    });

    const koordKlodzko = await User.create({
      firstName: 'Marek',
      lastName: 'Koordynator-Kłodzko',
      email: 'koordynator.klodzko@samorzad.pl',
      password: koordPassword,
      phone: '+48500200200',
      role: 'koordynator',
      organizationId: umKlodzko.id,
      isVerified: true,
    });

    const koordNysa = await User.create({
      firstName: 'Tomasz',
      lastName: 'Koordynator-Nysa',
      email: 'koordynator.nysa@psp.pl',
      password: koordPassword,
      phone: '+48500300300',
      role: 'koordynator',
      organizationId: pspNysa.id,
      isVerified: true,
    });

    const strazakKlodzko = await User.create({
      firstName: 'Jan',
      lastName: 'Strażak',
      email: 'jan.strazak@osp.pl',
      password: userPassword,
      phone: '+48500400400',
      role: 'czlonek',
      organizationId: ospKlodzko.id,
      isVerified: true,
    });

    // Użytkownicy oczekujący na weryfikację przez administratora
    const pendingUser1 = await User.create({
      firstName: 'Anna',
      lastName: 'Nowak',
      email: 'anna.nowak@ngo.pl',
      password: userPassword,
      phone: '+48500500500',
      role: 'czlonek',
      organizationId: fundacjaQ.id,
      isVerified: false,
    });

    const pendingUser2 = await User.create({
      firstName: 'Michał',
      lastName: 'Kowalski',
      email: 'michal.kowalski@samorzad.pl',
      password: userPassword,
      phone: '+48500600600',
      role: 'czlonek',
      organizationId: umNysa.id,
      isVerified: false,
    });

    console.log('✅ Utworzono użytkowników (admin, koordynatorzy, członkowie, niezweryfikowani).');

    // 5. Tworzenie Alertów (Alerts)
    await Alert.create({
      content: 'Gwałtowny przybór wody na rzece Nysa Kłodzka. Wprowadzono stan pogotowia przeciwpowodziowego dla Gminy Kłodzko.',
      category: 'Ostrzeżenie hydrologiczne',
      isActive: true,
      authorId: koordKlodzko.id,
      municipalityId: klodzko.id,
      lat: 50.4380,
      lng: 16.6548,
    });

    await Alert.create({
      content: 'Punkt wydawania wody pitnej, żywności oraz agregatów prądotwórczych uruchomiony w remizie OSP Kłodzko.',
      category: 'Pomoc humanitarna',
      isActive: true,
      authorId: admin.id,
      municipalityId: klodzko.id,
      lat: 50.4420,
      lng: 16.6620,
    });

    await Alert.create({
      content: 'Zamknięcie mostu na trasie do Lądka-Zdroju z powodu podmycia podpory. Wyznaczono objazd przez DW392.',
      category: 'Komunikat drogowy',
      isActive: true,
      authorId: koordKlodzko.id,
      municipalityId: ladek.id,
      lat: 50.3478,
      lng: 16.8778,
    });

    await Alert.create({
      content: 'Zakończono umacnianie wałów w rejonie ul. Wiejskiej w Nysie. Zagrożenie zażegnane.',
      category: 'Informacja ogólna',
      isActive: false, // nieaktywny
      authorId: koordNysa.id,
      municipalityId: nysa.id,
      lat: 50.4738,
      lng: 17.3344,
    });

    console.log('✅ Utworzono przykładowe komunikaty i alerty.');

    // 6. Tworzenie Zasobów do matrycy (Resources)
    // Gmina Kłodzko
    await Resource.create({
      organizationId: umKlodzko.id,
      type: 'woda',
      subcategory: 'Woda butelkowana (zgrzewki 5L)',
      quantity: 5000,
      timeframe: '24h',
      isActive: true,
    });

    await Resource.create({
      organizationId: umKlodzko.id,
      type: 'ludzie',
      subcategory: 'Psycholodzy i wsparcie kryzysowe',
      quantity: 8,
      timeframe: '24h',
      isActive: true,
    });

    await Resource.create({
      organizationId: umKlodzko.id,
      type: 'ludzie',
      subcategory: 'Pracownicy administracyjno-terenowi',
      quantity: 12,
      timeframe: '48h',
      isActive: true,
    });

    await Resource.create({
      organizationId: ospKlodzko.id,
      type: 'sprzet',
      subcategory: 'Motopompy szlamowe wysokowydajne',
      quantity: 6,
      timeframe: '24h',
      isActive: true,
    });

    await Resource.create({
      organizationId: ospKlodzko.id,
      type: 'sprzet',
      subcategory: 'Agregaty prądotwórcze dużej mocy',
      quantity: 4,
      timeframe: '48h',
      isActive: true,
    });

    await Resource.create({
      organizationId: ospKlodzko.id,
      type: 'ludzie',
      subcategory: 'Strażacy OSP / Ratownicy techniczni',
      quantity: 16,
      timeframe: '24h',
      isActive: true,
    });

    await Resource.create({
      organizationId: ospKlodzko.id,
      type: 'inne',
      subcategory: 'Worki z piaskiem i rękawy przeciwpowodziowe',
      quantity: 1200,
      timeframe: '72h',
      isActive: true,
    });

    await Resource.create({
      organizationId: fundacjaQ.id,
      type: 'ludzie',
      subcategory: 'Wolontariusze do segregacji i dystrybucji',
      quantity: 35,
      timeframe: '48h',
      isActive: true,
    });

    await Resource.create({
      organizationId: fundacjaQ.id,
      type: 'ludzie',
      subcategory: 'Psycholodzy dziecięcy i terapeuci traumy',
      quantity: 5,
      timeframe: '72h',
      isActive: true,
    });

    await Resource.create({
      organizationId: fundacjaQ.id,
      type: 'woda',
      subcategory: 'Cysterny mobilne i zbiorniki DPX',
      quantity: 3000,
      timeframe: '72h',
      isActive: true,
    });

    // Gmina Nysa
    await Resource.create({
      organizationId: pspNysa.id,
      type: 'sprzet',
      subcategory: 'Łodzie płaskodenne i pontony ratownicze',
      quantity: 8,
      timeframe: '24h',
      isActive: true,
    });

    await Resource.create({
      organizationId: pspNysa.id,
      type: 'ludzie',
      subcategory: 'Ratownicy medyczni i płetwonurkowie PSP',
      quantity: 30,
      timeframe: '24h',
      isActive: true,
    });

    await Resource.create({
      organizationId: pckNysa.id,
      type: 'woda',
      subcategory: 'Woda butelkowana i stacja uzdatniania',
      quantity: 10000,
      timeframe: '48h',
      isActive: true,
    });

    await Resource.create({
      organizationId: pckNysa.id,
      type: 'inne',
      subcategory: 'Łóżka polowe, koce termiczne i śpiwory',
      quantity: 250,
      timeframe: '24h',
      isActive: true,
    });

    console.log('✅ Utworzono przykładowe zasoby dla matrycy koordynacji.');

    console.log('\n======================================================');
    console.log('🎉 Baza danych SQLite została pomyślnie zasilona danymi!');
    console.log('======================================================');
    console.log('\n👤 Dane kont do testowania:');
    console.log('  1. Administrator:');
    console.log('     Email: admin@fundacjaq.pl');
    console.log('     Hasło: admin123 (rola: admin, zweryfikowany)');
    console.log('  2. Koordynator (Kłodzko):');
    console.log('     Email: koordynator.klodzko@samorzad.pl');
    console.log('     Hasło: koord123 (rola: koordynator, zweryfikowany)');
    console.log('  3. Członek (OSP):');
    console.log('     Email: jan.strazak@osp.pl');
    console.log('     Hasło: haslo123 (rola: czlonek, zweryfikowany)');
    console.log('  4. Użytkownik oczekujący na weryfikację:');
    console.log('     Email: anna.nowak@ngo.pl');
    console.log('     Hasło: haslo123 (rola: czlonek, isVerified: false)');
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
