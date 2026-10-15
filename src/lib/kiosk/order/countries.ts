// 나라 고르기 목록 — UN 회원·옵서버국(북한 제외)과 자주 찾는 지역 208곳. 국기는 public/assets/kiosk-order/flags/<code>.svg(flag-icons 1x1, MIT).
// 화면 언어는 ko/en/ja/fr 넷뿐이라 나라마다 ui 로 하나에 잇는다(프랑스어권 → fr, 나머지 → en). 환율은 2026년 참고값.
// 검색은 대소문자·악센트 무시, '정확히 일치 > 이름 시작 > 낱말 시작 > 별칭 > 현지 이름 > 이름 속 포함' 순.

import type { Country } from './types'

const cur = (code: string, symbol: string, krw: number, decimals = 2): Country['currency'] => ({ code, symbol, krw, decimals })

// 여러 나라가 함께 쓰는 통화
const EUR = cur('EUR', '€', 1620)
const USD = cur('USD', '$', 1400)
const AUD = cur('AUD', 'A$', 920)
const CHF = cur('CHF', 'CHF', 1750)
const DKK = cur('DKK', 'kr', 217)
const ILS = cur('ILS', '₪', 400)
const XCD = cur('XCD', 'EC$', 518)
const XOF = cur('XOF', 'CFA', 2.47, 0)
const XAF = cur('XAF', 'FCFA', 2.47, 0)
const XPF = cur('XPF', '₣', 13.6, 0)

const RAW: Country[] = [
  { code: 'af', name: 'Afghanistan', native: 'افغانستان', language: 'دری', greeting: 'سلام', ui: 'en', currency: cur('AFN', 'Af', 20), region: 'asia' },
  { code: 'al', name: 'Albania', native: 'Shqipëria', language: 'Shqip', greeting: 'Përshëndetje', ui: 'en', currency: cur('ALL', 'L', 16.5), region: 'europe' },
  { code: 'dz', name: 'Algeria', native: 'الجزائر', aliases: ['algerie'], language: 'العربية', greeting: 'مرحبا', ui: 'fr', currency: cur('DZD', 'DA', 10.7), region: 'africa' },
  { code: 'ad', name: 'Andorra', native: 'Andorra', language: 'Català', greeting: 'Hola', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'ao', name: 'Angola', native: 'Angola', language: 'Português', greeting: 'Olá', ui: 'en', currency: cur('AOA', 'Kz', 1.53), region: 'africa' },
  { code: 'ag', name: 'Antigua and Barbuda', native: 'Antigua and Barbuda', aliases: ['antigua', 'barbuda'], language: 'English', greeting: 'Hello', ui: 'en', currency: XCD, region: 'americas' },
  { code: 'ar', name: 'Argentina', native: 'Argentina', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('ARS', '$', 0.97), region: 'americas' },
  { code: 'am', name: 'Armenia', native: 'Հայաստան', aliases: ['hayastan'], language: 'Հայերեն', greeting: 'Բարև', ui: 'en', currency: cur('AMD', '֏', 3.6), region: 'europe' },
  { code: 'aw', name: 'Aruba', native: 'Aruba', language: 'Papiamento', greeting: 'Bon dia', ui: 'en', currency: cur('AWG', 'Afl.', 782), region: 'americas' },
  { code: 'au', name: 'Australia', native: 'Australia', aliases: ['aussie', 'oz'], language: 'English', greeting: "G'day", ui: 'en', currency: AUD, region: 'oceania' },
  { code: 'at', name: 'Austria', native: 'Österreich', aliases: ['autriche'], language: 'Deutsch', greeting: 'Grüß Gott', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'az', name: 'Azerbaijan', native: 'Azərbaycan', language: 'Azərbaycan dili', greeting: 'Salam', ui: 'en', currency: cur('AZN', '₼', 824), region: 'europe' },
  { code: 'bs', name: 'Bahamas', native: 'The Bahamas', aliases: ['the bahamas'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('BSD', 'B$', 1400), region: 'americas' },
  { code: 'bh', name: 'Bahrain', native: 'البحرين', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('BHD', 'BD', 3720, 3), region: 'middle-east' },
  { code: 'bd', name: 'Bangladesh', native: 'বাংলাদেশ', language: 'বাংলা', greeting: 'আসসালামু আলাইকুম', ui: 'en', currency: cur('BDT', '৳', 11.5), region: 'asia' },
  { code: 'bb', name: 'Barbados', native: 'Barbados', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('BBD', 'Bds$', 700), region: 'americas' },
  { code: 'by', name: 'Belarus', native: 'Беларусь', aliases: ['byelorussia'], language: 'Беларуская', greeting: 'Прывітанне', ui: 'en', currency: cur('BYN', 'Br', 430), region: 'europe' },
  { code: 'be', name: 'Belgium', native: 'België', aliases: ['belgique', 'belgien'], language: 'Nederlands', greeting: 'Hallo', ui: 'fr', currency: EUR, region: 'europe' },
  { code: 'bz', name: 'Belize', native: 'Belize', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('BZD', 'BZ$', 700), region: 'americas' },
  { code: 'bj', name: 'Benin', native: 'Bénin', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XOF, region: 'africa' },
  { code: 'bm', name: 'Bermuda', native: 'Bermuda', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('BMD', '$', 1400), region: 'americas' },
  { code: 'bt', name: 'Bhutan', native: 'འབྲུག་ཡུལ', aliases: ['druk yul'], language: 'རྫོང་ཁ', greeting: 'ཀུ་ཟུ་ཟང་པོ་ལགས', ui: 'en', currency: cur('BTN', 'Nu.', 16), region: 'asia' },
  { code: 'bo', name: 'Bolivia', native: 'Bolivia', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('BOB', 'Bs', 203), region: 'americas' },
  { code: 'ba', name: 'Bosnia and Herzegovina', native: 'Bosna i Hercegovina', aliases: ['bosnia', 'herzegovina', 'bih'], language: 'Bosanski', greeting: 'Zdravo', ui: 'en', currency: cur('BAM', 'KM', 828), region: 'europe' },
  { code: 'bw', name: 'Botswana', native: 'Botswana', language: 'Setswana', greeting: 'Dumela', ui: 'en', currency: cur('BWP', 'P', 103), region: 'africa' },
  { code: 'br', name: 'Brazil', native: 'Brasil', language: 'Português', greeting: 'Olá', ui: 'en', currency: cur('BRL', 'R$', 255), region: 'americas' },
  { code: 'bn', name: 'Brunei', native: 'Brunei', aliases: ['brunei darussalam'], language: 'Bahasa Melayu', greeting: 'Apa khabar', ui: 'en', currency: cur('BND', 'B$', 1080), region: 'asia' },
  { code: 'bg', name: 'Bulgaria', native: 'България', language: 'Български', greeting: 'Здравейте', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'bf', name: 'Burkina Faso', native: 'Burkina Faso', aliases: ['burkina'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XOF, region: 'africa' },
  { code: 'bi', name: 'Burundi', native: 'Burundi', language: 'Ikirundi', greeting: 'Amahoro', ui: 'fr', currency: cur('BIF', 'FBu', 0.47, 0), region: 'africa' },
  { code: 'cv', name: 'Cabo Verde', native: 'Cabo Verde', aliases: ['cape verde'], language: 'Português', greeting: 'Olá', ui: 'en', currency: cur('CVE', 'Esc', 14.7), region: 'africa' },
  { code: 'kh', name: 'Cambodia', native: 'កម្ពុជា', aliases: ['kampuchea'], language: 'ភាសាខ្មែរ', greeting: 'សួស្តី', ui: 'en', currency: cur('KHR', '៛', 0.35, 0), region: 'asia' },
  { code: 'cm', name: 'Cameroon', native: 'Cameroun', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XAF, region: 'africa' },
  { code: 'ca', name: 'Canada', native: 'Canada', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('CAD', 'C$', 1010), region: 'americas' },
  { code: 'ky', name: 'Cayman Islands', native: 'Cayman Islands', aliases: ['cayman'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('KYD', 'CI$', 1680), region: 'americas' },
  { code: 'cf', name: 'Central African Republic', native: 'Centrafrique', aliases: ['car', 'centrafrique'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XAF, region: 'africa' },
  { code: 'td', name: 'Chad', native: 'Tchad', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XAF, region: 'africa' },
  { code: 'cl', name: 'Chile', native: 'Chile', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('CLP', '$', 1.47, 0), region: 'americas' },
  { code: 'cn', name: 'China', native: '中国', aliases: ['prc', 'mainland china', "people's republic of china", 'zhongguo'], language: '中文', greeting: '你好', ui: 'en', currency: cur('CNY', '¥', 195), region: 'asia', featured: 3 },
  { code: 'co', name: 'Colombia', native: 'Colombia', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('COP', '$', 0.35, 0), region: 'americas' },
  { code: 'km', name: 'Comoros', native: 'Comores', aliases: ['comores'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: cur('KMF', 'CF', 3.29, 0), region: 'africa' },
  { code: 'cg', name: 'Congo', native: 'Congo', aliases: ['republic of the congo', 'congo-brazzaville', 'brazzaville'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XAF, region: 'africa' },
  { code: 'cr', name: 'Costa Rica', native: 'Costa Rica', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('CRC', '₡', 2.8, 0), region: 'americas' },
  { code: 'ci', name: "Côte d'Ivoire", native: "Côte d'Ivoire", aliases: ['ivory coast'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XOF, region: 'africa' },
  { code: 'hr', name: 'Croatia', native: 'Hrvatska', language: 'Hrvatski', greeting: 'Bok', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'cu', name: 'Cuba', native: 'Cuba', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('CUP', '$', 11.7), region: 'americas' },
  { code: 'cw', name: 'Curaçao', native: 'Kòrsou', language: 'Papiamentu', greeting: 'Bon dia', ui: 'en', currency: cur('XCG', 'Cg', 782), region: 'americas' },
  { code: 'cy', name: 'Cyprus', native: 'Κύπρος', aliases: ['kibris'], language: 'Ελληνικά', greeting: 'Γεια σας', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'cz', name: 'Czechia', native: 'Česko', aliases: ['czech republic', 'czech'], language: 'Čeština', greeting: 'Dobrý den', ui: 'en', currency: cur('CZK', 'Kč', 66), region: 'europe' },
  { code: 'cd', name: 'DR Congo', native: 'RD Congo', aliases: ['democratic republic of the congo', 'drc', 'congo-kinshasa', 'kinshasa', 'zaire'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: cur('CDF', 'FC', 0.49), region: 'africa' },
  { code: 'dk', name: 'Denmark', native: 'Danmark', language: 'Dansk', greeting: 'Hej', ui: 'en', currency: DKK, region: 'europe' },
  { code: 'dj', name: 'Djibouti', native: 'Djibouti', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: cur('DJF', 'Fdj', 7.9, 0), region: 'africa' },
  { code: 'dm', name: 'Dominica', native: 'Dominica', language: 'English', greeting: 'Hello', ui: 'en', currency: XCD, region: 'americas' },
  { code: 'do', name: 'Dominican Republic', native: 'República Dominicana', aliases: ['republica dominicana'], language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('DOP', 'RD$', 22), region: 'americas' },
  { code: 'ec', name: 'Ecuador', native: 'Ecuador', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: USD, region: 'americas' },
  { code: 'eg', name: 'Egypt', native: 'مصر', aliases: ['misr'], language: 'العربية', greeting: 'أهلاً', ui: 'en', currency: cur('EGP', 'E£', 28.5), region: 'africa' },
  { code: 'sv', name: 'El Salvador', native: 'El Salvador', aliases: ['salvador'], language: 'Español', greeting: '¡Hola!', ui: 'en', currency: USD, region: 'americas' },
  { code: 'gq', name: 'Equatorial Guinea', native: 'Guinea Ecuatorial', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: XAF, region: 'africa' },
  { code: 'er', name: 'Eritrea', native: 'ኤርትራ', language: 'ትግርኛ', greeting: 'ሰላም', ui: 'en', currency: cur('ERN', 'Nfk', 93), region: 'africa' },
  { code: 'ee', name: 'Estonia', native: 'Eesti', language: 'Eesti keel', greeting: 'Tere', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'sz', name: 'Eswatini', native: 'eSwatini', aliases: ['swaziland'], language: 'siSwati', greeting: 'Sawubona', ui: 'en', currency: cur('SZL', 'E', 78), region: 'africa' },
  { code: 'et', name: 'Ethiopia', native: 'ኢትዮጵያ', language: 'አማርኛ', greeting: 'ሰላም', ui: 'en', currency: cur('ETB', 'Br', 10), region: 'africa' },
  { code: 'fj', name: 'Fiji', native: 'Viti', language: 'Vosa Vakaviti', greeting: 'Bula', ui: 'en', currency: cur('FJD', 'FJ$', 620), region: 'oceania' },
  { code: 'fi', name: 'Finland', native: 'Suomi', language: 'Suomi', greeting: 'Hei', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'fr', name: 'France', native: 'France', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: EUR, region: 'europe', featured: 5 },
  { code: 'pf', name: 'French Polynesia', native: 'Polynésie française', aliases: ['tahiti', 'polynesie'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XPF, region: 'oceania' },
  { code: 'ga', name: 'Gabon', native: 'Gabon', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XAF, region: 'africa' },
  { code: 'gm', name: 'Gambia', native: 'The Gambia', aliases: ['the gambia'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('GMD', 'D', 19.5), region: 'africa' },
  { code: 'ge', name: 'Georgia', native: 'საქართველო', aliases: ['sakartvelo'], language: 'ქართული', greeting: 'გამარჯობა', ui: 'en', currency: cur('GEL', '₾', 515), region: 'europe' },
  { code: 'de', name: 'Germany', native: 'Deutschland', aliases: ['allemagne'], language: 'Deutsch', greeting: 'Hallo', ui: 'en', currency: EUR, region: 'europe', featured: 12 },
  { code: 'gh', name: 'Ghana', native: 'Ghana', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('GHS', 'GH₵', 125), region: 'africa' },
  { code: 'gr', name: 'Greece', native: 'Ελλάδα', aliases: ['hellas', 'ellada'], language: 'Ελληνικά', greeting: 'Γεια σας', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'gl', name: 'Greenland', native: 'Kalaallit Nunaat', language: 'Kalaallisut', greeting: 'Aluu', ui: 'en', currency: DKK, region: 'americas' },
  { code: 'gd', name: 'Grenada', native: 'Grenada', language: 'English', greeting: 'Hello', ui: 'en', currency: XCD, region: 'americas' },
  { code: 'gu', name: 'Guam', native: 'Guåhan', language: 'English', greeting: 'Hello', ui: 'en', currency: USD, region: 'oceania' },
  { code: 'gt', name: 'Guatemala', native: 'Guatemala', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('GTQ', 'Q', 182), region: 'americas' },
  { code: 'gn', name: 'Guinea', native: 'Guinée', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: cur('GNF', 'FG', 0.16, 0), region: 'africa' },
  { code: 'gw', name: 'Guinea-Bissau', native: 'Guiné-Bissau', language: 'Português', greeting: 'Olá', ui: 'en', currency: XOF, region: 'africa' },
  { code: 'gy', name: 'Guyana', native: 'Guyana', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('GYD', 'G$', 6.7), region: 'americas' },
  { code: 'ht', name: 'Haiti', native: 'Haïti', aliases: ['ayiti'], language: 'Kreyòl ayisyen', greeting: 'Bonjou', ui: 'fr', currency: cur('HTG', 'G', 10.7), region: 'americas' },
  { code: 'hn', name: 'Honduras', native: 'Honduras', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('HNL', 'L', 53.5), region: 'americas' },
  { code: 'hk', name: 'Hong Kong', native: '香港', aliases: ['hongkong', 'hk'], language: '廣東話', greeting: '你好', ui: 'en', currency: cur('HKD', 'HK$', 180), region: 'asia', featured: 8 },
  { code: 'hu', name: 'Hungary', native: 'Magyarország', aliases: ['magyar'], language: 'Magyar', greeting: 'Szia', ui: 'en', currency: cur('HUF', 'Ft', 4.2, 0), region: 'europe' },
  { code: 'is', name: 'Iceland', native: 'Ísland', language: 'Íslenska', greeting: 'Halló', ui: 'en', currency: cur('ISK', 'kr', 11.3, 0), region: 'europe' },
  { code: 'in', name: 'India', native: 'भारत', aliases: ['bharat', 'hindustan'], language: 'हिन्दी', greeting: 'नमस्ते', ui: 'en', currency: cur('INR', '₹', 16), region: 'asia' },
  { code: 'id', name: 'Indonesia', native: 'Indonesia', language: 'Bahasa Indonesia', greeting: 'Halo', ui: 'en', currency: cur('IDR', 'Rp', 0.085, 0), region: 'asia' },
  { code: 'ir', name: 'Iran', native: 'ایران', aliases: ['persia'], language: 'فارسی', greeting: 'سلام', ui: 'en', currency: cur('IRR', 'IRR', 0.0013, 0), region: 'middle-east' },
  { code: 'iq', name: 'Iraq', native: 'العراق', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('IQD', 'IQD', 1.07, 0), region: 'middle-east' },
  { code: 'ie', name: 'Ireland', native: 'Éire', aliases: ['eire', 'republic of ireland'], language: 'English', greeting: 'Hello', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'il', name: 'Israel', native: 'ישראל', language: 'עברית', greeting: 'שלום', ui: 'en', currency: ILS, region: 'middle-east' },
  { code: 'it', name: 'Italy', native: 'Italia', language: 'Italiano', greeting: 'Ciao', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'jm', name: 'Jamaica', native: 'Jamaica', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('JMD', 'J$', 8.8), region: 'americas' },
  { code: 'jp', name: 'Japan', native: '日本', aliases: ['nippon', 'nihon'], language: '日本語', greeting: 'こんにちは', ui: 'ja', currency: cur('JPY', '¥', 9.4, 0), region: 'asia', featured: 1 },
  { code: 'jo', name: 'Jordan', native: 'الأردن', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('JOD', 'JD', 1975, 3), region: 'middle-east' },
  { code: 'kz', name: 'Kazakhstan', native: 'Қазақстан', aliases: ['qazaqstan'], language: 'Қазақ тілі', greeting: 'Сәлеметсіз бе', ui: 'en', currency: cur('KZT', '₸', 2.6), region: 'asia' },
  { code: 'ke', name: 'Kenya', native: 'Kenya', language: 'Kiswahili', greeting: 'Jambo', ui: 'en', currency: cur('KES', 'KSh', 10.8), region: 'africa' },
  { code: 'ki', name: 'Kiribati', native: 'Kiribati', language: 'Taetae ni Kiribati', greeting: 'Mauri', ui: 'en', currency: AUD, region: 'oceania' },
  { code: 'xk', name: 'Kosovo', native: 'Kosova', language: 'Shqip', greeting: 'Përshëndetje', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'kw', name: 'Kuwait', native: 'الكويت', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('KWD', 'KD', 4560, 3), region: 'middle-east' },
  { code: 'kg', name: 'Kyrgyzstan', native: 'Кыргызстан', aliases: ['kyrgyz', 'kirghizia'], language: 'Кыргыз тили', greeting: 'Саламатсызбы', ui: 'en', currency: cur('KGS', 'сом', 16), region: 'asia' },
  { code: 'la', name: 'Laos', native: 'ລາວ', aliases: ['lao'], language: 'ພາສາລາວ', greeting: 'ສະບາຍດີ', ui: 'en', currency: cur('LAK', '₭', 0.065, 0), region: 'asia' },
  { code: 'lv', name: 'Latvia', native: 'Latvija', language: 'Latviešu', greeting: 'Sveiki', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'lb', name: 'Lebanon', native: 'لبنان', aliases: ['liban'], language: 'العربية', greeting: 'مرحبا', ui: 'fr', currency: cur('LBP', 'LBP', 0.0156, 0), region: 'middle-east' },
  { code: 'ls', name: 'Lesotho', native: 'Lesotho', language: 'Sesotho', greeting: 'Lumela', ui: 'en', currency: cur('LSL', 'L', 78), region: 'africa' },
  { code: 'lr', name: 'Liberia', native: 'Liberia', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('LRD', 'L$', 7), region: 'africa' },
  { code: 'ly', name: 'Libya', native: 'ليبيا', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('LYD', 'LD', 255, 3), region: 'africa' },
  { code: 'li', name: 'Liechtenstein', native: 'Liechtenstein', language: 'Deutsch', greeting: 'Grüezi', ui: 'en', currency: CHF, region: 'europe' },
  { code: 'lt', name: 'Lithuania', native: 'Lietuva', language: 'Lietuvių', greeting: 'Labas', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'lu', name: 'Luxembourg', native: 'Lëtzebuerg', aliases: ['luxemburg'], language: 'Lëtzebuergesch', greeting: 'Moien', ui: 'fr', currency: EUR, region: 'europe' },
  { code: 'mo', name: 'Macau', native: '澳門', aliases: ['macao'], language: '廣東話', greeting: '你好', ui: 'en', currency: cur('MOP', 'MOP$', 175), region: 'asia' },
  { code: 'mg', name: 'Madagascar', native: 'Madagasikara', language: 'Malagasy', greeting: 'Salama', ui: 'fr', currency: cur('MGA', 'Ar', 0.31, 0), region: 'africa' },
  { code: 'mw', name: 'Malawi', native: 'Malawi', language: 'Chicheŵa', greeting: 'Moni', ui: 'en', currency: cur('MWK', 'MK', 0.81), region: 'africa' },
  { code: 'my', name: 'Malaysia', native: 'Malaysia', language: 'Bahasa Melayu', greeting: 'Apa khabar', ui: 'en', currency: cur('MYR', 'RM', 330), region: 'asia' },
  { code: 'mv', name: 'Maldives', native: 'ދިވެހިރާއްޖެ', aliases: ['maldive islands'], language: 'ދިވެހި', greeting: 'އައްސަލާމު ޢަލައިކުމް', ui: 'en', currency: cur('MVR', 'Rf', 91), region: 'asia' },
  { code: 'ml', name: 'Mali', native: 'Mali', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XOF, region: 'africa' },
  { code: 'mt', name: 'Malta', native: 'Malta', language: 'Malti', greeting: 'Bonġu', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'mh', name: 'Marshall Islands', native: 'M̧ajeļ', aliases: ['marshall'], language: 'Kajin M̧ajeļ', greeting: 'Iakwe', ui: 'en', currency: USD, region: 'oceania' },
  { code: 'mr', name: 'Mauritania', native: 'موريتانيا', aliases: ['mauritanie'], language: 'العربية', greeting: 'مرحبا', ui: 'fr', currency: cur('MRU', 'UM', 35), region: 'africa' },
  { code: 'mu', name: 'Mauritius', native: 'Maurice', aliases: ['ile maurice', 'moris'], language: 'Kreol Morisien', greeting: 'Bonzour', ui: 'fr', currency: cur('MUR', '₨', 31), region: 'africa' },
  { code: 'mx', name: 'Mexico', native: 'México', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('MXN', '$', 75), region: 'americas' },
  { code: 'fm', name: 'Micronesia', native: 'Micronesia', aliases: ['federated states of micronesia', 'fsm'], language: 'English', greeting: 'Hello', ui: 'en', currency: USD, region: 'oceania' },
  { code: 'md', name: 'Moldova', native: 'Moldova', language: 'Română', greeting: 'Bună ziua', ui: 'en', currency: cur('MDL', 'L', 82), region: 'europe' },
  { code: 'mc', name: 'Monaco', native: 'Monaco', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: EUR, region: 'europe' },
  { code: 'mn', name: 'Mongolia', native: 'Монгол Улс', aliases: ['mongol'], language: 'Монгол хэл', greeting: 'Сайн байна уу', ui: 'en', currency: cur('MNT', '₮', 0.39, 0), region: 'asia' },
  { code: 'me', name: 'Montenegro', native: 'Crna Gora', language: 'Crnogorski', greeting: 'Zdravo', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'ma', name: 'Morocco', native: 'المغرب', aliases: ['maroc', 'al maghrib'], language: 'العربية', greeting: 'مرحبا', ui: 'fr', currency: cur('MAD', 'DH', 152), region: 'africa' },
  { code: 'mz', name: 'Mozambique', native: 'Moçambique', language: 'Português', greeting: 'Olá', ui: 'en', currency: cur('MZN', 'MT', 21.9), region: 'africa' },
  { code: 'mm', name: 'Myanmar', native: 'မြန်မာ', aliases: ['burma'], language: 'မြန်မာဘာသာ', greeting: 'မင်္ဂလာပါ', ui: 'en', currency: cur('MMK', 'K', 0.5, 0), region: 'asia' },
  { code: 'na', name: 'Namibia', native: 'Namibia', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('NAD', 'N$', 78), region: 'africa' },
  { code: 'nr', name: 'Nauru', native: 'Naoero', language: 'English', greeting: 'Hello', ui: 'en', currency: AUD, region: 'oceania' },
  { code: 'np', name: 'Nepal', native: 'नेपाल', language: 'नेपाली', greeting: 'नमस्ते', ui: 'en', currency: cur('NPR', 'Rs', 10), region: 'asia' },
  { code: 'nl', name: 'Netherlands', native: 'Nederland', aliases: ['holland', 'the netherlands', 'dutch', 'pays-bas'], language: 'Nederlands', greeting: 'Hallo', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'nc', name: 'New Caledonia', native: 'Nouvelle-Calédonie', aliases: ['nouvelle caledonie'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XPF, region: 'oceania' },
  { code: 'nz', name: 'New Zealand', native: 'Aotearoa', aliases: ['nz', 'kiwi'], language: 'English', greeting: 'Kia ora', ui: 'en', currency: cur('NZD', 'NZ$', 830), region: 'oceania' },
  { code: 'ni', name: 'Nicaragua', native: 'Nicaragua', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('NIO', 'C$', 38), region: 'americas' },
  { code: 'ne', name: 'Niger', native: 'Niger', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XOF, region: 'africa' },
  { code: 'ng', name: 'Nigeria', native: 'Nigeria', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('NGN', '₦', 0.9), region: 'africa' },
  { code: 'mk', name: 'North Macedonia', native: 'Северна Македонија', aliases: ['macedonia'], language: 'Македонски', greeting: 'Здраво', ui: 'en', currency: cur('MKD', 'ден', 26.3), region: 'europe' },
  { code: 'no', name: 'Norway', native: 'Norge', aliases: ['noreg'], language: 'Norsk', greeting: 'Hei', ui: 'en', currency: cur('NOK', 'kr', 138), region: 'europe' },
  { code: 'om', name: 'Oman', native: 'عُمان', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('OMR', 'OMR', 3640, 3), region: 'middle-east' },
  { code: 'pk', name: 'Pakistan', native: 'پاکستان', language: 'اردو', greeting: 'السلام علیکم', ui: 'en', currency: cur('PKR', 'Rs', 5), region: 'asia' },
  { code: 'pw', name: 'Palau', native: 'Belau', language: 'Tekoi er a Belau', greeting: 'Alii', ui: 'en', currency: USD, region: 'oceania' },
  { code: 'ps', name: 'Palestine', native: 'فلسطين', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: ILS, region: 'middle-east' },
  { code: 'pa', name: 'Panama', native: 'Panamá', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: USD, region: 'americas' },
  { code: 'pg', name: 'Papua New Guinea', native: 'Papua Niugini', aliases: ['png'], language: 'Tok Pisin', greeting: 'Gude', ui: 'en', currency: cur('PGK', 'K', 340), region: 'oceania' },
  { code: 'py', name: 'Paraguay', native: 'Paraguay', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('PYG', '₲', 0.18, 0), region: 'americas' },
  { code: 'pe', name: 'Peru', native: 'Perú', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('PEN', 'S/', 390), region: 'americas' },
  { code: 'ph', name: 'Philippines', native: 'Pilipinas', aliases: ['filipinas', 'pinas'], language: 'Filipino', greeting: 'Kumusta', ui: 'en', currency: cur('PHP', '₱', 24), region: 'asia', featured: 9 },
  { code: 'pl', name: 'Poland', native: 'Polska', aliases: ['pologne'], language: 'Polski', greeting: 'Cześć', ui: 'en', currency: cur('PLN', 'zł', 380), region: 'europe' },
  { code: 'pt', name: 'Portugal', native: 'Portugal', language: 'Português', greeting: 'Olá', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'pr', name: 'Puerto Rico', native: 'Puerto Rico', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: USD, region: 'americas' },
  { code: 'qa', name: 'Qatar', native: 'قطر', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('QAR', 'QR', 385), region: 'middle-east' },
  { code: 're', name: 'Réunion', native: 'La Réunion', aliases: ['la reunion'], language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: EUR, region: 'africa' },
  { code: 'ro', name: 'Romania', native: 'România', language: 'Română', greeting: 'Bună ziua', ui: 'en', currency: cur('RON', 'lei', 320), region: 'europe' },
  { code: 'ru', name: 'Russia', native: 'Россия', aliases: ['russian federation', 'rossiya'], language: 'Русский', greeting: 'Здравствуйте', ui: 'en', currency: cur('RUB', '₽', 17), region: 'europe' },
  { code: 'rw', name: 'Rwanda', native: 'Rwanda', language: 'Ikinyarwanda', greeting: 'Muraho', ui: 'fr', currency: cur('RWF', 'FRw', 0.97, 0), region: 'africa' },
  { code: 'kn', name: 'Saint Kitts and Nevis', native: 'Saint Kitts and Nevis', aliases: ['st kitts and nevis', 'st kitts', 'nevis'], language: 'English', greeting: 'Hello', ui: 'en', currency: XCD, region: 'americas' },
  { code: 'lc', name: 'Saint Lucia', native: 'Saint Lucia', aliases: ['st lucia'], language: 'English', greeting: 'Hello', ui: 'en', currency: XCD, region: 'americas' },
  { code: 'vc', name: 'Saint Vincent and the Grenadines', native: 'Saint Vincent and the Grenadines', aliases: ['st vincent', 'grenadines'], language: 'English', greeting: 'Hello', ui: 'en', currency: XCD, region: 'americas' },
  { code: 'ws', name: 'Samoa', native: 'Sāmoa', language: 'Gagana Sāmoa', greeting: 'Tālofa', ui: 'en', currency: cur('WST', 'WS$', 510), region: 'oceania' },
  { code: 'sm', name: 'San Marino', native: 'San Marino', language: 'Italiano', greeting: 'Ciao', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'st', name: 'São Tomé and Príncipe', native: 'São Tomé e Príncipe', aliases: ['sao tome'], language: 'Português', greeting: 'Olá', ui: 'en', currency: cur('STN', 'Db', 66), region: 'africa' },
  { code: 'sa', name: 'Saudi Arabia', native: 'السعودية', aliases: ['ksa', 'saudi'], language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('SAR', 'SR', 373), region: 'middle-east' },
  { code: 'sn', name: 'Senegal', native: 'Sénégal', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XOF, region: 'africa' },
  { code: 'rs', name: 'Serbia', native: 'Србија', aliases: ['srbija'], language: 'Српски', greeting: 'Здраво', ui: 'en', currency: cur('RSD', 'дин.', 13.8), region: 'europe' },
  { code: 'sc', name: 'Seychelles', native: 'Sesel', language: 'Kreol Seselwa', greeting: 'Bonzour', ui: 'en', currency: cur('SCR', '₨', 98), region: 'africa' },
  { code: 'sl', name: 'Sierra Leone', native: 'Sierra Leone', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('SLE', 'Le', 61), region: 'africa' },
  { code: 'sg', name: 'Singapore', native: 'Singapore', aliases: ['singapura'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('SGD', 'S$', 1080), region: 'asia', featured: 10 },
  { code: 'sk', name: 'Slovakia', native: 'Slovensko', language: 'Slovenčina', greeting: 'Dobrý deň', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'si', name: 'Slovenia', native: 'Slovenija', language: 'Slovenščina', greeting: 'Živjo', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'sb', name: 'Solomon Islands', native: 'Solomon Islands', aliases: ['solomons'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('SBD', 'SI$', 168), region: 'oceania' },
  { code: 'so', name: 'Somalia', native: 'Soomaaliya', language: 'Af-Soomaali', greeting: 'Iska warran', ui: 'en', currency: cur('SOS', 'Sh', 2.45, 0), region: 'africa' },
  { code: 'za', name: 'South Africa', native: 'South Africa', aliases: ['rsa', 'mzansi'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('ZAR', 'R', 78), region: 'africa' },
  { code: 'kr', name: 'South Korea', native: '대한민국', aliases: ['korea', 'republic of korea', 'rok', 'hanguk'], language: '한국어', greeting: '안녕하세요', ui: 'ko', currency: cur('KRW', '₩', 1, 0), region: 'asia' },
  { code: 'ss', name: 'South Sudan', native: 'South Sudan', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('SSP', 'SSP', 0.3), region: 'africa' },
  { code: 'es', name: 'Spain', native: 'España', aliases: ['espana', 'espagne'], language: 'Español', greeting: '¡Hola!', ui: 'en', currency: EUR, region: 'europe' },
  { code: 'lk', name: 'Sri Lanka', native: 'ශ්‍රී ලංකාව', aliases: ['ceylon'], language: 'සිංහල', greeting: 'ආයුබෝවන්', ui: 'en', currency: cur('LKR', 'Rs', 4.6), region: 'asia' },
  { code: 'sd', name: 'Sudan', native: 'السودان', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('SDG', 'SDG', 2.3), region: 'africa' },
  { code: 'sr', name: 'Suriname', native: 'Suriname', aliases: ['surinam'], language: 'Nederlands', greeting: 'Hallo', ui: 'en', currency: cur('SRD', '$', 37), region: 'americas' },
  { code: 'se', name: 'Sweden', native: 'Sverige', aliases: ['suede'], language: 'Svenska', greeting: 'Hej', ui: 'en', currency: cur('SEK', 'kr', 148), region: 'europe' },
  { code: 'ch', name: 'Switzerland', native: 'Schweiz', aliases: ['suisse', 'svizzera', 'swiss', 'helvetia'], language: 'Deutsch', greeting: 'Grüezi', ui: 'fr', currency: CHF, region: 'europe' },
  { code: 'sy', name: 'Syria', native: 'سوريا', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('SYP', 'SYP', 0.11, 0), region: 'middle-east' },
  { code: 'tw', name: 'Taiwan', native: '臺灣', aliases: ['roc', 'republic of china', 'formosa', 'chinese taipei', 'taipei'], language: '中文', greeting: '你好', ui: 'en', currency: cur('TWD', 'NT$', 44, 0), region: 'asia', featured: 4 },
  { code: 'tj', name: 'Tajikistan', native: 'Тоҷикистон', language: 'Тоҷикӣ', greeting: 'Салом', ui: 'en', currency: cur('TJS', 'SM', 140), region: 'asia' },
  { code: 'tz', name: 'Tanzania', native: 'Tanzania', language: 'Kiswahili', greeting: 'Habari', ui: 'en', currency: cur('TZS', 'TSh', 0.55, 0), region: 'africa' },
  { code: 'th', name: 'Thailand', native: 'ประเทศไทย', aliases: ['siam', 'prathet thai'], language: 'ไทย', greeting: 'สวัสดี', ui: 'en', currency: cur('THB', '฿', 42), region: 'asia', featured: 7 },
  { code: 'tl', name: 'Timor-Leste', native: 'Timor-Leste', aliases: ['east timor'], language: 'Tetun', greeting: 'Bondia', ui: 'en', currency: USD, region: 'asia' },
  { code: 'tg', name: 'Togo', native: 'Togo', language: 'Français', greeting: 'Bonjour', ui: 'fr', currency: XOF, region: 'africa' },
  { code: 'to', name: 'Tonga', native: 'Tonga', language: 'Lea faka-Tonga', greeting: 'Mālō e lelei', ui: 'en', currency: cur('TOP', 'T$', 590), region: 'oceania' },
  { code: 'tt', name: 'Trinidad and Tobago', native: 'Trinidad and Tobago', aliases: ['trinidad', 'tobago'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('TTD', 'TT$', 206), region: 'americas' },
  { code: 'tn', name: 'Tunisia', native: 'تونس', aliases: ['tunisie'], language: 'العربية', greeting: 'مرحبا', ui: 'fr', currency: cur('TND', 'DT', 470, 3), region: 'africa' },
  { code: 'tr', name: 'Türkiye', native: 'Türkiye', aliases: ['turkey', 'turquie'], language: 'Türkçe', greeting: 'Merhaba', ui: 'en', currency: cur('TRY', '₺', 32), region: 'europe' },
  { code: 'tm', name: 'Turkmenistan', native: 'Türkmenistan', language: 'Türkmen dili', greeting: 'Salam', ui: 'en', currency: cur('TMT', 'm', 400), region: 'asia' },
  { code: 'tv', name: 'Tuvalu', native: 'Tuvalu', language: 'Te gana Tuvalu', greeting: 'Tālofa', ui: 'en', currency: AUD, region: 'oceania' },
  { code: 'ug', name: 'Uganda', native: 'Uganda', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('UGX', 'USh', 0.38, 0), region: 'africa' },
  { code: 'ua', name: 'Ukraine', native: 'Україна', aliases: ['ukraina'], language: 'Українська', greeting: 'Добрий день', ui: 'en', currency: cur('UAH', '₴', 34), region: 'europe' },
  { code: 'ae', name: 'United Arab Emirates', native: 'الإمارات', aliases: ['uae', 'emirates', 'dubai', 'abu dhabi'], language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('AED', 'AED', 381), region: 'middle-east' },
  { code: 'gb', name: 'United Kingdom', native: 'United Kingdom', aliases: ['uk', 'u.k.', 'gb', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland'], language: 'English', greeting: 'Hello', ui: 'en', currency: cur('GBP', '£', 1880), region: 'europe', featured: 11 },
  { code: 'us', name: 'United States', native: 'United States', aliases: ['usa', 'us', 'u.s.', 'u.s.a.', 'america', 'united states of america'], language: 'English', greeting: 'Hello', ui: 'en', currency: USD, region: 'americas', featured: 2 },
  { code: 'uy', name: 'Uruguay', native: 'Uruguay', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('UYU', '$U', 35), region: 'americas' },
  { code: 'uz', name: 'Uzbekistan', native: 'Oʻzbekiston', language: 'Oʻzbek tili', greeting: 'Salom', ui: 'en', currency: cur('UZS', 'soʻm', 0.11, 0), region: 'asia' },
  { code: 'vu', name: 'Vanuatu', native: 'Vanuatu', language: 'Bislama', greeting: 'Halo', ui: 'en', currency: cur('VUV', 'VT', 11.7, 0), region: 'oceania' },
  { code: 'va', name: 'Vatican City', native: 'Città del Vaticano', aliases: ['vatican', 'holy see'], language: 'Italiano', greeting: 'Buongiorno', ui: 'en', currency: EUR, region: 'europe' },
  { code: 've', name: 'Venezuela', native: 'Venezuela', language: 'Español', greeting: '¡Hola!', ui: 'en', currency: cur('VES', 'Bs.', 8), region: 'americas' },
  { code: 'vn', name: 'Vietnam', native: 'Việt Nam', aliases: ['viet nam'], language: 'Tiếng Việt', greeting: 'Xin chào', ui: 'en', currency: cur('VND', '₫', 0.055, 0), region: 'asia', featured: 6 },
  { code: 'ye', name: 'Yemen', native: 'اليمن', language: 'العربية', greeting: 'مرحبا', ui: 'en', currency: cur('YER', 'YER', 0.6, 0), region: 'middle-east' },
  { code: 'zm', name: 'Zambia', native: 'Zambia', language: 'English', greeting: 'Hello', ui: 'en', currency: cur('ZMW', 'K', 58), region: 'africa' },
  { code: 'zw', name: 'Zimbabwe', native: 'Zimbabwe', language: 'English', greeting: 'Hello', ui: 'en', currency: USD, region: 'africa' },
]

export const COUNTRIES: Country[] = [...RAW].sort((a, b) => a.name.localeCompare(b.name, 'en'))

export const KOREA_CODE = 'kr'

export const COUNTRY_COUNT = COUNTRIES.length

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export const countryByCode = (code: string): Country | undefined => BY_CODE.get(code.trim().toLowerCase())

/** 검색용 정규화 — 악센트·대소문자·문장부호를 지운다('Côte d’Ivoire' → 'cote divoire', 'U.S.A.' → 'usa') */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`ʻʼ.]/g, '')
    .replace(/[-_/,()&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface SearchEntry {
  country: Country
  name: string
  nameWords: string[]
  aliases: string[]
  aliasWords: string[]
  native: string
}

const INDEX: SearchEntry[] = COUNTRIES.map((country) => {
  const name = norm(country.name)
  const aliases = (country.aliases ?? []).map(norm)
  return {
    country,
    name,
    nameWords: name.split(' '),
    aliases,
    aliasWords: aliases.flatMap((a) => a.split(' ')),
    native: norm(country.native),
  }
})

/** 낮을수록 위 — 맞지 않으면 -1 */
function rank(e: SearchEntry, q: string): number {
  if (e.name === q || e.aliases.includes(q)) return 0
  if (e.name.startsWith(q)) return 1
  if (e.nameWords.some((w) => w.startsWith(q))) return 2
  if (e.aliases.some((a) => a.startsWith(q)) || e.aliasWords.some((w) => w.startsWith(q))) return 3
  if (e.native.startsWith(q)) return 4
  if (e.name.includes(q)) return 5
  if (e.native.includes(q) || e.aliases.some((a) => a.includes(q))) return 6
  return -1
}

/** 나라 검색 — 같은 등급이면 인기 나라(featured) 먼저, 그다음 이름순 */
export function searchCountries(query: string): Country[] {
  const q = norm(query)
  if (!q) return []
  const hits: { country: Country; rank: number }[] = []
  for (const e of INDEX) {
    const r = rank(e, q)
    if (r >= 0) hits.push({ country: e.country, rank: r })
  }
  hits.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.country.featured ?? 99) - (b.country.featured ?? 99) ||
      a.country.name.localeCompare(b.country.name, 'en'),
  )
  return hits.map((h) => h.country)
}
