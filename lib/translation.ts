import { sinhala } from "./sinhala";
export type Language = "en" | "si";
const fields: Record<string,string> = {
  name:"නම",mobile:"ජංගම අංකය",email:"විද්‍යුත් තැපෑල",password:"මුරපදය",district:"දිස්ත්‍රික්කය",village:"ගම",location:"පිහිටීම",area:"ප්‍රමාණය",unit:"ඒකකය",land:"ඉඩම",account:"ගිණුම",description:"විස්තරය",amount:"මුදල",category:"වර්ගය",basis:"වියදම් පදනම",quantity:"ප්‍රමාණය",grade:"ශ්‍රේණිය",total:"මුළු ප්‍රමාණය",saleable:"විකිණිය හැකි ප්‍රමාණය",loss:"හානිය",planted:"වගා කළ දිනය",harvest_date:"අස්වැන්න දිනය",acres:"අක්කර",budget:"අයවැය",forecast_kg:"අපේක්ෂිත අස්වැන්න",kg:"කිලෝ",price:"මිල",buyer:"ගැනුම්කරු",investor:"ආයෝජකයා",date:"දිනය",notes:"සටහන්",reference:"යොමු අංකය",variety:"ප්‍රභේදය",field_id:"වගා බිම",crop_id:"බෝගය",harvest_id:"අස්වැන්න",sale_id:"විකිණීම",method:"ගෙවීම් ක්‍රමය",language:"භාෂාව"
};
function message(text: string): string {
  if (sinhala[text]) return sinhala[text];
  const small = text.match(/^Too small: expected (?:number to be (>|>=)|string to have >=)(\d+)(?: characters)?$/);
  if (small) return small[1] ? `${small[2]}${small[1] === ">" ? " ට වඩා වැඩි" : " හෝ වැඩි"} අගයක් ඇතුළත් කරන්න.` : `අවම අක්ෂර ${small[2]}ක් ඇතුළත් කරන්න.`;
  const big = text.match(/^Too big: expected (?:number to be <=|string to have <=)(\d+)( characters)?$/);
  if (big) return big[2] ? `උපරිම අක්ෂර ${big[1]}ක් භාවිත කරන්න.` : `අගය ${big[1]} හෝ ඊට අඩු විය යුතුය.`;
  if (text === "Invalid email address") return "වලංගු විද්‍යුත් තැපෑලක් ඇතුළත් කරන්න.";
  if (text.startsWith("Invalid input: expected number")) return "වලංගු අංකයක් ඇතුළත් කරන්න.";
  return text;
}
/** Translate interface copy and known validation messages, never stored record values. */
export function translate(text: string, language: Language): string {
  if (language !== "si") return text;
  if (sinhala[text]) return sinhala[text];
  return text.split("; ").map(part => {
    const validation = part.match(/^([a-z_ ]+): (.+)$/);
    if (!validation) return message(part);
    const path = validation[1].split(" ");
    if (!path.every(p => fields[p])) return part;
    return path.map(p=>fields[p]).join(" · ") + ": " + message(validation[2]);
  }).join("; ");
}
