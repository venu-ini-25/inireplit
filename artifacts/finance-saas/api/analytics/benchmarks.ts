import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json([{"metric":"ARR Growth Rate","company":48.2,"p25":22,"median":35,"p75":52,"unit":"%"},{"metric":"Gross Margin","company":81.4,"p25":68,"median":75,"p75":82,"unit":"%"},{"metric":"CAC Payback (months)","company":14,"p25":18,"median":22,"p75":30,"unit":"mo"},{"metric":"Net Revenue Retention","company":118,"p25":100,"median":108,"p75":120,"unit":"%"},{"metric":"ARR per Employee ($K)","company":287,"p25":180,"median":220,"p75":280,"unit":"K"},{"metric":"Magic Number","company":0.9,"p25":0.5,"median":0.7,"p75":1.0,"unit":"x"},{"metric":"Rule of 40","company":46,"p25":20,"median":32,"p75":48,"unit":""}]);
}
