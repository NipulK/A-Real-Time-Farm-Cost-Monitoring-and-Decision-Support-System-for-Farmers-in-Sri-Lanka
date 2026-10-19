import test from "node:test";
import assert from "node:assert/strict";
import { translate } from "../lib/translation";
test("English copy and unknown record-like text remain unchanged", () => {
  assert.equal(translate("Expenses & receipts", "en"), "Expenses & receipts");
  assert.equal(translate("My North Land — QA", "si"), "My North Land — QA");
  assert.equal(translate("LKR 1,250", "si"), "LKR 1,250");
});
test("Sinhala validation preserves constraint values and field identity", () => {
  assert.equal(translate("amount: Use at most two decimal places", "si"), "මුදල: දශම ස්ථාන දෙකක් දක්වා භාවිත කරන්න");
  assert.equal(translate("name: Too small: expected string to have >=1 characters", "si"), "නම: අවම අක්ෂර 1ක් ඇතුළත් කරන්න.");
  assert.equal(translate("Total must equal saleable kg plus loss kg", "si"), "මුළු ප්‍රමාණය විකිණිය හැකි හා හානි වූ කිලෝ එකතුවට සමාන විය යුතුය");
});
