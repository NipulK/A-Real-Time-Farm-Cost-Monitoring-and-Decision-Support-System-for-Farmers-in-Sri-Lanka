## Browser verification completed — 18 October 2026

The deferred browser pass is now complete in isolated QA storage. Final result: **28 automated tests, typecheck/build and 41 HTTP integration groups passed; fresh final browser console has no errors/warnings.**

Sequential browser checks:
1. Logged in as an independent farmer with no cultivations/harvest; created a Carrot cultivation through the form. Overview automatically displayed Carrot history using a usable original alias.
2. Confirmed unit cost absent in overview, cultivation detail and decision-support actuals before harvest, including after entering LKR 1,000 cash cost.
3. Recorded 12 kg harvest: 10 kg saleable + 2 kg loss. All three views showed provisional LKR 100/kg, based on saleable weight.
4. Added LKR 500 noncash cost: provisional cost became LKR 150/kg. Added 5 kg saleable harvest: it became LKR 100/kg (1,500/15).
5. Closed the cultivation: label changed to Final cost per kg. Reopened it: label returned to Cost per kg so far.
6. Opened Historical prices with the Carrot cultivation selected. Verified default usable alias, market-specific Carrots alias for Thabuththegama, market filtering, flagged-only Carrot explanation and original source rows.
7. Selected Red Cabbage: its single usable point was visible at centered x=440 with a range bar and no trend line. Screenshot saved.
8. Created a Grapes cultivation, switched the cultivation selector and confirmed automatic Grapes selection plus explicit no-history message.
9. Found and fixed one navigation issue: after exploring another product, Grapes disappeared from the options because it has no imports. Options now retain the cultivation's product. Browser retest switching Gram → Grapes passed; added a regression test.
10. Swept all 127 available product selections (126 imported names plus the no-history Grapes crop), one by one through the browser selector with All markets. 120 produced finite chart points. The remaining seven (Carrot, Gherkin, Grapes, Mint Leaves, and the three abbreviated Pepper variants) showed explicit missing/excluded-data explanations. No invalid chart coordinates were found.
11. Verified Cabbage showed two separate market series/lines and source labels. Beans market filtering correctly showed no Thabuththegama records and returned its Dambulla chart when switched back.
12. Voided the second harvest: cost returned to LKR 150/kg. Voided the last saleable harvest: unit cost disappeared. Recorded an all-loss harvest (2 total, 0 saleable, 2 lost): it stayed hidden. A new 10 kg saleable harvest restored LKR 150/kg.
13. Checked Sinhala unit-cost/history labels and controls. Corrected two remaining untranslated display labels (harvest quantity and unverified price status), rebuilt and retested them.
14. Checked the 390×844 layout, mobile navigation and single-point chart. Document width stayed 390 with no page overflow; chart container width was 328. Restored normal viewport.
15. Checked the shared feature as organization owner and assigned supervisor: both saw their assigned Watermelon history/unit cost. Organization farmer remained in the own-expense portal without historical-price navigation.
16. Opened a fresh final-build tab, selected Carrot and loaded its history in Sinhala: console had zero errors/warnings. Saved evidence, closed temporary tabs and cleaned owned QA server/storage. Real application records were untouched.

Evidence: qa-crop-browser.json, qa-crop-unit-cost-and-history.png, qa-crop-single-point.png, qa-crop-mobile.png and qa-http-results.json. Physical-device and other-browser-engine tests were not performed. Existing price-source uncertainty remains explicitly labelled; no missing prices were fabricated.

---

# Crop prices and harvest-based unit cost — 18 October 2026

## Implemented behavior

- Actual production cost per kg is hidden from overview metrics, cultivation detail and decision-support actuals until positive **saleable** harvest weight exists. Total harvest lost/damaged does not supply a saleable denominator. Voiding the only harvest removes the unit cost again.
- Display label is **Cost per kg so far** while relevant cultivations remain open; **Final cost per kg** after closure with saleable weight. Existing accounting formulas are unchanged. Forecast scenario break-even remains explicitly separate from actual cost per kg.
- Previous-price panel is available on the selected cultivation and overview (also inferred for a single available cultivation). It uses that crop, offers separate original product variants and market filters, and retains original observations in an expandable table.
- Historical prices now has cultivation selection too. Selecting a cultivation chooses a matching imported product variant with usable observations. Aliases such as Carrot/Carrots and imported Potato variants are matched through source canonical metadata without merging their prices. Sweet Potato and Wild Baby Potato are excluded from the ordinary Potato match despite provisional import categorisation.
- Default market is All markets, avoiding a blank caused solely by the old fixed Dambulla filter. Each market/original-label series is plotted separately with a legend; lines do not connect different markets or variants. Users can still explore other products and select one market.
- Single observations are visible centered points; flat price ranges have padded axes. One usable observation/date is explicitly not presented as a trend.
- Empty history and excluded-only history have different explanations. Missing, partial, reversed and uncertain-market records remain excluded from charts but are available as original evidence. The original-observations table automatically shows excluded records when none can be charted.
- New copy is available in English and Sinhala, following the existing independent-farmer-only language rules. No records, market provenance or source prices were rewritten and no predictions were added.

## Verification completed

27 automated tests passed using `node --import tsx --test tests/*.test.ts` (same test files as npm test; avoids the sandbox restriction on the tsx CLI's local IPC socket). Typecheck and production build passed.

New tests cover preharvest/positive harvest/voided harvest/all-loss calculations, actual rendered overview hiding/showing cost labels, closure labels, English/Sinhala output, original data preservation, alias selection, missing/flagged history explanations, one-date/flat/zero-price geometry and separate market/variant series. Geometry was checked for every one of the 136 imported product/market selections: 126 contain usable chart data, 10 contain none, and 2 contain exactly one usable observation. Those 10 require explanations/source review rather than fabricated prices. Grapes still has no imported history.

A React SVG title warning found by rendered-component tests was fixed by supplying a single text string. Final tests complete without those warnings.

## Original implementation-stage status (superseded by completed browser pass above)

At the earlier implementation stage, browser testing was deferred until the user asked. No browser UI, mobile interaction, dynamic cultivation/product/market selection or visual chart QA was performed for this change. No new HTTP integration run was performed; prior 41-group results belong to the previous language update. Use isolated storage when doing the requested later browser pass. The real installation's records were not modified.

Suggested later browser sequence: new farmer/cultivation before harvest → crop history selection and variant/market filters → missing Grapes/flagged Carrot data → single-point chart → first harvest and actual unit cost → another expense/harvest → closure/reopening labels → void harvest where dependencies allow → English/Sinhala and narrow screen regression. Include organization owner and supervisor scope to confirm the shared UI respects existing permissions.
