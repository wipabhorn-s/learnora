/**
 * ธนาคารในไทยที่ Opn รองรับสำหรับบัญชีผู้รับเงิน (recipient bank_account[brand])
 * ที่มา: https://docs.omise.co/supported-banks
 * รหัสและชื่อต้องตรงกับ api/src/payout/banks.ts เสมอ แก้ที่หนึ่งต้องแก้อีกที่ด้วย
 * thaiName ใช้ช่วยค้นหาเป็นภาษาไทย (เช่นพิมพ์ "กสิกร") ธนาคารต่างชาติไม่มี
 */
export const THAI_BANKS = [
  {
    code: "baac",
    name: "Bank for Agriculture and Agricultural Cooperatives",
    thaiName: "ธ.ก.ส. ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
  },
  {
    code: "bay",
    name: "Bank of Ayudhya (Krungsri)",
    thaiName: "กรุงศรีอยุธยา",
  },
  { code: "bbl", name: "Bangkok Bank", thaiName: "กรุงเทพ" },
  { code: "bnp", name: "BNP Paribas" },
  { code: "boa", name: "Bank of America" },
  { code: "cacib", name: "Crédit Agricole" },
  { code: "cimb", name: "CIMB Thai Bank", thaiName: "ซีไอเอ็มบี ไทย" },
  { code: "citi", name: "Citibank" },
  { code: "db", name: "Deutsche Bank" },
  { code: "ghb", name: "Government Housing Bank", thaiName: "อาคารสงเคราะห์" },
  { code: "gsb", name: "Government Savings Bank", thaiName: "ออมสิน" },
  { code: "hsbc", name: "Hongkong and Shanghai Banking Corporation" },
  {
    code: "ibank",
    name: "Islamic Bank of Thailand",
    thaiName: "อิสลามแห่งประเทศไทย",
  },
  {
    code: "icbc",
    name: "Industrial and Commercial Bank of China (Thai)",
    thaiName: "ไอซีบีซี (ไทย)",
  },
  { code: "jpm", name: "J.P. Morgan" },
  { code: "kbank", name: "Kasikornbank", thaiName: "กสิกรไทย" },
  { code: "kk", name: "Kiatnakin Bank", thaiName: "เกียรตินาคินภัทร" },
  { code: "ktb", name: "Krungthai Bank", thaiName: "กรุงไทย" },
  {
    code: "lhb",
    name: "Land and Houses Bank",
    thaiName: "แลนด์ แอนด์ เฮ้าส์",
  },
  { code: "mb", name: "Mizuho Bank" },
  { code: "mega", name: "Mega International Commercial Bank" },
  { code: "mufg", name: "Bank of Tokyo-Mitsubishi UFJ" },
  { code: "rbs", name: "Royal Bank of Scotland" },
  {
    code: "sc",
    name: "Standard Chartered (Thai)",
    thaiName: "สแตนดาร์ดชาร์เตอร์ด (ไทย)",
  },
  { code: "scb", name: "Siam Commercial Bank", thaiName: "ไทยพาณิชย์" },
  { code: "smbc", name: "Sumitomo Mitsui Banking Corporation" },
  { code: "tcrb", name: "Thai Credit Retail Bank", thaiName: "ไทยเครดิต" },
  { code: "tisco", name: "Tisco Bank", thaiName: "ทิสโก้" },
  { code: "ttb", name: "TMBThanachart Bank", thaiName: "ทหารไทยธนชาต" },
  { code: "uob", name: "United Overseas Bank (Thai)", thaiName: "ยูโอบี" },
] as const satisfies readonly {
  code: string;
  name: string;
  thaiName?: string;
}[];

export type Bank = (typeof THAI_BANKS)[number];
export type BankCode = Bank["code"];

export const BANK_CODES = THAI_BANKS.map((bank) => bank.code) as [
  BankCode,
  ...BankCode[],
];

export const findBank = (code: string | null | undefined) =>
  THAI_BANKS.find((bank) => bank.code === code) ?? null;
