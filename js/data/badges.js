// Mars / regions d'immersió (camp "Mar" del formulari)
export const SEAS = {
  med:   'Mediterrani',
  atl:   'Atlàntic',
  roig:  'Mar Roig',
  carib: 'Carib',
  indo:  'Índic / Indo-Pacífic',
  pac:   'Pacífic',
  altre: 'Altres / aigua dolça',
};

// Mar suggerit automàticament segons el país (es pot canviar al formulari)
export const COUNTRY_SEA = {
  ES: 'med', FR: 'med', IT: 'med', MT: 'med', HR: 'med', GR: 'med', CY: 'med', TR: 'med', SI: 'med',
  ME: 'med', AL: 'med', MC: 'med', TN: 'med', LB: 'med', DZ: 'med', LY: 'med', BA: 'med', AD: 'med',
  PT: 'atl', MA: 'atl', IE: 'atl', GB: 'atl', IS: 'atl', NO: 'atl', CV: 'atl', SN: 'atl', BR: 'atl', AR: 'atl',
  EG: 'roig', SD: 'roig', SA: 'roig', JO: 'roig', IL: 'roig', ER: 'roig', DJ: 'roig', YE: 'roig',
  MX: 'carib', BZ: 'carib', HN: 'carib', CU: 'carib', DO: 'carib', BS: 'carib', JM: 'carib', BQ: 'carib',
  CW: 'carib', AW: 'carib', KY: 'carib', TC: 'carib', VG: 'carib', VI: 'carib', PR: 'carib', BB: 'carib',
  LC: 'carib', GD: 'carib', VC: 'carib', DM: 'carib', AG: 'carib', KN: 'carib', GP: 'carib', MQ: 'carib',
  TT: 'carib', VE: 'carib', CO: 'carib', PA: 'carib', CR: 'carib', NI: 'carib', GT: 'carib',
  MV: 'indo', SC: 'indo', MU: 'indo', RE: 'indo', MG: 'indo', MZ: 'indo', TZ: 'indo', KE: 'indo', ZA: 'indo',
  LK: 'indo', IN: 'indo', TH: 'indo', MY: 'indo', ID: 'indo', PH: 'indo', MM: 'indo', OM: 'indo', AE: 'indo',
  TL: 'indo', PG: 'indo', SB: 'indo', AU: 'indo', VN: 'indo', KH: 'indo', CX: 'indo', CC: 'indo', YT: 'indo',
  JP: 'pac', TW: 'pac', KR: 'pac', CN: 'pac', PW: 'pac', FM: 'pac', MH: 'pac', GU: 'pac', MP: 'pac',
  FJ: 'pac', PF: 'pac', NC: 'pac', VU: 'pac', TO: 'pac', WS: 'pac', CK: 'pac', NZ: 'pac', KI: 'pac',
  EC: 'pac', PE: 'pac', CL: 'pac', US: 'pac', CA: 'pac',
};

// Tipus d'immersió (etiquetes del formulari)
export const DIVE_TAGS = [
  { id: 'nit',    label: 'Nocturna', icon: '🌙' },
  { id: 'pecio',  label: 'Pecio',    icon: '⚓' },
  { id: 'cova',   label: 'Cova',     icon: '🔦' },
  { id: 'deriva', label: 'Deriva',   icon: '🌊' },
  { id: 'paret',  label: 'Paret',    icon: '🧗' },
  { id: 'barca',  label: 'Des de barca', icon: '🚤' },
  { id: 'costa',  label: 'Des de costa', icon: '🏖️' },
  { id: 'curs',   label: 'Curs / formació', icon: '🎓' },
];

export const SUITS = [
  'Sense vestit / lycra', 'Shorty', 'Humit 3 mm', 'Humit 5 mm', 'Humit 7 mm', 'Semisec', 'Sec',
];

// Insígnies. `test(st)` rep les estadístiques calculades (veure computeStats a app.js)
export const BADGES = [
  { id: 'primera',  icon: '🤿', name: 'Primer salt',        desc: 'Registra la primera immersió.',         test: s => s.dives >= 1 },
  { id: 'd10',      icon: '🫧', name: 'Bombolles',          desc: '10 immersions registrades.',            test: s => s.dives >= 10 },
  { id: 'd25',      icon: '🐚', name: 'Pell de sal',        desc: '25 immersions registrades.',            test: s => s.dives >= 25 },
  { id: 'd50',      icon: '🧜', name: 'Mig amfibi',         desc: '50 immersions registrades.',            test: s => s.dives >= 50 },
  { id: 'd100',     icon: '💯', name: 'Centenari',          desc: '100 immersions registrades.',           test: s => s.dives >= 100 },
  { id: 'hores10',  icon: '⏳', name: '10 hores sota l\'aigua', desc: 'Suma 600 minuts de fons.',          test: s => s.minutes >= 600 },
  { id: 'nit',      icon: '🌙', name: 'Busseig Nocturn',    desc: 'Fes una immersió nocturna.',            test: s => s.tags.nit },
  { id: 'pecio',    icon: '⚓', name: 'Explorador de Pecis', desc: 'Busseja en un pecio.',                 test: s => s.tags.pecio },
  { id: 'cova',     icon: '🔦', name: 'Espeleòleg',         desc: 'Entra en una cova submarina.',          test: s => s.tags.cova },
  { id: 'deriva',   icon: '🌊', name: 'Corrent a favor',    desc: 'Fes una immersió a la deriva.',         test: s => s.tags.deriva },
  { id: 'p30',      icon: '⬇️', name: 'Blau profund',       desc: 'Arriba als 30 metres.',                 test: s => s.maxDepth >= 30 },
  { id: 'p40',      icon: '🕳️', name: 'Abisme',             desc: 'Arriba als 40 metres.',                 test: s => s.maxDepth >= 40 },
  { id: 'llarga',   icon: '🫁', name: 'Pulmons d\'acer',    desc: 'Una immersió de 60 minuts o més.',      test: s => s.maxTime >= 60 },
  { id: 'fred',     icon: '🥶', name: 'Aigües gelades',     desc: 'Busseja a 14 °C o menys.',              test: s => s.minTemp != null && s.minTemp <= 14 },
  { id: 'calent',   icon: '🌴', name: 'Sopa tropical',      desc: 'Busseja a 28 °C o més.',                test: s => s.maxTemp != null && s.maxTemp >= 28 },
  { id: 'marroig',  icon: '🏜️', name: 'Visita al Mar Roig', desc: 'Busseja al Mar Roig.',                  test: s => s.seas.roig },
  { id: 'carib',    icon: '🏴‍☠️', name: 'Pirata del Carib',   desc: 'Busseja al Carib.',                    test: s => s.seas.carib },
  { id: 'med',      icon: '🏛️', name: 'Mare Nostrum',       desc: 'Busseja al Mediterrani.',               test: s => s.seas.med },
  { id: 'indo',     icon: '🏝️', name: 'Triangle de Corall', desc: 'Busseja a l\'Índic o l\'Indo-Pacífic.', test: s => s.seas.indo },
  { id: 'c3',       icon: '🧭', name: 'Rodamón',            desc: 'Busseja a 3 països diferents.',         test: s => s.countries >= 3 },
  { id: 'c7',       icon: '🌍', name: 'Nòmada blau',        desc: 'Busseja a 7 països diferents.',         test: s => s.countries >= 7 },
  { id: 'sp10',     icon: '🔎', name: 'Naturalista',        desc: 'Desbloqueja 10 espècies.',              test: s => s.species >= 10 },
  { id: 'sp25',     icon: '🔬', name: 'Biòleg marí',        desc: 'Desbloqueja 25 espècies.',              test: s => s.species >= 25 },
  { id: 'sp50',     icon: '🏆', name: 'Mestre del Dex',     desc: 'Desbloqueja 50 espècies.',              test: s => s.species >= 50 },
  { id: 'tauro',    icon: '🦈', name: 'Dents afilades',     desc: 'Veu qualsevol tauró.',                  test: s => s.tagSeen.tauro },
  { id: 'tortuga',  icon: '🐢', name: 'Amics de les tortugues', desc: 'Veu una tortuga marina.',          test: s => s.tagSeen.tortuga },
  { id: 'epic',     icon: '✨', name: 'Moment èpic',        desc: 'Desbloqueja una espècie èpica.',        test: s => s.byRarity[2] >= 1 },
  { id: 'llegenda', icon: '👑', name: 'Llegenda viva',      desc: 'Desbloqueja una espècie llegendària.',  test: s => s.byRarity[3] >= 1 },
  { id: 'arc',      icon: '🌈', name: 'Arc de Sant Martí',  desc: 'Una espècie de cada raresa.',           test: s => s.byRarity.every(n => n >= 1) },
];
