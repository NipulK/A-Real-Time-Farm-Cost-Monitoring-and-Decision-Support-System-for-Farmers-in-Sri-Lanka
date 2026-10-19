# Registration, approval and land records

Implemented 18 October 2026. This is the local application workflow; email/SMS delivery and Supabase are not connected.

## Self-employed farmer
Select **Self-employed farmer registration** on the sign-in page. Enter name, mobile, district, village/area, password and optional email. Enter the first land's name, district, village, location description, positive area/unit and sketch. Registration signs the farmer in immediately; no administrator approval is required. Registered email or mobile number can be used with the password. Sri Lankan `077…` and `+9477…` formats normalize to one identifier. International numbers can use `+country code` format. Numbers are registered identifiers, not SMS-verified identities.

Independent farmers manage their own farming records and expenses. Additional plots are registered under **Land records → Add land**. Each gets its own unique land ID and private sketch. Existing legacy farmers retain email sign-in; missing phone numbers are never invented by migration.

## Organization, company, grower or investor
Select **Organization / grower / investor registration**. Enter the responsible person's name, mobile, login email, location and password, plus business name/type, registration number if applicable, business address/district/contact/email and the person's position. Companies and organizations must upload a registration document. Individual growers/investors can apply without a company registration number and remain subject to manual administrator review. A first land and sketch are required for all applicants.

The application starts **Pending**. Before approval the owner can see its status and feedback, update/resubmit the application, add supporting documents and maintain land records. Member creation, cultivation operations, operational uploads and financial exports remain blocked on the server.

The system administrator opens **Organization & people**, examines the details, verification document and the organization's lands/sketches under **Land records**, and records an approval, rejection or request for more information with a review note. Decisions are audited. Approved owners gain their organization workspace. A later non-approved status blocks operations for the owner and members immediately.

## Organization farmers and supervisors
Member management appears only in the approved organization owner’s workspace, not on the administrator’s application review screen or during registration/pending approval. After approval, the owner uses **Organization & people → Register member**. Required information: name, mobile, district, village/area, category and initial password. Email and internal farmer/employee reference are optional. The system supplies the farmer or supervisor ID and organization link; these cannot be chosen to impersonate another organization. Initial credentials must be shared securely by the owner; no invitation messages are sent.

Assign farmers to their cultivations in **Organization & people**. Assign supervisors in each cultivation's **Assigned supervisors** panel. The supervisor must belong to the same approved organization.

Every new organization expense requires an active farmer registered under that organization and assigned to the selected cultivation. An assigned supervisor records it; administrators retain support access. Owners monitor organization expenses rather than entering or correcting them. Corrections use auditable void-and-replace records, preserving the farmer attribution and original history.

Organization farmers get a separate **My expenses** portal. They can view their own recorded expenses, totals, corrections and receipts, download their own expense ledger, and change their password. They cannot write expenses, access other farmers' costs, see organization totals/budgets/sales/lands, inspect audit exports, register members or approve applications. These restrictions are enforced on APIs, file downloads and exports as well as the UI.

The owner sees all its organization's records, combined financial totals, and per-farmer expense totals in the member list. Another organization sees none of those private records. Deactivation revokes member sessions; removing a farmer's cultivation assignment prevents new attribution while preserving that farmer's access to historical expenses.

## Multiple lands and sketches
Each independent farmer or organization can hold multiple separate land records. Required fields are name, district, village/area, address/location description, area, unit and sketch. Units: acres, hectares and perches; stored acre conversion is explicit (160 perches = 1 acre). Each registered land creates an associated farm/main field for existing cultivation workflows. Total linked field area cannot exceed the land's area, and cultivated area is bounded by field area.

Sketches may be photos of hand-drawn outlines, PNG/JPEG images or PDF scans, up to 5 MB per file. Image sketches preview on land cards; PDF sketches can be downloaded. Uploads are stored privately and checked by content type. Owners can view their own files and administrators can view files for review. Supervisors and organization farmers cannot fetch land documents by guessing URLs. Replacement sketches remain retained; the latest image is previewed. A sketch is not a professional survey or proof of legal title.

## Existing records and migration
The migration adds organization/profile/land/document/attribution tables without replacing existing user IDs, password hashes, farms, cultivations or ledger entries. A pre-change database backup was saved in this chat's private work directory. Legacy grower accounts are put into **Needs information**, not silently approved; they must complete an application and land details. Historical organization expenses without a farmer attribution are not guessed or allocated to an employee. Owners/administrators retain those original records, while organization farmers see only explicitly attributed expenses.

Each member currently belongs to one organization. Existing accounts are not automatically converted between independent and organization-member categories.

## Independent farmer language preference
Only independent farmers can choose English or Sinhala. The selector is available during independent self-registration and in their signed-in header. Registration stores the first choice, and later changes save to the account and survive login, reload and server restart. Existing independent accounts start in English. Organization registration, owners, supervisors, organization farmers and administrators remain in English and cannot write this preference through the API. Application labels and known validation messages translate; saved record text, original source labels, IDs and CSV schemas remain unchanged.

## Self-employed farmer profile editing
The independent account category is now labelled **Self-employed farmer** in the interface. Only this category can use **My profile & settings → Edit profile** to change its own name, mobile, optional email, district and village. Duplicate contacts are rejected. Updated contacts become the sign-in identifiers; password changes remain separate. Farmer ID, permissions and land locations stay fixed by this form. Organization owners, supervisors, organization farmers and administrators cannot use this editor or endpoint.
