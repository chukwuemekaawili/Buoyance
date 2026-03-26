export interface StateIRS {
  name: string;
  acronym: string;
  url: string;
}

export const STATE_IRS_PORTALS: Record<string, StateIRS> = {
  abia: { name: "Abia", acronym: "ABIRS", url: "https://abirs.gov.ng" },
  abuja: { name: "Abuja (FCT)", acronym: "FIRS", url: "https://taxpromax.firs.gov.ng" },
  adamawa: { name: "Adamawa", acronym: "ADIRS", url: "https://adamawarevenue.gov.ng" },
  akwa_ibom: { name: "Akwa Ibom", acronym: "AKIRS", url: "https://akirsng.gov.ng" },
  anambra: { name: "Anambra", acronym: "AIRS", url: "https://tax.services.an.gov.ng" },
  bauchi: { name: "Bauchi", acronym: "BRS", url: "https://birs.bu.gov.ng" },
  bayelsa: { name: "Bayelsa", acronym: "BIRS", url: "https://bayelsarevenue.gov.ng" },
  benue: { name: "Benue", acronym: "BIRS", url: "https://birs.be.gov.ng" },
  borno: { name: "Borno", acronym: "BSIRS", url: "https://birs.gov.ng" },
  cross_river: { name: "Cross River", acronym: "CRSIRS", url: "https://crirs.ng" },
  delta: { name: "Delta", acronym: "DIRA", url: "https://deltabir.deltastate.gov.ng" },
  ebonyi: { name: "Ebonyi", acronym: "EBIRS", url: "https://tax.ebsirs.eb.gov.ng" },
  edo: { name: "Edo", acronym: "ESIRS", url: "https://esirs.edo.gov.ng" },
  ekiti: { name: "Ekiti", acronym: "EKIRS", url: "https://ekirs.ng" },
  enugu: { name: "Enugu", acronym: "ESIRS", url: "https://enugustatersb.gov.ng" },
  gombe: { name: "Gombe", acronym: "GIRS", url: "https://girs.gm.gov.ng" },
  imo: { name: "Imo", acronym: "IMAS", url: "https://iirs.im.gov.ng" },
  jigawa: { name: "Jigawa", acronym: "JIRS", url: "https://jirs.gov.ng" },
  kaduna: { name: "Kaduna", acronym: "KGIRS", url: "https://kgirs.gov.ng" },
  kano: { name: "Kano", acronym: "KIRS", url: "https://kirs.gov.ng" },
  katsina: { name: "Katsina", acronym: "KTIRS", url: "https://irs.kt.gov.ng" },
  kebbi: { name: "Kebbi", acronym: "KBIRS", url: "https://kebbiirs.gov.ng" },
  kogi: { name: "Kogi", acronym: "KGIRS", url: "https://portal.irs.kg.gov.ng" },
  kwara: { name: "Kwara", acronym: "KWIRS", url: "https://selfservice.kwirs.com" },
  lagos: { name: "Lagos", acronym: "LIRS", url: "https://lirs.gov.ng" },
  nasarawa: { name: "Nasarawa", acronym: "NIRS", url: "https://irs.na.gov.ng" },
  niger: { name: "Niger", acronym: "NIGIRS", url: "https://nigerstaterevenue.org" },
  ogun: { name: "Ogun", acronym: "OGSIRS", url: "https://ogunstaterevenue.com" },
  ondo: { name: "Ondo", acronym: "OIRS", url: "https://odirs.ng" },
  osun: { name: "Osun", acronym: "OSIRS", url: "https://irs.os.gov.ng" },
  oyo: { name: "Oyo", acronym: "OYOSIRS", url: "https://selfservice.oyostatebir.com" },
  plateau: { name: "Plateau", acronym: "PSIRS", url: "https://psirs.gov.ng" },
  rivers: { name: "Rivers", acronym: "RIRS", url: "https://riversbirs.gov.ng" },
  sokoto: { name: "Sokoto", acronym: "SIRS", url: "https://itas.irs.sk.gov.ng" },
  taraba: { name: "Taraba", acronym: "TIRS", url: "https://tarababir.gov.ng" },
  yobe: { name: "Yobe", acronym: "YIRS", url: "https://irs.yb.gov.ng" },
  zamfara: { name: "Zamfara", acronym: "ZIRS", url: "https://zamfararevenue.gov.ng" },
};

export const NIGERIAN_STATES = Object.values(STATE_IRS_PORTALS).map(state => state.name).sort();

export function getStatePortal(workState?: string | null): StateIRS | null {
  if (!workState) return null;
  
  // First, try to exactly match the display name (which is what is saved in the DB)
  const match = Object.values(STATE_IRS_PORTALS).find(
    (portal) => portal.name.toLowerCase() === workState.trim().toLowerCase()
  );
  if (match) return match;

  // Fallback to strict key matching if needed
  const key = workState.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, '');
  return STATE_IRS_PORTALS[key] ?? null;
}
