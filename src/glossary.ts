export interface GlossaryEntry {
  term: string;
  short: string;
  long: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'star-ratings': {
    term: 'Star Ratings',
    short: 'A 1–5 score for each Australian residential aged care home.',
    long:
      'The Department of Health, Disability and Ageing publishes Star Ratings quarterly. Every government-funded residential aged care service receives an Overall Star Rating (1–5) and four sub-ratings: Residents\' Experience, Compliance, Staffing, and Quality Measures. They\'re intended to help families compare homes.',
  },
  'residents-experience': {
    term: 'Residents\' Experience rating',
    short: 'How residents feel about the home, from face-to-face interviews.',
    long:
      'Each year an independent interviewer visits the home and asks at least 10% of residents 12 questions covering food, safety, staff respect, having their voice heard, and feeling at home. Responses are summarised into a 1–5 rating.',
  },
  'compliance-rating': {
    term: 'Compliance rating',
    short: 'How the home performs against the Aged Care Quality Standards.',
    long:
      'Based on the most recent Aged Care Quality and Safety Commission assessment against the eight Aged Care Quality Standards. A 1-star compliance rating means a serious risk has been identified and the home is under regulatory action.',
  },
  'staffing-rating': {
    term: 'Staffing rating',
    short: 'Whether care minutes per resident meet the regulated target.',
    long:
      'From 1 October 2023 all residential aged care services must deliver mandatory care minutes per resident per day, including a Registered Nurse share. From October 2025, services must meet BOTH the RN target AND the total care minutes target to score 3 stars or more.',
  },
  'quality-measures': {
    term: 'Quality Measures rating',
    short: 'How often residents experience pressure injuries, falls, weight loss, and other quality flags.',
    long:
      'Five clinical indicators: pressure injuries, physical restraint, unplanned weight loss, falls and major injury, and medication management. Each is reported per 100 residents and benchmarked against national medians.',
  },
  'mmm': {
    term: 'MMM (Modified Monash Model)',
    short: 'The geographic remoteness classification used in Australian aged care.',
    long:
      'MM1 = Metropolitan, MM2 = Regional centres, MM3 = Large rural towns, MM4 = Medium rural towns, MM5 = Small rural towns, MM6 = Remote, MM7 = Very remote. Staffing, recruitment, and quality benchmarks vary by MMM.',
  },
  'care-minutes': {
    term: 'Care minutes',
    short: 'Mandatory minutes of direct care per resident per day.',
    long:
      'From October 2025 the national targets are 215 total care minutes per resident per day (including 44 minutes from a Registered Nurse). Targets vary slightly by resident assessment classification. Falling short of either the RN or total target locks a service to a maximum 2-star Staffing rating.',
  },
  'purpose': {
    term: 'Purpose',
    short: 'Whether the provider is For Profit, Not for Profit, or Government.',
    long:
      'Residential aged care in Australia is delivered by all three sectors. Not-for-profits and government-run homes have historically tended to receive higher Star Ratings on average than for-profits, though there is wide variation within every sector.',
  },
  'pressure-injuries': {
    term: 'Pressure injuries',
    short: 'Bedsores. Lower is better.',
    long:
      'Pressure injuries (stages 1–4) per 100 residents over the reporting quarter. Repeated high readings can indicate inadequate repositioning, mobility support, or wound management.',
  },
  'restrictive-practices': {
    term: 'Restrictive practices',
    short: 'Use of physical restraint. Lower is better.',
    long:
      'Percentage of residents subject to physical restraint (excluding chemical restraint) in the reporting quarter. Restrictive practices are tightly regulated and should be a last resort.',
  },
  'weight-loss': {
    term: 'Unplanned weight loss',
    short: 'Significant unplanned weight loss. Lower is better.',
    long:
      'Percentage of residents with significant or consecutive unplanned weight loss in the quarter. Often a flag for inadequate food, nutrition support, or unmanaged illness.',
  },
  'falls': {
    term: 'Falls',
    short: 'Resident falls during the quarter. Lower is better.',
    long:
      'Falls per 100 residents. Falls are extremely common in aged care but rates vary widely; very high rates can indicate environmental hazards, staffing levels, or mobility-support gaps.',
  },
  'falls-major': {
    term: 'Major injury from a fall',
    short: 'Falls that resulted in a major injury. Lower is better.',
    long:
      'Falls that resulted in a serious injury (e.g. fracture, head injury) per 100 residents. Major injuries are rare but consequential.',
  },
  'polypharmacy': {
    term: 'Polypharmacy',
    short: 'Residents on 9+ medicines. Lower is generally better.',
    long:
      'Percentage of residents prescribed 9 or more regular medicines. Polypharmacy increases the risk of adverse drug events, falls, and hospitalisations.',
  },
  'antipsychotic': {
    term: 'Antipsychotic use',
    short: 'Residents prescribed antipsychotic medicines. Lower is generally better.',
    long:
      'Percentage of residents who received an antipsychotic medicine in the reporting period. Antipsychotic use should be reserved for specific clinical indications.',
  },
  'planning-region': {
    term: 'Aged Care Planning Region',
    short: 'Administrative regions used to plan aged care supply.',
    long:
      'Australia is divided into ~73 Aged Care Planning Regions used for planning the distribution of aged care places. They roughly track health districts.',
  },
};
